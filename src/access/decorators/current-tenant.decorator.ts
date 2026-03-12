import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface TenantContext {
  organizationId: string;
  userId?: string;
}

export const CurrentTenantContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.organizationId) {
      return { organizationId: '', userId: user?.userId };
    }
    return {
      organizationId: user.organizationId,
      userId: user.userId,
    };
  },
);
