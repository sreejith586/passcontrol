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
  ApiQuery,
} from '@nestjs/swagger';
import { ChecklistRunsService } from '../services/checklist-runs.service';
import { ListTodayRunsQueryDto } from '../dto/list-today-runs.dto';
import { ListOverdueRunsQueryDto } from '../dto/list-overdue-runs.dto';
import { ListFailedRunsQueryDto } from '../dto/list-failed-runs.dto';
import { ChecklistRunMetricsQueryDto } from '../dto/list-metrics.dto';
import { UpdateChecklistRunAssignmentDto } from '../dto/update-checklist-run-assignment.dto';
import { JwtAuthGuard } from '../../../auth/guards/auth.guard';
import { RbacGuard } from '../../../access/rbac/rbac.guard';
import { RequirePermissions } from '../../../access/rbac/permissions.decorator';
import { ApiResponse } from '../../../infra/responses/api-response';
import {
  CurrentTenantContext,
  TenantContext,
} from '../../../access/decorators/current-tenant.decorator';

@Controller({ path: 'checklist-runs', version: '1' })
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiTags('Checklist Runs')
@ApiBearerAuth()
export class ChecklistRunsController {
  constructor(private readonly service: ChecklistRunsService) {}

  @Get('metrics')
  @RequirePermissions('checklist.run.view')
  @ApiOperation({
    summary: 'Supervisor dashboard metrics (counts only)',
    description:
      'Returns aggregate counts. todayRuns uses timezone/date params; resolvedAlertsToday always uses UTC today.',
  })
  @ApiQuery({ name: 'brandId', required: false, description: 'Filter by brand UUID' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter by location UUID' })
  @ApiQuery({ name: 'zoneId', required: false, description: 'Filter by zone UUID' })
  @ApiQuery({ name: 'timezone', required: false, example: 'America/New_York', description: 'Timezone for todayRuns date range' })
  @ApiQuery({ name: 'date', required: false, example: '2025-03-14', description: 'Date for todayRuns (YYYY-MM-DD)' })
  async getMetrics(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: ChecklistRunMetricsQueryDto,
  ) {
    const metrics = await this.service.getMetrics(ctx, query);
    return ApiResponse.ok(metrics);
  }

  @Get('today')
  @RequirePermissions('checklist.run.view')
  @ApiOperation({ summary: 'List runs for today (paginated)' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'] })
  @ApiQuery({ name: 'assignedToMe', required: false, type: Boolean, description: 'Filter to runs assigned to current user' })
  @ApiQuery({ name: 'assignedToUserId', required: false, description: 'Filter by assigned user UUID' })
  @ApiQuery({ name: 'brandId', required: false, description: 'Filter by brand UUID' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter by location UUID' })
  @ApiQuery({ name: 'zoneId', required: false, description: 'Filter by zone UUID' })
  @ApiQuery({ name: 'timezone', required: false, example: 'America/New_York' })
  @ApiQuery({ name: 'date', required: false, example: '2025-03-14' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 25 })
  @ApiQuery({
    name: 'view',
    required: false,
    enum: ['full', 'summary'],
    description:
      'View mode: "full" (default) includes sectionSnapshots and itemSnapshots; "summary" returns run-level fields only for lighter payloads',
  })
  async getToday(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: ListTodayRunsQueryDto,
  ) {
    const list = await this.service.getTodayRuns(ctx, query);
    return ApiResponse.ok(list);
  }

  @Get('overdue')
  @RequirePermissions('checklist.run.view')
  @ApiOperation({ summary: 'List overdue runs (paginated)' })
  @ApiQuery({ name: 'assignedToMe', required: false, type: Boolean, description: 'Filter to runs assigned to current user' })
  @ApiQuery({ name: 'assignedToUserId', required: false, description: 'Filter by assigned user UUID' })
  @ApiQuery({ name: 'brandId', required: false, description: 'Filter by brand UUID' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter by location UUID' })
  @ApiQuery({ name: 'zoneId', required: false, description: 'Filter by zone UUID' })
  @ApiQuery({ name: 'checklistTemplateId', required: false, description: 'Filter by checklist template UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 25 })
  @ApiQuery({
    name: 'view',
    required: false,
    enum: ['full', 'summary'],
    description:
      'View mode: "full" (default) includes sectionSnapshots and itemSnapshots; "summary" returns run-level fields only for lighter payloads',
  })
  async getOverdue(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: ListOverdueRunsQueryDto,
  ) {
    const list = await this.service.getOverdueRuns(ctx, query);
    return ApiResponse.ok(list);
  }

  @Get('failed')
  @RequirePermissions('checklist.run.view')
  @ApiOperation({ summary: 'List runs with at least one failed item (paginated)' })
  @ApiQuery({ name: 'assignedToMe', required: false, type: Boolean, description: 'Filter to runs assigned to current user' })
  @ApiQuery({ name: 'assignedToUserId', required: false, description: 'Filter by assigned user UUID' })
  @ApiQuery({ name: 'brandId', required: false, description: 'Filter by brand UUID' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter by location UUID' })
  @ApiQuery({ name: 'zoneId', required: false, description: 'Filter by zone UUID' })
  @ApiQuery({ name: 'checklistTemplateId', required: false, description: 'Filter by checklist template UUID' })
  @ApiQuery({
    name: 'from',
    required: false,
    example: '2025-03-01',
    description: 'Filter runs from this date (inclusive). Uses run dueAt when present, otherwise createdAt.',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    example: '2025-03-15',
    description: 'Filter runs to this date (inclusive). Uses run dueAt when present, otherwise createdAt.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 25 })
  @ApiQuery({
    name: 'view',
    required: false,
    enum: ['full', 'summary'],
    description:
      'View mode: "full" (default) includes sectionSnapshots and itemSnapshots; "summary" returns run-level fields only for lighter payloads',
  })
  async getFailed(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: ListFailedRunsQueryDto,
  ) {
    const list = await this.service.getFailedRuns(ctx, query);
    return ApiResponse.ok(list);
  }

  @Get(':id')
  @RequirePermissions('checklist.run.view')
  @ApiOperation({ summary: 'Get run by ID with sections and items' })
  @ApiParam({ name: 'id', description: 'Run UUID' })
  async getById(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
  ) {
    const run = await this.service.getRunById(ctx, id);
    return ApiResponse.ok(run);
  }

  @Patch(':id/assignment')
  @RequirePermissions('checklist.run.update')
  @ApiOperation({ summary: 'Update run assignment (assign, reassign, or clear)' })
  @ApiParam({ name: 'id', description: 'Run UUID' })
  async updateAssignment(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateChecklistRunAssignmentDto,
  ) {
    const run = await this.service.updateRunAssignment(ctx, id, dto);
    return ApiResponse.ok(run);
  }

  @Post(':id/submit')
  @RequirePermissions('checklist.run.submit')
  @ApiOperation({ summary: 'Submit completed run' })
  @ApiParam({ name: 'id', description: 'Run UUID' })
  async submit(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
  ) {
    const run = await this.service.submitRun(ctx, id);
    return ApiResponse.ok(run);
  }
}
