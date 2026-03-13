import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { REQUIRE_PERMISSIONS } from './permissions.decorator';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_PERMISSIONS,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) {
      throw new ForbiddenException('Missing required permissions metadata');
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.userId || !user?.organizationId) {
      throw new ForbiddenException('Unauthorized');
    }

    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: { userId: user.userId, organizationId: user.organizationId },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });

    const permissions = new Set<string>();
    assignments.forEach((a) =>
      a.role.permissions.forEach((rp) => permissions.add(rp.permission.key)),
    );

    const missing = required.filter((p) => !permissions.has(p));
    if (missing.length) {
      throw new ForbiddenException(`Missing permissions: ${missing.join(', ')}`);
    }

    return true;
  }
}
