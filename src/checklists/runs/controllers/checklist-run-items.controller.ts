import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiResponse as ApiResponseDecorator,
} from '@nestjs/swagger';
import { ChecklistRunsService } from '../services/checklist-runs.service';
import { ChecklistRunItemsService } from '../services/checklist-run-items.service';
import { UpdateRunItemDto } from '../dto/update-run-item.dto';
import { LinkAttachmentToRunItemDto } from '../dto/link-attachment-to-run-item.dto';
import { CreateTemperatureReadingForRunItemDto } from '../dto/create-temperature-reading-for-run-item.dto';
import { ListFailedChecklistRunItemsQueryDto } from '../dto/list-failed-checklist-run-items.dto';
import { ListFailedChecklistRunItemsSummaryQueryDto } from '../dto/list-failed-checklist-run-items-summary.dto';
import { ResolveAlertDto } from '../../../alert-events/dto/resolve-alert.dto';
import { JwtAuthGuard } from '../../../auth/guards/auth.guard';
import { RbacGuard } from '../../../access/rbac/rbac.guard';
import { RequirePermissions } from '../../../access/rbac/permissions.decorator';
import { ApiResponse } from '../../../infra/responses/api-response';
import {
  CurrentTenantContext,
  TenantContext,
} from '../../../access/decorators/current-tenant.decorator';

@Controller({ path: 'checklist-run-items', version: '1' })
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiTags('Checklist Run Items')
@ApiBearerAuth()
export class ChecklistRunItemsController {
  constructor(
    private readonly service: ChecklistRunsService,
    private readonly runItemsService: ChecklistRunItemsService,
  ) {}

