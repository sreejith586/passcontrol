import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DateTime } from 'luxon';
import { AlertStatus } from '@prisma/client';
import { ChecklistRunItemsRepository } from '../repositories/checklist-run-items.repository';
import { AlertEventsRepository } from '../../../alert-events/repositories/alert-events.repository';
import { AlertEventsService } from '../../../alert-events/services/alert-events.service';
import { RegionalSettingsResolverService } from '../../../common/services/regional-settings-resolver.service';
import { ListFailedChecklistRunItemsQueryDto } from '../dto/list-failed-checklist-run-items.dto';
import { ListFailedChecklistRunItemsSummaryQueryDto } from '../dto/list-failed-checklist-run-items-summary.dto';
import {
  FailuresTrendsQueryDto,
  FAILURES_TRENDS_INTERVALS,
} from '../dto/failures-trends-query.dto';

export interface RunItemDetailResponse {
  id: string;
  checklistRunId: string;
  label: string;
  description: string | null;
  itemType: string;
  result: string | null;
  comment: string | null;
  sortOrder: number;
  requiresEvidenceOnFailSnapshot: boolean;
  requiresCommentOnFailSnapshot: boolean;
  severitySnapshot: string;
  sectionSnapshot: {
    id: string;
    title: string;
    sortOrder: number;
  };
  checklistRun: {
    id: string;
    runNumber: number;
    status: string;
    templateNameSnapshot: string;
    dueAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    brandId: string | null;
    locationId: string | null;
    zoneId: string | null;
    performedByUserId: string | null;
  };
  attachments: Array<{
    id: string;
    fileId: string;
    createdAt: Date;
    fileName?: string;
    mimeType?: string;
  }>;
  temperatureReadings: Array<{
    id: string;
    readingValue: number;
    unit: string;
    recordedAt: Date;
    isBreach: boolean;
    breachType: string;
    sourceType: string;
  }>;
  alertEvent: {
    id: string;
    status: string;
    severity: string | null;
    acknowledgedAt: Date | null;
    acknowledgedByUserId: string | null;
    resolvedAt: Date | null;
    resolvedByUserId: string | null;
    resolutionNote: string | null;
    createdAt: Date;
  } | null;
}

export interface FailedRunItemResponse {
  id: string;
  checklistRunId: string;
  label: string;
  result: string | null;
  severitySnapshot: string;
  comment: string | null;
  attachmentCount: number;
  checklistRun: {
    runNumber: number;
    templateNameSnapshot: string;
    dueAt: Date | null;
    brandId: string | null;
    locationId: string | null;
    zoneId: string | null;
  };
}

@Injectable()
export class ChecklistRunItemsService {
  constructor(
    private readonly repo: ChecklistRunItemsRepository,
    private readonly alertEventsRepo: AlertEventsRepository,
    private readonly alertEventsService: AlertEventsService,
    private readonly regionalSettings: RegionalSettingsResolverService,
  ) {}

  async getById(
    ctx: { organizationId: string },
    id: string,
  ): Promise<RunItemDetailResponse> {
    const row = await this.repo.findByIdWithContext(ctx.organizationId, id);
    if (!row) {
      throw new NotFoundException('Checklist run item snapshot not found');
    }
    return this.toDetailResponse(row);
  }

  /**
   * Acknowledge the latest OPEN alert for this failed run item.
   * Convenience wrapper: delegates to AlertEventsService.acknowledge.
   */
  async acknowledgeAlert(
    ctx: { organizationId: string; userId?: string },
    itemId: string,
  ) {
    const item = await this.repo.findById(ctx.organizationId, itemId);
    if (!item) {
      throw new NotFoundException('Checklist run item snapshot not found');
    }
    const alert = await this.alertEventsRepo.findFirstBySourceAndStatuses(
      ctx.organizationId,
      'CHECKLIST_RUN_ITEM',
      itemId,
      [AlertStatus.OPEN],
    );
    if (!alert) {
      throw new NotFoundException(
        'No OPEN alert found for this checklist run item',
      );
    }
    return this.alertEventsService.acknowledge(ctx, alert.id);
  }

