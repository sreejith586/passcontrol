import { Module } from '@nestjs/common';
import { InfraModule } from '../infra/infra.module';
import { RbacGuard } from './rbac/rbac.guard';
import { RbacService } from './rbac/rbac.service';
import { EntitlementService } from './entitlements/entitlement.service';
import { ModuleGuard } from './guards/module.guard';
import { EntitlementGuard } from './guards/entitlement.guard';
import { UsageLimitGuard } from './guards/usage-limit.guard';

@Module({
  imports: [InfraModule],
  providers: [
    RbacService,
    RbacGuard,
    EntitlementService,
    ModuleGuard,
    EntitlementGuard,
    UsageLimitGuard,
  ],
  exports: [
    RbacService,
    RbacGuard,
    EntitlementService,
    ModuleGuard,
    EntitlementGuard,
    UsageLimitGuard,
  ],
})
export class AccessModule {}