  @Get('summary-by-location')
  @RequirePermissions('checklist.run.view')
  @ApiOperation({
    summary: 'Failed run items summary by location',
    description:
      'Returns failed items and alert counts grouped by locationId. Sorted by critical count, open alerts, total. Helps identify which locations need attention.',
  })
  @ApiQuery({ name: 'brandId', required: false, description: 'Filter by brand UUID' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter by location UUID' })
  @ApiQuery({ name: 'zoneId', required: false, description: 'Filter by zone UUID' })
  @ApiQuery({ name: 'checklistTemplateId', required: false, description: 'Filter by checklist template UUID' })
  @ApiQuery({ name: 'severity', required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @ApiQuery({
    name: 'from',
    required: false,
    example: '2025-03-01',
    description: 'Filter from date (inclusive). Uses run dueAt when present, otherwise createdAt.',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    example: '2025-03-15',
    description: 'Filter to date (inclusive). Uses run dueAt when present, otherwise createdAt.',
  })
  async getSummaryByLocation(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: ListFailedChecklistRunItemsSummaryQueryDto,
  ) {
    const summary = await this.runItemsService.getSummaryByLocation(ctx, query);
    return ApiResponse.ok(summary);
  }

  @Get('summary')
  @RequirePermissions('checklist.run.view')
  @ApiOperation({
    summary: 'Failed run items dashboard summary',
    description:
      'Returns compact counts: failed items by severity, latest alert status per item, affected runs. Uses same date semantics as failed list.',
  })
  @ApiQuery({ name: 'brandId', required: false, description: 'Filter by brand UUID' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter by location UUID' })
  @ApiQuery({ name: 'zoneId', required: false, description: 'Filter by zone UUID' })
  @ApiQuery({ name: 'checklistTemplateId', required: false, description: 'Filter by checklist template UUID' })
  @ApiQuery({ name: 'severity', required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @ApiQuery({
    name: 'from',
    required: false,
    example: '2025-03-01',
    description: 'Filter from date (inclusive). Uses run dueAt when present, otherwise createdAt.',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    example: '2025-03-15',
    description: 'Filter to date (inclusive). Uses run dueAt when present, otherwise createdAt.',
  })
  async getSummary(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: ListFailedChecklistRunItemsSummaryQueryDto,
  ) {
    const summary = await this.runItemsService.getSummary(ctx, query);
    return ApiResponse.ok(summary);
  }

  @Get('failed')
  @RequirePermissions('checklist.run.view')
  @ApiOperation({
    summary: 'List failed run item snapshots (paginated)',
    description:
      'Returns one row per failed ChecklistRunItemSnapshot. Sorted by severity (CRITICAL first), then effective run date desc.',
  })
  @ApiQuery({ name: 'brandId', required: false, description: 'Filter by brand UUID' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter by location UUID' })
  @ApiQuery({ name: 'zoneId', required: false, description: 'Filter by zone UUID' })
  @ApiQuery({ name: 'checklistTemplateId', required: false, description: 'Filter by checklist template UUID' })
  @ApiQuery({ name: 'severity', required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @ApiQuery({
    name: 'from',
    required: false,
    example: '2025-03-01',
    description: 'Filter from date (inclusive). Uses run dueAt when present, otherwise createdAt.',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    example: '2025-03-15',
    description: 'Filter to date (inclusive). Uses run dueAt when present, otherwise createdAt.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 25 })
  async getFailed(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: ListFailedChecklistRunItemsQueryDto,
  ) {
    const list = await this.runItemsService.getFailedItems(ctx, query);
    return ApiResponse.ok(list);
  }

  @Get(':id')
  @RequirePermissions('checklist.run.view')
  @ApiOperation({
    summary: 'Get run item snapshot by ID with supervisor context',
    description:
      'Returns a single ChecklistRunItemSnapshot with attachments, temperature readings, and related alert event. Use for supervisor drilldown and investigation.',
  })
  @ApiParam({ name: 'id', description: 'Run item snapshot UUID (ChecklistRunItemSnapshot.id)' })
  @ApiResponseDecorator({ status: 200, description: 'Run item snapshot with full context' })
  async getById(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
  ) {
    const item = await this.runItemsService.getById(ctx, id);
    return ApiResponse.ok(item);
  }

  @Patch(':id')
  @RequirePermissions('checklist.run.update')
  @ApiOperation({ summary: 'Update run item response' })
  @ApiParam({ name: 'id', description: 'Run item snapshot UUID' })
  @ApiBody({ type: UpdateRunItemDto })
  async update(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateRunItemDto,
  ) {
    const item = await this.service.updateRunItem(ctx, id, dto);
    return ApiResponse.ok(item);
  }

  @Post(':id/attachments')
  @RequirePermissions('checklist.run.update')
  @ApiOperation({ summary: 'Link attachment as evidence to run item' })
  @ApiParam({ name: 'id', description: 'Run item snapshot UUID' })
  @ApiBody({ type: LinkAttachmentToRunItemDto })
  async linkAttachment(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: LinkAttachmentToRunItemDto,
  ) {
    const attachment = await this.service.linkAttachmentToRunItem(ctx, id, dto);
    return ApiResponse.ok(attachment);
  }

  @Post(':id/temperature-readings')
  @RequirePermissions('checklist.run.update')
  @ApiOperation({ summary: 'Create temperature reading for run item snapshot' })
  @ApiParam({ name: 'id', description: 'Run item snapshot UUID (ChecklistRunItemSnapshot.id)' })
  @ApiBody({ type: CreateTemperatureReadingForRunItemDto })
  async createTemperatureReading(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: CreateTemperatureReadingForRunItemDto,
  ) {
    const reading = await this.service.createTemperatureReadingForRunItem(ctx, id, dto);
    return ApiResponse.created(reading);
  }

  @Post(':id/acknowledge-alert')
  @RequirePermissions('alert.acknowledge')
  @ApiOperation({
    summary: 'Acknowledge alert for failed run item',
    description:
      'Convenience endpoint: finds the latest OPEN alert linked to this checklist run item and acknowledges it. Delegates to alert acknowledge flow.',
  })
  @ApiParam({ name: 'id', description: 'Run item snapshot UUID (ChecklistRunItemSnapshot.id)' })
  async acknowledgeAlert(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
  ) {
    const alert = await this.runItemsService.acknowledgeAlert(ctx, id);
    return ApiResponse.ok(alert);
  }

  @Post(':id/resolve-alert')
  @RequirePermissions('alert.resolve')
  @ApiOperation({
    summary: 'Resolve alert for failed run item',
    description:
      'Convenience endpoint: finds the latest OPEN or ACKNOWLEDGED alert linked to this checklist run item and resolves it. Delegates to alert resolve flow.',
  })
  @ApiParam({ name: 'id', description: 'Run item snapshot UUID (ChecklistRunItemSnapshot.id)' })
  @ApiBody({ type: ResolveAlertDto, required: false })
  async resolveAlert(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto?: ResolveAlertDto,
  ) {
    const alert = await this.runItemsService.resolveAlert(ctx, id, dto?.resolutionNote);
    return ApiResponse.ok(alert);
  }
}