  /**
   * Resolve the latest OPEN or ACKNOWLEDGED alert for this failed run item.
   * Convenience wrapper: delegates to AlertEventsService.resolve.
   */
  async resolveAlert(
    ctx: { organizationId: string; userId?: string },
    itemId: string,
    resolutionNote?: string,
  ) {
    const item = await this.repo.findById(ctx.organizationId, itemId);
    if (!item) {
      throw new NotFoundException('Checklist run item snapshot not found');
    }
    const alert = await this.alertEventsRepo.findFirstBySourceAndStatuses(
      ctx.organizationId,
      'CHECKLIST_RUN_ITEM',
      itemId,
      [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED],
    );
    if (!alert) {
      throw new NotFoundException(
        'No OPEN or ACKNOWLEDGED alert found for this checklist run item',
      );
    }
    return this.alertEventsService.resolve(ctx, alert.id, resolutionNote);
  }

  /**
   * Get failed items summary grouped by locationId.
   * Returns items ordered by: critical DESC, open alerts DESC, total DESC, locationId ASC.
   */
  async getSummaryByLocation(
    ctx: { organizationId: string },
    query: ListFailedChecklistRunItemsSummaryQueryDto,
  ) {
    const filters = {
      brandId: query.brandId,
      locationId: query.locationId,
      zoneId: query.zoneId,
      checklistTemplateId: query.checklistTemplateId,
      severity: query.severity,
      from: query.from,
      to: query.to,
    };
    const rows = await this.repo.getFailedItemsSummaryByLocation(
      ctx.organizationId,
      filters,
    );
    return {
      items: rows.map((r) => ({
        locationId: r.locationId,
        failedItems: {
          total: r.total,
          bySeverity: {
            critical: r.critical,
            high: r.high,
            medium: r.medium,
            low: r.low,
            unknown: r.unknown,
          },
        },
        alerts: {
          open: r.openAlerts,
          acknowledged: r.acknowledgedAlerts,
          resolved: r.resolvedAlerts,
        },
        runs: {
          affectedRuns: r.affectedRuns,
        },
      })),
    };
  }

  /**
   * Get failed items summary grouped by checklist template.
   * Returns items ordered by: critical DESC, open alerts DESC, total DESC, templateName ASC.
   */
  async getSummaryByTemplate(
    ctx: { organizationId: string },
    query: ListFailedChecklistRunItemsSummaryQueryDto,
  ) {
    const filters = {
      brandId: query.brandId,
      locationId: query.locationId,
      zoneId: query.zoneId,
      checklistTemplateId: query.checklistTemplateId,
      severity: query.severity,
      from: query.from,
      to: query.to,
    };
    const rows = await this.repo.getFailedItemsSummaryByTemplate(
      ctx.organizationId,
      filters,
    );
    return {
      items: rows.map((r) => ({
        checklistTemplateId: r.checklistTemplateId,
        templateName: r.templateName,
        failedItems: {
          total: r.total,
          bySeverity: {
            critical: r.critical,
            high: r.high,
            medium: r.medium,
            low: r.low,
            unknown: r.unknown,
          },
        },
        alerts: {
          open: r.openAlerts,
          acknowledged: r.acknowledgedAlerts,
          resolved: r.resolvedAlerts,
        },
        runs: {
          affectedRuns: r.affectedRuns,
        },
      })),
    };
  }

  /**
   * Get failed items trends over time for compliance visualization.
   * Returns data points grouped by interval (day/week/month).
   */
  async getFailuresTrends(
    ctx: { organizationId: string },
    query: FailuresTrendsQueryDto,
  ) {
    const interval =
      query.interval && FAILURES_TRENDS_INTERVALS.includes(query.interval)
        ? query.interval
        : 'day';
    const filters = {
      brandId: query.brandId,
      locationId: query.locationId,
      zoneId: query.zoneId,
      checklistTemplateId: query.checklistTemplateId,
      severity: query.severity,
      from: query.from,
      to: query.to,
    };
    const rows = await this.repo.getFailedItemsTrends(
      ctx.organizationId,
      filters,
      interval,
    );
    return {
      interval,
      points: rows.map((r) => ({
        date: r.date,
        failedItems: {
          total: r.total,
          bySeverity: {
            critical: r.critical,
            high: r.high,
            medium: r.medium,
            low: r.low,
            unknown: r.unknown,
          },
        },
      })),
    };
  }

