import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { UsersRepository } from '../repositories/users.repository';
import { RolesService } from '../../roles/services/roles.service';
import { filterRolesForTenantApi } from '../../roles/role-visibility';
import { PasswordSetupTokenRepository } from '../../auth/repositories/password-setup-token.repository';
import { MailService } from '../../notifications/mail/mail.service';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';
import { InviteUserDto } from '../dto/invite-user.dto';
import { AddRoleDto } from '../dto/add-role.dto';
import { UpdateUserStatusDto } from '../dto/update-user-status.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly repo: UsersRepository,
    private readonly rolesService: RolesService,
    private readonly passwordSetupTokenRepo: PasswordSetupTokenRepository,
    private readonly mail: MailService,
    private readonly prisma: PrismaService,
  ) {}

  async list(ctx: { organizationId: string; userId?: string }, query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const { items, total } = await this.repo.listByOrganization(
      ctx.organizationId,
      { page, limit, currentUserId: ctx.userId },
    );
    return {
      items: items.map((row) => ({
        ...row,
        roles: filterRolesForTenantApi(row.roles),
      })),
      total,
      page,
      limit,
    };
  }

  async invite(
    ctx: { organizationId: string; userId?: string },
    dto: InviteUserDto,
  ): Promise<{
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    roles: Array<{ id: string; name: string; key: string }>;
    setupToken?: string;
  }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { name: true, isSelfOnboarded: true, maxUsers: true },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    await this.assertSelfOnboardedInviterMaySendInvites(ctx, org.isSelfOnboarded);

    await this.rolesService.assertTenantMayAssignRole(
      dto.roleId,
      ctx.organizationId,
    );

    const email = dto.email.toLowerCase().trim();
    let user = await this.repo.findUserByEmail(email);

    if (!user) {
      await this.assertOrgHasCapacityForNewMember(
        ctx.organizationId,
        org.maxUsers,
      );
      const name = email.split('@')[0] || 'Invited User';
      user = await this.repo.createUser({ email, name });
    } else {
      const inOrg = await this.repo.belongsToOrganization(
        user.id,
        ctx.organizationId,
      );
      if (!inOrg) {
        await this.assertOrgHasCapacityForNewMember(
          ctx.organizationId,
          org.maxUsers,
        );
      }
    }

    const alreadyAssigned = await this.repo.hasRoleInOrg(
      user.id,
      ctx.organizationId,
      dto.roleId,
    );
    if (!alreadyAssigned) {
      await this.repo.assignRole(user.id, ctx.organizationId, dto.roleId);
    }

    const result = await this.repo.getUserWithRoles(user.id, ctx.organizationId);
    if (!result) {
      throw new BadRequestException('Failed to load user after invite');
    }

    const tenantResult = {
      ...result,
      roles: filterRolesForTenantApi(result.roles),
    };

    if (user.passwordHash === null) {
      await this.passwordSetupTokenRepo.invalidateUnusedByUserId(user.id);
      const setupToken = await this.passwordSetupTokenRepo.create(user.id);

      const orgName = org.name ?? 'PassControl';
      const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3000';
      const setupUrl = `${baseUrl.replace(/\/$/, '')}/set-password?token=${encodeURIComponent(setupToken)}`;

      const subject = `[PassControl] You've been invited to join ${orgName}`;
      const body = [
        `You've been invited to join ${orgName} on PassControl.`,
        '',
        'Click the link below to set your password and get started:',
        setupUrl,
        '',
        'This link expires in 7 days.',
        '',
        '— PassControl',
      ].join('\n');

      try {
        await this.mail.send(user.email, subject, body, undefined, {
          organizationId: ctx.organizationId,
        });
      } catch {
        // Log but do not fail the invite; setup token is still returned
      }

      return { ...tenantResult, setupToken };
    }

    return tenantResult;
  }

  async belongsToOrganization(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    return this.repo.belongsToOrganization(userId, organizationId);
  }

  async getMe(ctx: { organizationId: string; userId?: string }) {
    if (!ctx.userId) {
      throw new BadRequestException('User context is required');
    }
    const profile = await this.repo.getProfileForUserInOrg(
      ctx.userId,
      ctx.organizationId,
    );
    if (!profile) {
      throw new NotFoundException('User not found in this organization');
    }
    return {
      ...profile,
      roles: filterRolesForTenantApi(profile.roles),
    };
  }

  async updateProfile(
    ctx: { organizationId: string; userId?: string },
    dto: UpdateProfileDto,
  ) {
    if (!ctx.userId) {
      throw new BadRequestException('User context is required');
    }
    const belongs = await this.repo.belongsToOrganization(
      ctx.userId,
      ctx.organizationId,
    );
    if (!belongs) {
      throw new NotFoundException('User not found in this organization');
    }
    const data: { name?: string; phoneNumber?: string | null; jobTitle?: string | null } = {};
    if (dto.name !== undefined) {
      data.name = (dto.name ?? '').trim() || undefined;
    }
    if (dto.phoneNumber !== undefined) {
      data.phoneNumber = (dto.phoneNumber ?? '').trim() || null;
    }
    if (dto.jobTitle !== undefined) {
      data.jobTitle = (dto.jobTitle ?? '').trim() || null;
    }
    if (Object.keys(data).length === 0) {
      return this.getMe(ctx);
    }
    await this.repo.updateProfile(ctx.userId!, data);
    return this.getMe(ctx);
  }

  async addRole(
    ctx: { organizationId: string },
    userId: string,
    dto: AddRoleDto,
  ): Promise<{
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    roles: Array<{ id: string; name: string; key: string }>;
  }> {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.rolesService.assertTenantMayAssignRole(
      dto.roleId,
      ctx.organizationId,
    );

    const alreadyAssigned = await this.repo.hasRoleInOrg(
      userId,
      ctx.organizationId,
      dto.roleId,
    );
    if (!alreadyAssigned) {
      await this.repo.assignRole(userId, ctx.organizationId, dto.roleId);
    }

    const result = await this.repo.getUserWithRolesOrMinimal(
      userId,
      ctx.organizationId,
    );
    if (!result) {
      throw new BadRequestException('Failed to load user after add role');
    }
    return {
      ...result,
      roles: filterRolesForTenantApi(result.roles),
    };
  }

  async removeRole(
    ctx: { organizationId: string },
    userId: string,
    roleId: string,
  ): Promise<{
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    roles: Array<{ id: string; name: string; key: string }>;
  }> {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const belongs = await this.repo.belongsToOrganization(
      userId,
      ctx.organizationId,
    );
    if (!belongs) {
      throw new NotFoundException('User not found in this organization');
    }

    await this.rolesService.assertTenantMayRemoveRoleAssignment(roleId);

    await this.repo.removeRoleAssignment(userId, ctx.organizationId, roleId);

    const result = await this.repo.getUserWithRolesOrMinimal(
      userId,
      ctx.organizationId,
    );
    if (!result) {
      throw new BadRequestException('Failed to load user after remove role');
    }
    return {
      ...result,
      roles: filterRolesForTenantApi(result.roles),
    };
  }

  async updateStatus(
    ctx: { organizationId: string; userId?: string },
    targetUserId: string,
    dto: UpdateUserStatusDto,
  ): Promise<{
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    roles: Array<{ id: string; name: string; key: string }>;
  }> {
    const user = await this.repo.findById(targetUserId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const belongs = await this.repo.belongsToOrganization(
      targetUserId,
      ctx.organizationId,
    );
    if (!belongs) {
      throw new NotFoundException('User not found in this organization');
    }

    if (dto.isActive === false) {
      if (ctx.userId && targetUserId === ctx.userId) {
        throw new BadRequestException(
          'You cannot deactivate your own account.',
        );
      }

      const userWithRoles = await this.repo.getUserWithRolesOrMinimal(
        targetUserId,
        ctx.organizationId,
      );
      const hasSuperAdmin = userWithRoles?.roles.some((r) => r.key === 'super_admin');
      if (hasSuperAdmin) {
        const otherActiveSuperAdmins = await this.repo.countActiveSuperAdminsInOrg(
          ctx.organizationId,
          targetUserId,
        );
        if (otherActiveSuperAdmins === 0) {
          throw new BadRequestException(
            'Cannot deactivate the last SuperAdmin. Assign another SuperAdmin first.',
          );
        }
      }
    }

    await this.repo.updateIsActive(targetUserId, dto.isActive);

    const result = await this.repo.getUserWithRolesOrMinimal(
      targetUserId,
      ctx.organizationId,
    );
    if (!result) {
      throw new BadRequestException('Failed to load user after status update');
    }
    return {
      ...result,
      roles: filterRolesForTenantApi(result.roles),
    };
  }

  /**
   * Re-send invitation for a user who has not completed onboarding.
   * Eligibility (same as list canReinvite): passwordHash === null AND isActive === false.
   */
  async reinvite(
    ctx: { organizationId: string; userId?: string },
    userId: string,
  ): Promise<{ message: string }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { name: true, isSelfOnboarded: true },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    await this.assertSelfOnboardedInviterMaySendInvites(ctx, org.isSelfOnboarded);

    const user = await this.repo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const belongs = await this.repo.belongsToOrganization(
      userId,
      ctx.organizationId,
    );
    if (!belongs) {
      throw new NotFoundException('User not found in this organization');
    }

    if (user.passwordHash !== null) {
      throw new BadRequestException(
        'User is already active and cannot be re-invited.',
      );
    }

    if (user.isActive !== false) {
      throw new BadRequestException(
        'User must be deactivated before re-inviting.',
      );
    }

    await this.passwordSetupTokenRepo.invalidateUnusedByUserId(userId);
    const setupToken = await this.passwordSetupTokenRepo.create(userId);

    const orgName = org.name ?? 'PassControl';
    const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3000';
    const setupUrl = `${baseUrl.replace(/\/$/, '')}/set-password?token=${encodeURIComponent(setupToken)}`;

    const subject = `[PassControl] You've been invited to join ${orgName}`;
    const body = [
      `You've been invited to join ${orgName} on PassControl.`,
      '',
      'Click the link below to set your password and get started:',
      setupUrl,
      '',
      'This link expires in 7 days.',
      '',
      '— PassControl',
    ].join('\n');

    try {
      await this.mail.send(user.email, subject, body, undefined, {
        organizationId: ctx.organizationId,
      });
    } catch (err) {
      this.logger.warn('Re-invite email send failed', err);
    }

    return { message: 'Invitation re-sent' };
  }

  private async assertSelfOnboardedInviterMaySendInvites(
    ctx: { organizationId: string; userId?: string },
    isSelfOnboarded: boolean,
  ): Promise<void> {
    if (!isSelfOnboarded) return;
    if (!ctx.userId) {
      throw new BadRequestException('User context is required');
    }
    if (await this.userHasSuperAdminRoleInOrg(ctx.userId, ctx.organizationId)) {
      return;
    }
    const actor = await this.prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { emailVerifiedAt: true },
    });
    if (!actor?.emailVerifiedAt) {
      throw new ForbiddenException(
        'Please verify your email before inviting team members.',
      );
    }
  }

  private async userHasSuperAdminRoleInOrg(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    const row = await this.prisma.userRoleAssignment.findFirst({
      where: {
        userId,
        organizationId,
        role: { key: 'super_admin' },
      },
    });
    return !!row;
  }

  private async assertOrgHasCapacityForNewMember(
    organizationId: string,
    maxUsers: number | null,
  ): Promise<void> {
    if (maxUsers == null) return;
    const count =
      await this.repo.countDistinctMembersInOrganization(organizationId);
    if (count >= maxUsers) {
      throw new ConflictException('User limit reached for your plan.');
    }
  }
}
