import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find role by id. Role is assignable in org if:
   * - organizationId = orgId (org-scoped), or
   * - organizationId = null (system role).
   */
  async findAssignableInOrg(
    roleId: string,
    organizationId: string,
  ) {
    return this.prisma.role.findFirst({
      where: {
        id: roleId,
        OR: [
          { organizationId },
          { organizationId: null },
        ],
      },
    });
  }

  /**
   * List roles assignable in the organization (org-scoped + system roles).
   */
  async listAssignableInOrg(organizationId: string) {
    return this.prisma.role.findMany({
      where: {
        OR: [
          { organizationId },
          { organizationId: null },
        ],
      },
      include: {
        permissions: { include: { permission: { select: { key: true } } } },
      },
      orderBy: { name: 'asc' },
    });
  }
}