  /**
   * Get dashboard summary for failed checklist run items.
   * Returns compact counts: failed items by severity, latest alert status, affected runs.
   */
  async getSummary(
    ctx: { organizationId: string },
    query: ListFailedChecklistRunItemsSummaryQueryDto,
  ) {
    const filters = {
      brandId: query.brandId,
      locationId: query.locationId,
      zoneId: query.zoneId,
      checklistTemplateId: query.checklistTemplateId,
      severity: query.severity,
      from: query.from,
      to: query.to,
    };
    const raw = await this.repo.getFailedItemsSummary(
      ctx.organizationId,
      filters,
    );
    return {
      failedItems: {
        total: raw.total,
        bySeverity: {
          critical: raw.critical,
          high: raw.high,
          medium: raw.medium,
          low: raw.low,
          unknown: raw.unknown,
        },
      },
      alerts: {
        open: raw.openAlerts,
        acknowledged: raw.acknowledgedAlerts,
        resolved: raw.resolvedAlerts,
      },
      runs: {
        affectedRuns: raw.affectedRuns,
      },
    };
  }

  /**
   * Get failed items for export/reports. Bypasses pagination (high limit).
   * Used by ReportsService only.
   */
  async getFailedItemsForReport(
    ctx: { organizationId: string },
    filters: {
      brandId?: string;
      locationId?: string;
      zoneId?: string;
      checklistTemplateId?: string;
      severity?: string;
      from?: string;
      to?: string;
    },
  ): Promise<FailedRunItemResponse[]> {
    if (!ctx?.organizationId?.trim()) {
      throw new UnauthorizedException('Organization context is required');
    }
    const REPORT_LIMIT = 10000;
    const timezone =
      (
        await this.regionalSettings.resolveRegionalSettings(
          ctx.organizationId,
          filters.locationId,
        )
      ).timezone;
    const filtersWithTz = { ...filters, timezone };
    const ids = await this.repo.findFailedItemIds(ctx.organizationId, filtersWithTz, {
      page: 1,
      limit: REPORT_LIMIT,
    });
    const hydrated = await this.repo.findByIdsWithRunAndAttachmentCount(
      ctx.organizationId,
      ids,
    );
    return hydrated.map((row) => this.toResponse(row));
  }

