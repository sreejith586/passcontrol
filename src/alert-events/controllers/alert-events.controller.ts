import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AlertEventsService } from '../services/alert-events.service';
import { ListAlertEventsQueryDto } from '../dto/list-alert-events.dto';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { RbacGuard } from '../../access/rbac/rbac.guard';
import { RequirePermissions } from '../../access/rbac/permissions.decorator';
import { ApiResponse } from '../../infra/responses/api-response';
import { CurrentTenantContext } from '../../access/decorators/current-tenant.decorator';

@Controller({ path: 'alert-events', version: '1' })
@UseGuards(AuthGuard, RbacGuard)
export class AlertEventsController {
  constructor(private readonly service: AlertEventsService) {}

  @Get()
  @RequirePermissions('alert.view')
  async list(
    @CurrentTenantContext() ctx: { organizationId: string },
    @Query() query: ListAlertEventsQueryDto,
  ) {
    const list = await this.service.list(ctx, query);
    return ApiResponse.ok(list);
  }

  @Get(':id')
  @RequirePermissions('alert.view')
  async get(
    @CurrentTenantContext() ctx: { organizationId: string },
    @Param('id') id: string,
  ) {
    const alert = await this.service.getById(ctx, id);
    return ApiResponse.ok(alert);
  }

  @Post(':id/acknowledge')
  @RequirePermissions('alert.acknowledge')
  async acknowledge(
    @CurrentTenantContext() ctx: { organizationId: string; userId?: string },
    @Param('id') id: string,
  ) {
    const updated = await this.service.acknowledge(ctx, id);
    return ApiResponse.ok(updated);
  }

  @Post(':id/resolve')
  @RequirePermissions('alert.resolve')
  async resolve(
    @CurrentTenantContext() ctx: { organizationId: string; userId?: string },
    @Param('id') id: string,
  ) {
    const updated = await this.service.resolve(ctx, id);
    return ApiResponse.ok(updated);
  }
}
