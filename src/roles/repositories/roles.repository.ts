import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { ROLE_SCOPE_PLATFORM } from '../role-scope.constants';

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(roleId: string) {
    return this.prisma.role.findFirst({
      where: { id: roleId },
    });
  }

  /**
   * Find role by id if it may be assigned in an org by tenant admins.
   * Excludes platform-scoped roles (e.g. super_admin).
   */
  async findAssignableInOrg(
    roleId: string,
    organizationId: string,
  ) {
    return this.prisma.role.findFirst({
      where: {
        id: roleId,
        scope: { not: ROLE_SCOPE_PLATFORM },
        OR: [{ organizationId }, { organizationId: null }],
      },
    });
  }

  /**
   * List roles that tenant admins may assign (org-scoped + non-platform system roles).
   */
  async listAssignableInOrg(organizationId: string) {
    return this.prisma.role.findMany({
      where: {
        scope: { not: ROLE_SCOPE_PLATFORM },
        OR: [{ organizationId }, { organizationId: null }],
      },
      include: {
        permissions: { include: { permission: { select: { key: true } } } },
      },
      orderBy: { name: 'asc' },
    });
  }
}
