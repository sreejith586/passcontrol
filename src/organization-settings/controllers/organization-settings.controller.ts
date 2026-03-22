import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiQuery } from '@nestjs/swagger';
import { OrganizationSettingsService } from '../services/organization-settings.service';
import { UpdateAlertWorkflowDto } from '../dto/update-alert-workflow.dto';
import { UpdateRegionalSettingsDto } from '../dto/update-regional-settings.dto';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { RbacGuard } from '../../access/rbac/rbac.guard';
import { RequirePermissions } from '../../access/rbac/permissions.decorator';
import { ApiResponse } from '../../infra/responses/api-response';
import {
  CurrentTenantContext,
  TenantContext,
} from '../../access/decorators/current-tenant.decorator';

@Controller({ path: 'organization-settings', version: '1' })
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiTags('Organization Settings')
@ApiBearerAuth()
export class OrganizationSettingsController {
  constructor(private readonly service: OrganizationSettingsService) {}

  @Get('alert-workflow')
  @RequirePermissions('alert.workflow-policy.view')
  @ApiOperation({ summary: 'Get alert workflow policy settings for the organization' })
  async getAlertWorkflow(@CurrentTenantContext() ctx: TenantContext) {
    const settings = await this.service.getAlertWorkflow(ctx);
    return ApiResponse.ok(settings);
  }

  @Patch('alert-workflow')
  @RequirePermissions('alert.workflow-policy.manage')
  @ApiOperation({ summary: 'Update alert workflow policy settings' })
  @ApiBody({ type: UpdateAlertWorkflowDto })
  async updateAlertWorkflow(
    @CurrentTenantContext() ctx: TenantContext,
    @Body() dto: UpdateAlertWorkflowDto,
  ) {
    const settings = await this.service.updateAlertWorkflow(ctx, dto);
    return ApiResponse.ok(settings);
  }

  @Get('regional')
  @RequirePermissions('alert.workflow-policy.view')
  @ApiOperation({ summary: 'Get regional settings for the organization' })
  async getRegional(@CurrentTenantContext() ctx: TenantContext) {
    const settings = await this.service.getRegional(ctx);
    return ApiResponse.ok(settings);
  }

  @Patch('regional')
  @RequirePermissions('alert.workflow-policy.manage')
  @ApiOperation({ summary: 'Update regional settings' })
  @ApiBody({ type: UpdateRegionalSettingsDto })
  async updateRegional(
    @CurrentTenantContext() ctx: TenantContext,
    @Body() dto: UpdateRegionalSettingsDto,
  ) {
    const settings = await this.service.updateRegional(ctx, dto);
    return ApiResponse.ok(settings);
  }

  @Get('regional-resolved')
  @RequirePermissions('checklist.run.view')
  @ApiOperation({ summary: 'Get resolved regional settings for org (and optional location)' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Optional location for override resolution' })
  async getRegionalResolved(
    @CurrentTenantContext() ctx: TenantContext,
    @Query('locationId') locationId?: string,
  ) {
    const resolved = await this.service.getRegionalResolved(ctx, locationId || undefined);
    return ApiResponse.ok(resolved);
  }
}
