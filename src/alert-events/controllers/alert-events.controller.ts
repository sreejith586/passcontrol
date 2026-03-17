import { Controller, Get, Param, Post, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { AlertEventsService } from '../services/alert-events.service';
import { ListAlertEventsQueryDto } from '../dto/list-alert-events.dto';
import { AlertTrendsQueryDto } from '../dto/alert-trends-query.dto';
import { AlertEscalationsQueryDto } from '../dto/alert-escalations-query.dto';
import { AlertEscalationsPrioritizedQueryDto } from '../dto/alert-escalations-prioritized-query.dto';
import { AlertEscalationsSummaryQueryDto } from '../dto/alert-escalations-summary-query.dto';
import { AlertEscalationsTrendsQueryDto } from '../dto/alert-escalations-trends-query.dto';
import { AlertSlaComplianceQueryDto } from '../dto/alert-sla-compliance-query.dto';
import { BulkAcknowledgeAlertsDto } from '../dto/bulk-acknowledge-alerts.dto';
import { BulkResolveAlertsDto } from '../dto/bulk-resolve-alerts.dto';
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

  @Get('sla-compliance')
  @RequirePermissions('alert.view')
  @ApiOperation({
    summary: 'SLA compliance metrics',
    description:
      'Returns KPI-style SLA compliance metrics for alerts created in a period: acknowledge and resolve within-SLA/breached counts and compliance rates.',
  })
  @ApiQuery({ name: 'brandId', required: false, description: 'Filter by brand UUID' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter by location UUID' })
  @ApiQuery({ name: 'zoneId', required: false, description: 'Filter by zone UUID' })
  @ApiQuery({ name: 'severity', required: false, description: 'Filter by severity' })
  @ApiQuery({ name: 'status', required: false, enum: ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'] })
  @ApiQuery({ name: 'from', required: false, example: '2025-03-01', description: 'Filter from date (inclusive, applied to createdAt)' })
  @ApiQuery({ name: 'to', required: false, example: '2025-03-15', description: 'Filter to date (inclusive, applied to createdAt)' })
  async getSlaCompliance(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: AlertSlaComplianceQueryDto,
  ) {
    const compliance = await this.service.getSlaCompliance(ctx, query);
    return ApiResponse.ok(compliance);
  }

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

  @Get('escalations/summary')
  @RequirePermissions('alert.view')
  @ApiOperation({
    summary: 'Escalation summary for dashboards',
    description:
      'Returns compact summary of active alerts: total, breach counts, and severity breakdown.',
  })
  @ApiQuery({ name: 'brandId', required: false, description: 'Filter by brand UUID' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter by location UUID' })
  @ApiQuery({ name: 'zoneId', required: false, description: 'Filter by zone UUID' })
  @ApiQuery({ name: 'severity', required: false, description: 'Filter by severity' })
  @ApiQuery({ name: 'status', required: false, enum: ['OPEN', 'ACKNOWLEDGED'] })
  async getEscalationsSummary(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: AlertEscalationsSummaryQueryDto,
  ) {
    const summary = await this.service.getEscalationsSummary(ctx, query);
    return ApiResponse.ok(summary);
  }

  @Get('escalations/summary-by-location')
  @RequirePermissions('alert.view')
  @ApiOperation({
    summary: 'Escalation summary by location',
    description:
      'Returns location-level summary of active alerts for dashboards. Ordered by escalation pressure.',
  })
  @ApiQuery({ name: 'brandId', required: false, description: 'Filter by brand UUID' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter by location UUID' })
  @ApiQuery({ name: 'zoneId', required: false, description: 'Filter by zone UUID' })
  @ApiQuery({ name: 'severity', required: false, description: 'Filter by severity' })
  @ApiQuery({ name: 'status', required: false, enum: ['OPEN', 'ACKNOWLEDGED'] })
  async getEscalationsSummaryByLocation(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: AlertEscalationsSummaryQueryDto,
  ) {
    const summary = await this.service.getEscalationsSummaryByLocation(ctx, query);
    return ApiResponse.ok(summary);
  }

  @Get('escalations/trends')
  @RequirePermissions('alert.view')
  @ApiOperation({
    summary: 'Escalation trends over time',
    description:
      'Returns time-series escalation counts (active alerts, acknowledge breached, resolve breached) bucketed by alert createdAt. For trend charts.',
  })
  @ApiQuery({ name: 'brandId', required: false, description: 'Filter by brand UUID' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter by location UUID' })
  @ApiQuery({ name: 'zoneId', required: false, description: 'Filter by zone UUID' })
  @ApiQuery({ name: 'severity', required: false, description: 'Filter by severity' })
  @ApiQuery({ name: 'status', required: false, enum: ['OPEN', 'ACKNOWLEDGED'] })
  @ApiQuery({ name: 'from', required: false, example: '2025-03-01', description: 'Filter from date (inclusive, applied to createdAt)' })
  @ApiQuery({ name: 'to', required: false, example: '2025-03-15', description: 'Filter to date (inclusive, applied to createdAt)' })
  @ApiQuery({ name: 'interval', required: false, enum: ['day', 'week', 'month'], description: 'Time bucket interval. Default: day.' })
  async getEscalationsTrends(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: AlertEscalationsTrendsQueryDto,
  ) {
    const trends = await this.service.getEscalationsTrends(ctx, query);
    return ApiResponse.ok(trends);
  }

  @Get('escalations/prioritized')
  @RequirePermissions('alert.view')
  @ApiOperation({
    summary: 'Prioritized escalations (top N by urgency)',
    description:
      'Returns most urgent active alerts first: resolve breached, then acknowledge breached, then non-breached. For dashboard widgets and quick triage.',
  })
  @ApiQuery({ name: 'brandId', required: false, description: 'Filter by brand UUID' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter by location UUID' })
  @ApiQuery({ name: 'zoneId', required: false, description: 'Filter by zone UUID' })
  @ApiQuery({ name: 'severity', required: false, description: 'Filter by severity' })
  @ApiQuery({ name: 'status', required: false, enum: ['OPEN', 'ACKNOWLEDGED'] })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max items to return (default 25, max 100)' })
  async getPrioritizedEscalations(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: AlertEscalationsPrioritizedQueryDto,
  ) {
    const result = await this.service.getPrioritizedEscalations(ctx, query);
    return ApiResponse.ok(result);
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

  @Post('bulk-acknowledge')
  @RequirePermissions('alert.acknowledge')
  @ApiOperation({
    summary: 'Bulk acknowledge alerts',
    description:
      'Acknowledge multiple OPEN alerts in one request. Partial success: one failure does not fail the batch. Max 100 IDs.',
  })
  @ApiBody({ type: BulkAcknowledgeAlertsDto })
  async bulkAcknowledge(
    @CurrentTenantContext() ctx: TenantContext,
    @Body() dto: BulkAcknowledgeAlertsDto,
  ) {
    const result = await this.service.bulkAcknowledge(ctx, dto);
    return ApiResponse.ok(result);
  }

  @Post('bulk-resolve')
  @RequirePermissions('alert.resolve')
  @ApiOperation({
    summary: 'Bulk resolve alerts',
    description:
      'Resolve multiple OPEN or ACKNOWLEDGED alerts in one request. Optional resolution note applied to all. Partial success. Max 100 IDs.',
  })
  @ApiBody({ type: BulkResolveAlertsDto })
  async bulkResolve(
    @CurrentTenantContext() ctx: TenantContext,
    @Body() dto: BulkResolveAlertsDto,
  ) {
    const result = await this.service.bulkResolve(ctx, dto);
    return ApiResponse.ok(result);
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
