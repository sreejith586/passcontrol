import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { OrganizationSettingsService } from '../services/organization-settings.service';
import { UpdateAlertWorkflowDto } from '../dto/update-alert-workflow.dto';
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
}
