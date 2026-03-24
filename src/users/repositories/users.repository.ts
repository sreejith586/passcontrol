import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

export interface ListUsersFilters {
  page: number;
  limit: number;
  currentUserId?: string;
}

export interface ListUsersResult {
  items: Array<{
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    hasPassword: boolean;
    /** True when user can be re-invited (not onboarded and deactivated). */
    canReinvite: boolean;
    /** Present when Re-invite would show but is blocked (needs deactivation first). */
    reinviteBlockedReason: 'must_deactivate' | null;
    /** True when this row is the current user (cannot deactivate self). */
    isCurrentUser: boolean;
    /** True when this user is the last active SuperAdmin (cannot deactivate). */
    isLastSuperAdmin: boolean;
    roles: Array<{ id: string; name: string; key: string; scope: string }>;
  }>;
  total: number;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List users who belong to the organization (have at least one role assignment).
   * Returns id, name, email, and roles from UserRoleAssignment.
   */
  async listByOrganization(
    organizationId: string,
    filters: ListUsersFilters,
  ): Promise<ListUsersResult> {
    const skip = (filters.page - 1) * filters.limit;
    const currentUserId = filters.currentUserId;

    const superAdminRole = await this.prisma.role.findFirst({
      where: { key: 'super_admin' },
    });
    let lastSuperAdminUserId: string | null = null;
    if (superAdminRole) {
      const superAdminAssignments = await this.prisma.userRoleAssignment.findMany({
        where: {
          organizationId,
          roleId: superAdminRole.id,
          user: { isActive: true, deletedAt: null },
        },
        select: { userId: true },
      });
      const superAdminUserIds = [...new Set(superAdminAssignments.map((a) => a.userId))];
      if (superAdminUserIds.length === 1) {
        lastSuperAdminUserId = superAdminUserIds[0];
      }
    }

    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: { organizationId },
      select: {
        userId: true,
        user: { select: { id: true, name: true, email: true, isActive: true, passwordHash: true } },
        role: { select: { id: true, name: true, key: true, scope: true } },
      },
    });

    const userMap = new Map<
      string,
      {
        id: string;
        name: string;
        email: string;
        isActive: boolean;
        hasPassword: boolean;
        canReinvite: boolean;
        reinviteBlockedReason: 'must_deactivate' | null;
        isCurrentUser: boolean;
        isLastSuperAdmin: boolean;
        roles: Map<
          string,
          { id: string; name: string; key: string; scope: string }
        >;
      }
    >();
    for (const a of assignments) {
      const existing = userMap.get(a.userId);
      const role = {
        id: a.role.id,
        name: a.role.name,
        key: a.role.key,
        scope: a.role.scope,
      };
      if (existing) {
        existing.roles.set(a.role.id, role);
      } else {
        const hasPassword = a.user.passwordHash != null;
        const isActive = a.user.isActive;
        const canReinvite = !hasPassword && !isActive;
        const reinviteBlockedReason: 'must_deactivate' | null =
          !hasPassword && isActive ? 'must_deactivate' : null;
        userMap.set(a.userId, {
          id: a.user.id,
          name: a.user.name,
          email: a.user.email,
          isActive,
          hasPassword,
          canReinvite,
          reinviteBlockedReason,
          isCurrentUser: a.user.id === currentUserId,
          isLastSuperAdmin: a.user.id === lastSuperAdminUserId,
          roles: new Map([[a.role.id, role]]),
        });
      }
    }

    const uniqueUsers = Array.from(userMap.values()).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      isActive: u.isActive,
      hasPassword: u.hasPassword,
      canReinvite: u.canReinvite,
      reinviteBlockedReason: u.reinviteBlockedReason,
      isCurrentUser: u.isCurrentUser,
      isLastSuperAdmin: u.isLastSuperAdmin,
      roles: Array.from(u.roles.values()),
    }));
    uniqueUsers.sort((a, b) => a.name.localeCompare(b.name));
    const total = uniqueUsers.length;
    const items = uniqueUsers.slice(skip, skip + filters.limit);

    return { items, total };
  }

  /**
   * Check if user belongs to organization (has at least one role assignment).
   */
  async belongsToOrganization(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    const assignment = await this.prisma.userRoleAssignment.findFirst({
      where: { userId, organizationId },
    });
    return !!assignment;
  }

  /**
   * Distinct org members: users with at least one role assignment in the organization.
   * Soft-deleted users are excluded; isActive is not used (pending setup and deactivated members still hold a seat).
   */
  async countDistinctMembersInOrganization(
    organizationId: string,
  ): Promise<number> {
    const rows = await this.prisma.userRoleAssignment.findMany({
      where: {
        organizationId,
        user: { deletedAt: null },
      },
      distinct: ['userId'],
      select: { userId: true },
    });
    return rows.length;
  }

  async findUserByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email: email.toLowerCase().trim(), deletedAt: null },
    });
  }

  async createUser(data: { email: string; name: string }) {
    return this.prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        name: data.name,
        passwordHash: null,
        isActive: true,
      },
    });
  }

  async hasRoleInOrg(
    userId: string,
    organizationId: string,
    roleId: string,
  ): Promise<boolean> {
    const a = await this.prisma.userRoleAssignment.findFirst({
      where: { userId, organizationId, roleId },
    });
    return !!a;
  }

  async assignRole(
    userId: string,
    organizationId: string,
    roleId: string,
  ) {
    return this.prisma.userRoleAssignment.create({
      data: { userId, organizationId, roleId },
    });
  }

  /**
   * Get user with roles in org.
   */
  async getUserWithRoles(userId: string, organizationId: string) {
    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: { userId, organizationId },
      include: {
        user: true,
        role: { select: { id: true, name: true, key: true, scope: true } },
      },
    });
    if (assignments.length === 0) return null;
    const user = assignments[0].user;
    const roles = assignments.map((a) => a.role);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      roles,
    };
  }

  async findById(userId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
  }

  async updateIsActive(userId: string, isActive: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });
  }

  /**
   * Count active users with Super Admin role in organization, optionally excluding one user.
   */
  async countActiveSuperAdminsInOrg(
    organizationId: string,
    excludeUserId?: string,
  ): Promise<number> {
    const superAdminRole = await this.prisma.role.findFirst({
      where: { key: 'super_admin' },
    });
    if (!superAdminRole) return 0;

    return this.prisma.userRoleAssignment.count({
      where: {
        organizationId,
        roleId: superAdminRole.id,
        user: { isActive: true, deletedAt: null },
        ...(excludeUserId && { userId: { not: excludeUserId } }),
      },
    });
  }

  async removeRoleAssignment(
    userId: string,
    organizationId: string,
    roleId: string,
  ) {
    await this.prisma.userRoleAssignment.deleteMany({
      where: { userId, organizationId, roleId },
    });
  }

  /**
   * Get profile for user in org (id, name, email, phoneNumber, jobTitle, roles).
   * Returns null if user is not in organization.
   */
  async getProfileForUserInOrg(
    userId: string,
    organizationId: string,
  ): Promise<{
    id: string;
    name: string;
    email: string;
    phoneNumber: string | null;
    jobTitle: string | null;
    roles: Array<{ id: string; name: string; key: string; scope: string }>;
  } | null> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, name: true, email: true, phoneNumber: true, jobTitle: true },
    });
    if (!user) return null;
    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: { userId, organizationId },
      include: { role: { select: { id: true, name: true, key: true, scope: true } } },
    });
    if (assignments.length === 0) return null;
    return {
      ...user,
      roles: assignments.map((a) => a.role),
    };
  }

  /**
   * Update user profile fields.
   */
  async updateProfile(
    userId: string,
    data: { name?: string; phoneNumber?: string | null; jobTitle?: string | null },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  /**
   * Get user with roles in org. Returns user with empty roles if no assignments.
   */
  async getUserWithRolesOrMinimal(
    userId: string,
    organizationId: string,
  ): Promise<{
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    roles: Array<{ id: string; name: string; key: string; scope: string }>;
  } | null> {
    const user = await this.findById(userId);
    if (!user) return null;
    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: { userId, organizationId },
      include: { role: { select: { id: true, name: true, key: true, scope: true } } },
    });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      roles: assignments.map((a) => a.role),
    };
  }
}
