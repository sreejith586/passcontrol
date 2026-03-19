import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../repositories/users.repository';
import { RolesService } from '../../roles/services/roles.service';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';
import { InviteUserDto } from '../dto/invite-user.dto';
import { AddRoleDto } from '../dto/add-role.dto';
import { UpdateUserStatusDto } from '../dto/update-user-status.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    private readonly rolesService: RolesService,
  ) {}

  async list(ctx: { organizationId: string }, query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const { items, total } = await this.repo.listByOrganization(
      ctx.organizationId,
      { page, limit },
    );
    return { items, total, page, limit };
  }

  async invite(
    ctx: { organizationId: string },
    dto: InviteUserDto,
  ): Promise<{
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    roles: Array<{ id: string; name: string; key: string }>;
  }> {
    const isAssignable = await this.rolesService.isRoleAssignableInOrg(
      dto.roleId,
      ctx.organizationId,
    );
    if (!isAssignable) {
      throw new BadRequestException('Invalid role for this organization');
    }

    const email = dto.email.toLowerCase().trim();
    let user = await this.repo.findUserByEmail(email);

    if (!user) {
      const name = email.split('@')[0] || 'Invited User';
      user = await this.repo.createUser({ email, name });
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
    return result;
  }

  async belongsToOrganization(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    return this.repo.belongsToOrganization(userId, organizationId);
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

    const isAssignable = await this.rolesService.isRoleAssignableInOrg(
      dto.roleId,
      ctx.organizationId,
    );
    if (!isAssignable) {
      throw new BadRequestException('Invalid role for this organization');
    }

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
    return result;
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

    await this.repo.removeRoleAssignment(userId, ctx.organizationId, roleId);

    const result = await this.repo.getUserWithRolesOrMinimal(
      userId,
      ctx.organizationId,
    );
    if (!result) {
      throw new BadRequestException('Failed to load user after remove role');
    }
    return result;
  }

  async updateStatus(
    ctx: { organizationId: string },
    userId: string,
    dto: UpdateUserStatusDto,
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

    await this.repo.updateIsActive(userId, dto.isActive);

    const result = await this.repo.getUserWithRolesOrMinimal(
      userId,
      ctx.organizationId,
    );
    if (!result) {
      throw new BadRequestException('Failed to load user after status update');
    }
    return result;
  }
}
