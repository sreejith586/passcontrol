import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { SettingsService } from '../services/settings.service';
import { UpdateEmailSettingsDto } from '../dto/update-email-settings.dto';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { RbacGuard } from '../../access/rbac/rbac.guard';
import { RequirePermissions } from '../../access/rbac/permissions.decorator';
import { ApiResponse } from '../../infra/responses/api-response';
import { CurrentTenantContext, TenantContext } from '../../access/decorators/current-tenant.decorator';

@Controller({ path: 'settings', version: '1' })
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiTags('Settings')
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get('email')
  @RequirePermissions('alert.workflow-policy.view')
  @ApiOperation({ summary: 'Get organization email relay settings' })
  async getEmail(@CurrentTenantContext() ctx: TenantContext) {
    const settings = await this.service.getEmailSettings(ctx);
    return ApiResponse.ok(settings);
  }

  @Put('email')
  @RequirePermissions('alert.workflow-policy.manage')
  @ApiOperation({ summary: 'Update organization email relay settings' })
  @ApiBody({ type: UpdateEmailSettingsDto })
  async updateEmail(
    @CurrentTenantContext() ctx: TenantContext,
    @Body() dto: UpdateEmailSettingsDto,
  ) {
    const settings = await this.service.updateEmailSettings(ctx, dto);
    return ApiResponse.ok(settings);
  }

  @Post('email/test')
  @RequirePermissions('alert.workflow-policy.view')
  @ApiOperation({ summary: 'Send a test email to the current user' })
  async sendTestEmail(@CurrentTenantContext() ctx: TenantContext) {
    const result = await this.service.sendTestEmail(ctx);
    return ApiResponse.ok(result);
  }
}
