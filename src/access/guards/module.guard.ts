import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntitlementService } from '../entitlements/entitlement.service';

export const REQUIRE_MODULE = 'require_module';

@Injectable()
export class ModuleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlement: EntitlementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const moduleKey = this.reflector.get<string>(REQUIRE_MODULE, context.getHandler());
    if (!moduleKey) return true;

    const request = context.switchToHttp().getRequest();
    const orgId = request.user?.organizationId;
    if (!orgId) throw new ForbiddenException('Unauthorized');

    const enabled = await this.entitlement.isModuleEnabled(orgId, moduleKey);
    if (!enabled) throw new ForbiddenException(`Module ${moduleKey} is not enabled`);

    return true;
  }
}
