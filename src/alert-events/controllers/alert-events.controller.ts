import { Controller, Get, Param, Post, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { AlertEventsService } from '../services/alert-events.service';
import { ListAlertEventsQueryDto } from '../dto/list-alert-events.dto';
import { ResolveAlertDto } from '../dto/resolve-alert.dto';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { RbacGuard } from '../../access/rbac/rbac.guard';
import { RequirePermissions } from '../../access/rbac/permissions.decorator';
import { ApiResponse } from '../../infra/responses/api-response';
import {
  CurrentTenantContext,
  TenantContext,
} from '../../access/decorators/current-tenant.decorator';

@Controller({ path: 'alert-events', version: '1' })
@UseGuards(JwtAuthGuard, RbacGuard)
export class AlertEventsController {
  constructor(private readonly service: AlertEventsService) {}

  @Get()
  @RequirePermissions('alert.view')
  @ApiOperation({ summary: 'List alert events (paginated)' })
  async list(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: ListAlertEventsQueryDto,
  ) {
    const list = await this.service.list(ctx, query);
    return ApiResponse.ok(list);
  }

  @Get(':id')
  @RequirePermissions('alert.view')
  @ApiOperation({ summary: 'Get alert event by ID' })
  @ApiParam({ name: 'id', description: 'Alert event UUID' })
  async get(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
  ) {
    const alert = await this.service.getById(ctx, id);
    return ApiResponse.ok(alert);
  }

  @Post(':id/acknowledge')
  @RequirePermissions('alert.acknowledge')
  @ApiOperation({ summary: 'Acknowledge an OPEN alert' })
  @ApiParam({ name: 'id', description: 'Alert event UUID' })
  async acknowledge(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
  ) {
    const updated = await this.service.acknowledge(ctx, id);
    return ApiResponse.ok(updated);
  }

  @Post(':id/resolve')
  @RequirePermissions('alert.resolve')
  @ApiOperation({ summary: 'Resolve an OPEN or ACKNOWLEDGED alert' })
  @ApiParam({ name: 'id', description: 'Alert event UUID' })
  @ApiBody({ type: ResolveAlertDto, required: false })
  async resolve(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto?: ResolveAlertDto,
  ) {
    const updated = await this.service.resolve(ctx, id, dto?.resolutionNote);
    return ApiResponse.ok(updated);
  }
}
