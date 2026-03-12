import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntitlementService } from '../entitlements/entitlement.service';

export const USAGE_LIMIT = 'usage_limit';

export interface UsageLimitConfig {
  metric: string;
  limit: number;
  getCurrent: (orgId: string) => Promise<number>;
}

@Injectable()
export class UsageLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlement: EntitlementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.get<UsageLimitConfig>(USAGE_LIMIT, context.getHandler());
    if (!config) return true;

    const request = context.switchToHttp().getRequest();
    const orgId = request.user?.organizationId;
    if (!orgId) throw new ForbiddenException('Unauthorized');

    const current = await config.getCurrent(orgId);
    const allowed = await this.entitlement.checkUsageLimit(
      orgId,
      config.metric,
      current,
      config.limit,
    );
    if (!allowed) {
      throw new ForbiddenException(`Usage limit exceeded for ${config.metric}`);
    }

    return true;
  }
}
