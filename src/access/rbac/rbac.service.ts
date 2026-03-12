import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserPermissions(userId: string, organizationId: string): Promise<string[]> {
    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: { userId, organizationId },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });

    const permissions = new Set<string>();
    assignments.forEach((a) =>
      a.role.permissions.forEach((rp) => permissions.add(rp.permission.key)),
    );
    return Array.from(permissions);
  }

  async hasPermission(
    userId: string,
    organizationId: string,
    permission: string,
  ): Promise<boolean> {
    const perms = await this.getUserPermissions(userId, organizationId);
    return perms.includes(permission);
  }
}
