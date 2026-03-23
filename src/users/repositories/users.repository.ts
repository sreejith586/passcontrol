import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

export interface ListUsersFilters {
  page: number;
  limit: number;
}

export interface ListUsersResult {
  items: Array<{
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    hasPassword: boolean;
    roles: Array<{ id: string; name: string; key: string }>;
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

    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: { organizationId },
      select: {
        userId: true,
        user: { select: { id: true, name: true, email: true, isActive: true, passwordHash: true } },
        role: { select: { id: true, name: true, key: true } },
      },
    });

    const userMap = new Map<
      string,
      { id: string; name: string; email: string; isActive: boolean; hasPassword: boolean; roles: Map<string, { id: string; name: string; key: string }> }
    >();
    for (const a of assignments) {
      const existing = userMap.get(a.userId);
      const role = { id: a.role.id, name: a.role.name, key: a.role.key };
      if (existing) {
        existing.roles.set(a.role.id, role);
      } else {
        userMap.set(a.userId, {
          id: a.user.id,
          name: a.user.name,
          email: a.user.email,
          isActive: a.user.isActive,
          hasPassword: a.user.passwordHash != null,
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
      include: { user: true, role: { select: { id: true, name: true, key: true } } },
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
    roles: Array<{ id: string; name: string; key: string }>;
  } | null> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, name: true, email: true, phoneNumber: true, jobTitle: true },
    });
    if (!user) return null;
    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: { userId, organizationId },
      include: { role: { select: { id: true, name: true, key: true } } },
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
    roles: Array<{ id: string; name: string; key: string }>;
  } | null> {
    const user = await this.findById(userId);
    if (!user) return null;
    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: { userId, organizationId },
      include: { role: { select: { id: true, name: true, key: true } } },
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
