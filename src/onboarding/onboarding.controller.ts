import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RbacGuard } from '../access/rbac/rbac.guard';
import { RequirePermissions } from '../access/rbac/permissions.decorator';
import { ApiResponse } from '../infra/responses/api-response';
import {
  CurrentTenantContext,
  TenantContext,
} from '../access/decorators/current-tenant.decorator';
import { OnboardingService } from './onboarding.service';

@Controller({ path: 'onboarding', version: '1' })
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiTags('Onboarding')
@ApiBearerAuth()
export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  @Post('quick-setup')
  @RequirePermissions('checklist.template.create')
  @ApiOperation({
    summary: 'Quick setup for first value',
    description:
      'Creates a starter template, schedule, and run. Returns runId for redirect.',
  })
  async quickSetup(@CurrentTenantContext() ctx: TenantContext) {
    const result = await this.service.quickSetup(ctx);
    return ApiResponse.ok(result);
  }
}