  /**
   * Get item snapshots in date range for Checklist Item Status report (preview).
   * Returns paginated items with section and run context.
   */
  async getItemStatusForReport(
    ctx: { organizationId: string; userId?: string },
    filters: {
      from?: string;
      to?: string;
      timezone?: string;
      brandId?: string;
      locationId?: string;
      zoneId?: string;
      checklistTemplateId?: string;
      assignedToMe?: boolean;
      result?: 'PASS' | 'FAIL';
    },
    pagination: { page: number; limit: number },
  ): Promise<{
    items: Array<{
      id: string;
      checklistRunId: string;
      labelSnapshot: string;
      itemTypeSnapshot: string;
      result: string | null;
      comment: string | null;
      severitySnapshot: string;
      sectionTitle: string;
      runNumber: number;
      templateNameSnapshot: string;
      dueAt: Date | null;
      attachmentCount: number;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const timezone =
      filters.timezone ??
      (
        await this.regionalSettings.resolveRegionalSettings(
          ctx.organizationId,
          filters.locationId,
        )
      ).timezone;
    const zone = timezone ?? 'UTC';
    let start: Date;
    let end: Date;
    if (filters.from && filters.to) {
      const fromDt = DateTime.fromISO(filters.from, { zone });
      const toDt = DateTime.fromISO(filters.to, { zone });
      start = (fromDt.isValid ? fromDt : DateTime.now().setZone(zone))
        .startOf('day')
        .toUTC()
        .toJSDate();
      end = (toDt.isValid ? toDt : DateTime.now().setZone(zone))
        .endOf('day')
        .toUTC()
        .toJSDate();
    } else {
      const dt = DateTime.now().setZone(zone);
      start = dt.startOf('day').toUTC().toJSDate();
      end = dt.endOf('day').toUTC().toJSDate();
    }
    const assignedToUserId =
      filters.assignedToMe && ctx.userId ? ctx.userId : undefined;

    const { items, total } = await this.repo.findItemSnapshotsInDateRange(
      ctx.organizationId,
      {
        start,
        end,
        brandId: filters.brandId,
        locationId: filters.locationId,
        zoneId: filters.zoneId,
        checklistTemplateId: filters.checklistTemplateId,
        assignedToUserId,
        result: filters.result,
      },
      pagination,
    );

    return {
      items: items.map((i) => ({
        id: i.id,
        checklistRunId: i.checklistRunId,
        labelSnapshot: i.labelSnapshot,
        itemTypeSnapshot: i.itemTypeSnapshot,
        result: i.result,
        comment: i.comment,
        severitySnapshot: i.severitySnapshot ?? '',
        sectionTitle: i.checklistRunSectionSnapshot?.titleSnapshot ?? '',
        runNumber: i.checklistRun.runNumber,
        templateNameSnapshot: i.checklistRun.templateNameSnapshot,
        dueAt: i.checklistRun.dueAt,
        attachmentCount: i._count?.attachments ?? 0,
      })),
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  /**
   * Get all item snapshots in date range for export (high limit).
   */
  async getItemStatusForExport(
    ctx: { organizationId: string; userId?: string },
    filters: {
      from?: string;
      to?: string;
      timezone?: string;
      brandId?: string;
      locationId?: string;
      zoneId?: string;
      checklistTemplateId?: string;
      assignedToMe?: boolean;
      result?: 'PASS' | 'FAIL';
    },
  ): Promise<
    Array<{
      id: string;
      checklistRunId: string;
      labelSnapshot: string;
      itemTypeSnapshot: string;
      result: string | null;
      comment: string | null;
      severitySnapshot: string;
      sectionTitle: string;
      runNumber: number;
      templateNameSnapshot: string;
      dueAt: Date | null;
      attachmentCount: number;
    }>
  > {
    const REPORT_LIMIT = 10000;
    const result = await this.getItemStatusForReport(ctx, filters, {
      page: 1,
      limit: REPORT_LIMIT,
    });
    return result.items;
  }

  async getFailedItems(
    ctx: { organizationId: string },
    query: ListFailedChecklistRunItemsQueryDto,
  ): Promise<{
    items: FailedRunItemResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    if (!ctx?.organizationId?.trim()) {
      throw new UnauthorizedException('Organization context is required');
    }
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const pagination = { page, limit };

    const timezone = (
      await this.regionalSettings.resolveRegionalSettings(
        ctx.organizationId,
        query.locationId,
      )
    ).timezone;

    const filters = {
      brandId: query.brandId,
      locationId: query.locationId,
      zoneId: query.zoneId,
      checklistTemplateId: query.checklistTemplateId,
      severity: query.severity,
      from: query.from,
      to: query.to,
      timezone,
    };

    const [ids, total] = await Promise.all([
      this.repo.findFailedItemIds(ctx.organizationId, filters, pagination),
      this.repo.countFailedItems(ctx.organizationId, filters),
    ]);

    const hydrated = await this.repo.findByIdsWithRunAndAttachmentCount(
      ctx.organizationId,
      ids,
    );

    const items = hydrated.map((row) => this.toResponse(row));

    return { items, total, page, limit };
  }

  private toDetailResponse(row: {
    id: string;
    checklistRunId: string;
    labelSnapshot: string;
    helpTextSnapshot: string | null;
    itemTypeSnapshot: string;
    result: string | null;
    comment: string | null;
    sortOrder: number;
    requiresEvidenceOnFailSnapshot: boolean;
    requiresCommentOnFailSnapshot: boolean;
    severitySnapshot: string;
    checklistRunSectionSnapshot: {
      id: string;
      titleSnapshot: string;
      sortOrder: number;
    };
    checklistRun: {
      id: string;
      runNumber: number;
      status: string;
      templateNameSnapshot: string;
      dueAt: Date | null;
      startedAt: Date | null;
      completedAt: Date | null;
      brandId: string | null;
      locationId: string | null;
      zoneId: string | null;
      performedByUserId: string | null;
    };
    attachments: Array<{
      id: string;
      fileId: string;
      createdAt: Date;
      file: {
        fileName: string;
        mimeType: string;
      };
    }>;
    temperatureReadings: Array<{
      id: string;
      readingValue: number;
      unit: string;
      recordedAt: Date;
      isBreach: boolean;
      breachType: string;
      sourceType: string;
    }>;
    alertEvent: {
      id: string;
      status: string;
      severity: string | null;
      acknowledgedAt: Date | null;
      acknowledgedByUserId: string | null;
      resolvedAt: Date | null;
      resolvedByUserId: string | null;
      resolutionNote: string | null;
      createdAt: Date;
    } | null;
  }): RunItemDetailResponse {
    return {
      id: row.id,
      checklistRunId: row.checklistRunId,
      label: row.labelSnapshot,
      description: row.helpTextSnapshot ?? null,
      itemType: row.itemTypeSnapshot,
      result: row.result,
      comment: row.comment,
      sortOrder: row.sortOrder,
      requiresEvidenceOnFailSnapshot: row.requiresEvidenceOnFailSnapshot,
      requiresCommentOnFailSnapshot: row.requiresCommentOnFailSnapshot,
      severitySnapshot: row.severitySnapshot,
      sectionSnapshot: {
        id: row.checklistRunSectionSnapshot.id,
        title: row.checklistRunSectionSnapshot.titleSnapshot,
        sortOrder: row.checklistRunSectionSnapshot.sortOrder,
      },
      checklistRun: {
        id: row.checklistRun.id,
        runNumber: row.checklistRun.runNumber,
        status: row.checklistRun.status,
        templateNameSnapshot: row.checklistRun.templateNameSnapshot,
        dueAt: row.checklistRun.dueAt,
        startedAt: row.checklistRun.startedAt,
        completedAt: row.checklistRun.completedAt,
        brandId: row.checklistRun.brandId,
        locationId: row.checklistRun.locationId,
        zoneId: row.checklistRun.zoneId,
        performedByUserId: row.checklistRun.performedByUserId,
      },
      attachments: row.attachments.map((a) => ({
        id: a.id,
        fileId: a.fileId,
        createdAt: a.createdAt,
        fileName: a.file?.fileName,
        mimeType: a.file?.mimeType,
      })),
      temperatureReadings: row.temperatureReadings,
      alertEvent: row.alertEvent
        ? {
            id: row.alertEvent.id,
            status: row.alertEvent.status,
            severity: row.alertEvent.severity,
            acknowledgedAt: row.alertEvent.acknowledgedAt,
            acknowledgedByUserId: row.alertEvent.acknowledgedByUserId,
            resolvedAt: row.alertEvent.resolvedAt,
            resolvedByUserId: row.alertEvent.resolvedByUserId,
            resolutionNote: row.alertEvent.resolutionNote,
            createdAt: row.alertEvent.createdAt,
          }
        : null,
    };
  }

  private toResponse(row: {
    id: string;
    checklistRunId: string;
    labelSnapshot: string;
    result: string | null;
    severitySnapshot: string;
    comment: string | null;
    _count: { attachments: number };
    checklistRun: {
      runNumber: number;
      templateNameSnapshot: string;
      dueAt: Date | null;
      brandId: string | null;
      locationId: string | null;
      zoneId: string | null;
    };
  }): FailedRunItemResponse {
    return {
      id: row.id,
      checklistRunId: row.checklistRunId,
      label: row.labelSnapshot,
      result: row.result,
      severitySnapshot: row.severitySnapshot,
      comment: row.comment,
      attachmentCount: row._count.attachments,
      checklistRun: {
        runNumber: row.checklistRun.runNumber,
        templateNameSnapshot: row.checklistRun.templateNameSnapshot,
        dueAt: row.checklistRun.dueAt,
        brandId: row.checklistRun.brandId,
        locationId: row.checklistRun.locationId,
        zoneId: row.checklistRun.zoneId,
      },
    };
  }
}
