import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntitlementService } from '../entitlements/entitlement.service';

export const REQUIRE_FEATURE = 'require_feature';

@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlement: EntitlementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.get<string>(REQUIRE_FEATURE, context.getHandler());
    if (!featureKey) return true;

    const request = context.switchToHttp().getRequest();
    const orgId = request.user?.organizationId;
    if (!orgId) throw new ForbiddenException('Unauthorized');

    const enabled = await this.entitlement.isFeatureEnabled(orgId, featureKey);
    if (!enabled) throw new ForbiddenException(`Feature ${featureKey} is not enabled`);

    return true;
  }
}
