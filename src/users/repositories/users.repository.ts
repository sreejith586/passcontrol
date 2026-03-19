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
  }>;
  total: number;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List users who belong to the organization (have at least one role assignment).
   * Returns minimal fields: id, name, email.
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
        user: { select: { id: true, name: true, email: true } },
      },
      distinct: ['userId'],
    });

    const uniqueUsers = Array.from(
      new Map(assignments.map((a) => [a.userId, a.user])).values(),
    );
    uniqueUsers.sort((a, b) => a.name.localeCompare(b.name));
    const total = uniqueUsers.length;
    const items = uniqueUsers
      .slice(skip, skip + filters.limit)
      .map((u) => ({ id: u.id, name: u.name, email: u.email }));

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
}
