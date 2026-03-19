import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { REQUIRE_PERMISSIONS, REQUIRE_ANY_PERMISSION } from './permissions.decorator';

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
    const requiredAny = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_ANY_PERMISSION,
      [context.getHandler(), context.getClass()],
    );

    const hasRequired = required?.length > 0;
    const hasRequiredAny = requiredAny?.length > 0;
    if (!hasRequired && !hasRequiredAny) {
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

    if (hasRequired) {
      const missing = required.filter((p) => !permissions.has(p));
      if (missing.length) {
        throw new ForbiddenException(`Missing permissions: ${missing.join(', ')}`);
      }
    }
    if (hasRequiredAny) {
      const hasAny = requiredAny.some((p) => permissions.has(p));
      if (!hasAny) {
        throw new ForbiddenException(`Missing one of: ${requiredAny.join(', ')}`);
      }
    }

    return true;
  }
}
