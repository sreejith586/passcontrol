import { Injectable, Logger } from '@nestjs/common';
import { ChecklistRunsService } from '../../checklists/runs/services/checklist-runs.service';
import { ChecklistRunItemsService } from '../../checklists/runs/services/checklist-run-items.service';
import { ReportsExcelService } from './reports-excel.service';
import { CompletionReportQueryDto } from '../dto/completion-report-query.dto';
import { OverdueRunsReportQueryDto } from '../dto/overdue-runs-report-query.dto';
import { FailedItemsReportQueryDto } from '../dto/failed-items-report-query.dto';
import { ConsolidatedOperationsReportQueryDto } from '../dto/consolidated-operations-report-query.dto';
import { ChecklistItemStatusReportQueryDto } from '../dto/checklist-item-status-report-query.dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly checklistRunsService: ChecklistRunsService,
    private readonly checklistRunItemsService: ChecklistRunItemsService,
    private readonly excelService: ReportsExcelService,
  ) {}

  async getCompletionReportPreview(
    ctx: { organizationId: string; userId?: string },
    query: CompletionReportQueryDto & { page?: number; limit?: number },
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 100, 500);
    return this.checklistRunsService.getRunsInDateRangeForReport(
      ctx,
      {
        from: query.from,
        to: query.to,
        timezone: query.timezone,
        brandId: query.brandId,
        locationId: query.locationId,
        zoneId: query.zoneId,
        assignedToMe: query.assignedToMe,
      },
      { page, limit },
    );
  }

  async exportCompletionReport(
    ctx: { organizationId: string; userId?: string },
    query: CompletionReportQueryDto,
  ): Promise<Buffer> {
    const { items } = await this.checklistRunsService.getRunsInDateRangeForReport(
      ctx,
      {
        from: query.from,
        to: query.to,
        timezone: query.timezone,
        brandId: query.brandId,
        locationId: query.locationId,
        zoneId: query.zoneId,
        assignedToMe: query.assignedToMe,
      },
    );
    return this.excelService.buildCompletionReport(items as any);
  }

  async getFailedItemsPreview(
    ctx: { organizationId: string },
    query: FailedItemsReportQueryDto & { page?: number; limit?: number },
  ) {
    const orgPresent = Boolean(ctx?.organizationId?.trim());
    this.logger.debug(
      `Failed items preview: organizationId=${orgPresent ? 'present' : 'missing/blank'}`,
    );
    try {
      const page = query.page ?? 1;
      const limit = Math.min(query.limit ?? 100, 500);
      return await this.checklistRunItemsService.getFailedItems(ctx, {
        brandId: query.brandId,
        locationId: query.locationId,
        zoneId: query.zoneId,
        checklistTemplateId: query.checklistTemplateId,
        severity: query.severity,
        from: query.from,
        to: query.to,
        page,
        limit,
      });
    } catch (err) {
      this.logger.warn(
        `Failed items preview error: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }

  async exportFailedItemsReport(
    ctx: { organizationId: string },
    query: FailedItemsReportQueryDto,
  ): Promise<Buffer> {
    const rows = await this.checklistRunItemsService.getFailedItemsForReport(
      ctx,
      {
        brandId: query.brandId,
        locationId: query.locationId,
        zoneId: query.zoneId,
        checklistTemplateId: query.checklistTemplateId,
        severity: query.severity,
        from: query.from,
        to: query.to,
      },
    );
    return this.excelService.buildFailedItemsReport(rows);
  }

  async exportOverdueRunsReport(
    ctx: { organizationId: string; userId?: string },
    query: OverdueRunsReportQueryDto,
  ): Promise<Buffer> {
    const rows = await this.checklistRunsService.getOverdueRunsForReport(
      ctx,
      {
        brandId: query.brandId,
        locationId: query.locationId,
        zoneId: query.zoneId,
        checklistTemplateId: query.checklistTemplateId,
        assignedToMe: query.assignedToMe,
      },
    );
    return this.excelService.buildOverdueRunsReport(rows as any);
  }

  async getConsolidatedOperationsPreview(
    ctx: { organizationId: string; userId?: string },
    query: ConsolidatedOperationsReportQueryDto & { page?: number; limit?: number },
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 100, 500);
    return this.checklistRunsService.getRunsInDateRangeWithAggregates(
      ctx,
      {
        from: query.from,
        to: query.to,
        timezone: query.timezone,
        brandId: query.brandId,
        locationId: query.locationId,
        zoneId: query.zoneId,
        assignedToMe: query.assignedToMe,
      },
      { page, limit },
    );
  }

  async exportConsolidatedOperationsReport(
    ctx: { organizationId: string; userId?: string },
    query: ConsolidatedOperationsReportQueryDto,
  ): Promise<Buffer> {
    const { items } = await this.checklistRunsService.getRunsInDateRangeWithAggregates(
      ctx,
      {
        from: query.from,
        to: query.to,
        timezone: query.timezone,
        brandId: query.brandId,
        locationId: query.locationId,
        zoneId: query.zoneId,
        assignedToMe: query.assignedToMe,
      },
    );
    return this.excelService.buildConsolidatedOperationsReport(items as any);
  }

  async getChecklistItemStatusPreview(
    ctx: { organizationId: string; userId?: string },
    query: ChecklistItemStatusReportQueryDto & { page?: number; limit?: number },
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 100, 500);
    return this.checklistRunItemsService.getItemStatusForReport(
      ctx,
      {
        from: query.from,
        to: query.to,
        timezone: query.timezone,
        brandId: query.brandId,
        locationId: query.locationId,
        zoneId: query.zoneId,
        checklistTemplateId: query.checklistTemplateId,
        assignedToMe: query.assignedToMe,
        result: query.result,
      },
      { page, limit },
    );
  }

  async exportChecklistItemStatusReport(
    ctx: { organizationId: string; userId?: string },
    query: ChecklistItemStatusReportQueryDto,
  ): Promise<Buffer> {
    const rows = await this.checklistRunItemsService.getItemStatusForExport(ctx, {
      from: query.from,
      to: query.to,
      timezone: query.timezone,
      brandId: query.brandId,
      locationId: query.locationId,
      zoneId: query.zoneId,
      checklistTemplateId: query.checklistTemplateId,
      assignedToMe: query.assignedToMe,
      result: query.result,
    });
    return this.excelService.buildChecklistItemStatusReport(rows);
  }
}
