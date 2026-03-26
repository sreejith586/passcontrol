import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { isSuperAdminEmail } from '../super-admin-emails';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      user?: { userId: string; organizationId: string; email?: string };
    }>();
    const jwtUser = req.user;
    if (!jwtUser?.userId) {
      throw new ForbiddenException('Super admin access required');
    }

    let email = jwtUser.email;
    if (email == null || email === '') {
      const row = await this.prisma.user.findUnique({
        where: { id: jwtUser.userId },
        select: { email: true },
      });
      email = row?.email ?? '';
    }

    if (!isSuperAdminEmail(email)) {
      throw new ForbiddenException('Super admin access required');
    }

    return true;
  }
}
