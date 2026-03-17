import { Controller, Get, Param, Post, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { AlertEventsService } from '../services/alert-events.service';
import { ListAlertEventsQueryDto } from '../dto/list-alert-events.dto';
import { AlertTrendsQueryDto } from '../dto/alert-trends-query.dto';
import { AlertEscalationsQueryDto } from '../dto/alert-escalations-query.dto';
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

  @Get('trends')
  @RequirePermissions('alert.view')
  @ApiOperation({
    summary: 'Alert lifecycle trends over time',
    description:
      'Returns created, acknowledged, and resolved counts grouped by time interval. from/to apply to each lifecycle timestamp independently.',
  })
  @ApiQuery({ name: 'brandId', required: false, description: 'Filter by brand UUID' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter by location UUID' })
  @ApiQuery({ name: 'zoneId', required: false, description: 'Filter by zone UUID' })
  @ApiQuery({ name: 'severity', required: false, description: 'Filter by alert severity' })
  @ApiQuery({
    name: 'from',
    required: false,
    example: '2025-03-01',
    description: 'Filter from date (inclusive). Applied to each lifecycle timestamp independently.',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    example: '2025-03-15',
    description: 'Filter to date (inclusive). Applied to each lifecycle timestamp independently.',
  })
  @ApiQuery({
    name: 'interval',
    required: false,
    enum: ['day', 'week', 'month'],
    description: 'Time bucket interval. Default: day.',
  })
  async getTrends(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: AlertTrendsQueryDto,
  ) {
    const trends = await this.service.getTrends(ctx, query);
    return ApiResponse.ok(trends);
  }

  @Get('escalations')
  @RequirePermissions('alert.view')
  @ApiOperation({
    summary: 'Alert escalations with SLA breach flags',
    description:
      'Returns active (OPEN/ACKNOWLEDGED) alerts with computed SLA deadlines and breach flags. Sorted by urgency.',
  })
  @ApiQuery({ name: 'brandId', required: false, description: 'Filter by brand UUID' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter by location UUID' })
  @ApiQuery({ name: 'zoneId', required: false, description: 'Filter by zone UUID' })
  @ApiQuery({ name: 'severity', required: false, description: 'Filter by severity' })
  @ApiQuery({ name: 'status', required: false, enum: ['OPEN', 'ACKNOWLEDGED'] })
  @ApiQuery({ name: 'onlyBreached', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getEscalations(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: AlertEscalationsQueryDto,
  ) {
    const escalations = await this.service.getEscalations(ctx, query);
    return ApiResponse.ok(escalations);
  }

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
