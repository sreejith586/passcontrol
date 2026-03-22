import {
  Controller,
  Get,
  Query,
  UseGuards,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { RbacGuard } from '../../access/rbac/rbac.guard';
import { RequirePermissions } from '../../access/rbac/permissions.decorator';
import {
  CurrentTenantContext,
  TenantContext,
} from '../../access/decorators/current-tenant.decorator';
import { ApiResponse } from '../../infra/responses/api-response';
import { ReportsService } from '../services/reports.service';
import { CompletionReportQueryDto } from '../dto/completion-report-query.dto';
import { OverdueRunsReportQueryDto } from '../dto/overdue-runs-report-query.dto';
import { FailedItemsReportQueryDto } from '../dto/failed-items-report-query.dto';
import { ConsolidatedOperationsReportQueryDto } from '../dto/consolidated-operations-report-query.dto';
import { ChecklistItemStatusReportQueryDto } from '../dto/checklist-item-status-report-query.dto';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Controller({ path: 'reports', version: '1' })
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiTags('Reports')
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('checklist-completion')
  @RequirePermissions('reports.view')
  @ApiOperation({
    summary: 'Preview checklist completion report (JSON)',
    description:
      'Returns runs in the given from/to date range. Same semantics as export. Paginated for preview.',
  })
  @ApiQuery({ name: 'brandId', required: false })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'zoneId', required: false })
  @ApiQuery({ name: 'timezone', required: false })
  @ApiQuery({ name: 'from', required: false, example: '2025-03-01' })
  @ApiQuery({ name: 'to', required: false, example: '2025-03-31' })
  @ApiQuery({ name: 'assignedToMe', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getCompletionPreview(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: CompletionReportQueryDto,
  ) {
    const result = await this.reportsService.getCompletionReportPreview(ctx, query);
    return ApiResponse.ok(result);
  }

  @Get('checklist-completion/export')
  @RequirePermissions('reports.view')
  @ApiOperation({
    summary: 'Export checklist completion report as Excel',
    description:
      'Returns runs in the given date range. Uses from/to for range; defaults to today if omitted.',
  })
  @ApiQuery({ name: 'brandId', required: false })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'zoneId', required: false })
  @ApiQuery({ name: 'timezone', required: false })
  @ApiQuery({ name: 'from', required: false, example: '2025-03-01' })
  @ApiQuery({ name: 'to', required: false, example: '2025-03-31' })
  @ApiQuery({ name: 'assignedToMe', required: false, type: Boolean })
  async exportCompletion(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: CompletionReportQueryDto,
  ): Promise<StreamableFile> {
    const buffer = await this.reportsService.exportCompletionReport(ctx, query);
    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="checklist-completion-report.xlsx"',
    });
  }

  @Get('failed-items')
  @RequirePermissions('reports.view')
  @ApiOperation({
    summary: 'Preview failed items report (JSON)',
    description:
      'Returns failed checklist run items (result=FAIL) in the given date range. Same semantics as export. Paginated.',
  })
  @ApiQuery({ name: 'brandId', required: false })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'zoneId', required: false })
  @ApiQuery({ name: 'checklistTemplateId', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getFailedItemsPreview(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: FailedItemsReportQueryDto,
  ) {
    const result = await this.reportsService.getFailedItemsPreview(ctx, query);
    return ApiResponse.ok(result);
  }

  @Get('failed-items/export')
  @RequirePermissions('reports.view')
  @ApiOperation({
    summary: 'Export failed items report as Excel',
    description:
      'Returns failed checklist run items (result=FAIL) in the given date range.',
  })
  @ApiQuery({ name: 'brandId', required: false })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'zoneId', required: false })
  @ApiQuery({ name: 'checklistTemplateId', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async exportFailedItems(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: FailedItemsReportQueryDto,
  ): Promise<StreamableFile> {
    const buffer = await this.reportsService.exportFailedItemsReport(
      ctx,
      query,
    );
    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="failed-items-report.xlsx"',
    });
  }

  @Get('overdue-runs/export')
  @RequirePermissions('reports.view')
  @ApiOperation({
    summary: 'Export overdue runs report as Excel',
    description: 'Returns overdue checklist runs (due in the past, not completed).',
  })
  @ApiQuery({ name: 'brandId', required: false })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'zoneId', required: false })
  @ApiQuery({ name: 'checklistTemplateId', required: false })
  @ApiQuery({ name: 'assignedToMe', required: false, type: Boolean })
  async exportOverdueRuns(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: OverdueRunsReportQueryDto,
  ): Promise<StreamableFile> {
    const buffer = await this.reportsService.exportOverdueRunsReport(
      ctx,
      query,
    );
    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="overdue-runs-report.xlsx"',
    });
  }

  @Get('consolidated-operations')
  @RequirePermissions('reports.view')
  @ApiOperation({
    summary: 'Preview consolidated operations report (JSON)',
    description:
      'Returns runs in date range with failedItemCount and openAlertCount. Same semantics as export. Paginated.',
  })
  @ApiQuery({ name: 'brandId', required: false })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'zoneId', required: false })
  @ApiQuery({ name: 'timezone', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'assignedToMe', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getConsolidatedOperationsPreview(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: ConsolidatedOperationsReportQueryDto,
  ) {
    const result = await this.reportsService.getConsolidatedOperationsPreview(
      ctx,
      query,
    );
    return ApiResponse.ok(result);
  }

  @Get('consolidated-operations/export')
  @RequirePermissions('reports.view')
  @ApiOperation({
    summary: 'Export consolidated operations report as Excel',
    description:
      'Returns runs with failedItemCount and openAlertCount. Uses from/to for range.',
  })
  @ApiQuery({ name: 'brandId', required: false })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'zoneId', required: false })
  @ApiQuery({ name: 'timezone', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'assignedToMe', required: false, type: Boolean })
  async exportConsolidatedOperations(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: ConsolidatedOperationsReportQueryDto,
  ): Promise<StreamableFile> {
    const buffer =
      await this.reportsService.exportConsolidatedOperationsReport(ctx, query);
    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="consolidated-operations-report.xlsx"',
    });
  }

  @Get('checklist-item-status')
  @RequirePermissions('reports.view')
  @ApiOperation({
    summary: 'Preview checklist item status report (JSON)',
    description:
      'Returns all items in runs within date range. Same semantics as export. Paginated.',
  })
  @ApiQuery({ name: 'brandId', required: false })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'zoneId', required: false })
  @ApiQuery({ name: 'checklistTemplateId', required: false })
  @ApiQuery({ name: 'timezone', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'assignedToMe', required: false, type: Boolean })
  @ApiQuery({ name: 'result', required: false, enum: ['PASS', 'FAIL'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getChecklistItemStatusPreview(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: ChecklistItemStatusReportQueryDto,
  ) {
    const result = await this.reportsService.getChecklistItemStatusPreview(
      ctx,
      query,
    );
    return ApiResponse.ok(result);
  }

  @Get('checklist-item-status/export')
  @RequirePermissions('reports.view')
  @ApiOperation({
    summary: 'Export checklist item status report as Excel',
    description: 'Returns all items in runs within date range.',
  })
  @ApiQuery({ name: 'brandId', required: false })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'zoneId', required: false })
  @ApiQuery({ name: 'checklistTemplateId', required: false })
  @ApiQuery({ name: 'timezone', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'assignedToMe', required: false, type: Boolean })
  @ApiQuery({ name: 'result', required: false, enum: ['PASS', 'FAIL'] })
  async exportChecklistItemStatus(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: ChecklistItemStatusReportQueryDto,
  ): Promise<StreamableFile> {
    const buffer =
      await this.reportsService.exportChecklistItemStatusReport(ctx, query);
    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="checklist-item-status-report.xlsx"',
    });
  }
}
