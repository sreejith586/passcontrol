import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { DateTime } from 'luxon';
import { Prisma } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import { ChecklistRunsRepository } from '../repositories/checklist-runs.repository';
import { AuditLogsService } from '../../../audit/services/audit-logs.service';
import { AlertEventsService } from '../../../alert-events/services/alert-events.service';
import {
  DOMAIN_EVENT_PUBLISHER,
  DomainEventPublisher,
} from '../../../common/domain-events/contracts/domain-event-publisher.interface';
import {
  createChecklistRunItemFailedEvent,
  ChecklistRunItemFailedPayload,
} from '../../../common/domain-events/events/checklist-run-item-failed.event';
import {
  createChecklistRunCompletedEvent,
} from '../../../common/domain-events/events/checklist-run-completed.event';
import { AttachmentsService } from '../../../attachments/services/attachments.service';
import { AttachmentType } from '../../../attachments/enums/attachment-type.enum';
import { FilesService } from '../../../files/services/files.service';
import { STORAGE_SERVICE } from '../../../files/storage/storage.interface';
import type { StorageServiceInterface } from '../../../files/storage/storage.interface';
import type { EvidenceUploadFile } from '../types/uploaded-file.interface';
import { TemperatureReadingsService } from '../../../temperature/services/temperature-readings.service';
import { RegionalSettingsResolverService } from '../../../common/services/regional-settings-resolver.service';
import { ListTodayRunsQueryDto } from '../dto/list-today-runs.dto';
import { ListOverdueRunsQueryDto } from '../dto/list-overdue-runs.dto';
import { ListFailedRunsQueryDto } from '../dto/list-failed-runs.dto';
import { ChecklistRunMetricsQueryDto } from '../dto/list-metrics.dto';
import { UpdateRunItemDto } from '../dto/update-run-item.dto';
import { LinkAttachmentToRunItemDto } from '../dto/link-attachment-to-run-item.dto';
import { CreateTemperatureReadingForRunItemDto } from '../dto/create-temperature-reading-for-run-item.dto';
import { TemperatureSourceType } from '../../../temperature/enums/source-type.enum';
import { UsersService } from '../../../users/services/users.service';
import { UpdateChecklistRunAssignmentDto } from '../dto/update-checklist-run-assignment.dto';

@Injectable()
export class ChecklistRunsService {
  constructor(
    private readonly repo: ChecklistRunsRepository,
    private readonly usersService: UsersService,
    private readonly audit: AuditLogsService,
    private readonly alertEvents: AlertEventsService,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly domainEvents: DomainEventPublisher,
    private readonly attachments: AttachmentsService,
    private readonly filesService: FilesService,
    @Inject(STORAGE_SERVICE)
    private readonly storage: StorageServiceInterface,
    private readonly temperatureReadings: TemperatureReadingsService,
    private readonly regionalSettings: RegionalSettingsResolverService,
  ) {}

  /**
   * Resolve assignment filter from query params.
   * Precedence: assignedToMe (uses ctx.userId) > assignedToUserId.
   */
  private resolveAssignmentFilter(
    assignedToMe?: boolean,
    assignedToUserId?: string,
    userId?: string,
  ): string | undefined {
    if (assignedToMe === true && userId) return userId;
    if (assignedToUserId) return assignedToUserId;
    return undefined;
  }

  private getDateRange(timezone?: string, dateStr?: string): { start: Date; end: Date } {
    const zone = timezone ?? 'UTC';
    let dt: DateTime;
    if (dateStr) {
      const parsed = DateTime.fromISO(dateStr, { zone });
      dt = parsed.isValid ? parsed : DateTime.now().setZone(zone);
    } else {
      dt = DateTime.now().setZone(zone);
    }
    const start = dt.startOf('day').toUTC().toJSDate();
    const end = dt.endOf('day').toUTC().toJSDate();
    return { start, end };
  }

  async getMetrics(
    ctx: { organizationId: string },
    query: ChecklistRunMetricsQueryDto,
  ) {
    const timezone =
      query.timezone ??
      (
        await this.regionalSettings.resolveRegionalSettings(
          ctx.organizationId,
          query.locationId,
        )
      ).timezone;
    const todayRange = this.getDateRange(timezone, query.date);
    // resolvedAlertsToday: always UTC today (per spec), not affected by timezone/date params
    const utcToday = DateTime.utc();
    const resolvedTodayRange = {
      start: utcToday.startOf('day').toJSDate(),
      end: utcToday.endOf('day').toJSDate(),
    };
    const filters = {
      brandId: query.brandId,
      locationId: query.locationId,
      zoneId: query.zoneId,
    };

    const [todayRuns, overdueRuns, failedRuns, totalRuns, alertCounts] =
      await Promise.all([
        this.repo.countTodayRuns(ctx.organizationId, filters, todayRange),
        this.repo.countOverdueRuns(ctx.organizationId, filters),
        this.repo.countFailedRuns(ctx.organizationId, filters),
        this.repo.countTotalRuns(ctx.organizationId, filters),
        this.alertEvents.getMetricsCounts(
          ctx.organizationId,
          filters,
          resolvedTodayRange,
        ),
      ]);

    return {
      todayRuns,
      overdueRuns,
      failedRuns,
      totalRuns,
      openAlerts: alertCounts.open,
      acknowledgedAlerts: alertCounts.acknowledged,
      resolvedAlertsToday: alertCounts.resolvedToday,
    };
  }

  async getTodayRuns(
    ctx: { organizationId: string; userId?: string },
    query: ListTodayRunsQueryDto,
  ) {
    const timezone =
      query.timezone ??
      (
        await this.regionalSettings.resolveRegionalSettings(
          ctx.organizationId,
          query.locationId,
        )
      ).timezone;
    const { start, end } = this.getDateRange(timezone, query.date);
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const assignedToUserId = this.resolveAssignmentFilter(
      query.assignedToMe,
      query.assignedToUserId,
      ctx.userId,
    );
    const { items, total } = await this.repo.findTodayRuns(
      ctx.organizationId,
      {
        status: query.status,
        brandId: query.brandId,
        locationId: query.locationId,
        zoneId: query.zoneId,
        assignedToUserId,
      },
      { start, end },
      { page, limit },
      { view: query.view ?? 'full' },
    );
    return { items, total, page, limit };
  }

  /**
   * Get runs in a date range for export/reports.
   * When pagination is provided, returns paginated result for preview. Otherwise returns all (high limit) for export.
   */
  async getRunsInDateRangeForReport(
    ctx: { organizationId: string; userId?: string },
    filters: {
      from?: string;
      to?: string;
      timezone?: string;
      brandId?: string;
      locationId?: string;
      zoneId?: string;
      assignedToMe?: boolean;
    },
    pagination?: { page: number; limit: number },
  ) {
    const REPORT_LIMIT = 10000;
    const { page, limit } = pagination ?? { page: 1, limit: REPORT_LIMIT };
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
    const assignedToUserId = filters.assignedToMe && ctx.userId ? ctx.userId : undefined;
    const { items, total } = await this.repo.findTodayRuns(
      ctx.organizationId,
      {
        brandId: filters.brandId,
        locationId: filters.locationId,
        zoneId: filters.zoneId,
        assignedToUserId,
      },
      { start, end },
      { page, limit },
      { view: 'summary' },
    );
    return { items, total, page, limit };
  }

  /**
   * Get runs in date range with failedItemCount and openAlertCount. For consolidated operations report.
   */
  async getRunsInDateRangeWithAggregates(
    ctx: { organizationId: string; userId?: string },
    filters: {
      from?: string;
      to?: string;
      timezone?: string;
      brandId?: string;
      locationId?: string;
      zoneId?: string;
      assignedToMe?: boolean;
    },
    pagination?: { page: number; limit: number },
  ) {
    const result = await this.getRunsInDateRangeForReport(ctx, filters, pagination);
    const runIds = result.items.map((r) => r.id);
    const aggregates = await this.repo.getRunAggregates(ctx.organizationId, runIds);
    const items = result.items.map((r) => {
      const agg = aggregates.get(r.id) ?? { failedItemCount: 0, openAlertCount: 0 };
      return { ...r, failedItemCount: agg.failedItemCount, openAlertCount: agg.openAlertCount };
    });
    return { ...result, items };
  }

  /**
   * Get overdue runs for export/reports. Bypasses pagination (high limit).
   * Used by ReportsService only.
   */
  async getOverdueRunsForReport(
    ctx: { organizationId: string; userId?: string },
    filters: {
      brandId?: string;
      locationId?: string;
      zoneId?: string;
      checklistTemplateId?: string;
      assignedToMe?: boolean;
    },
  ) {
    const REPORT_LIMIT = 10000;
    const assignedToUserId = filters.assignedToMe && ctx.userId ? ctx.userId : undefined;
    const { items } = await this.repo.findOverdueRuns(
      ctx.organizationId,
      {
        brandId: filters.brandId,
        locationId: filters.locationId,
        zoneId: filters.zoneId,
        checklistTemplateId: filters.checklistTemplateId,
        assignedToUserId,
      },
      { page: 1, limit: REPORT_LIMIT },
      { view: 'summary' },
    );
    return items;
  }

  async getOverdueRuns(
    ctx: { organizationId: string; userId?: string },
    query: ListOverdueRunsQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const assignedToUserId = this.resolveAssignmentFilter(
      query.assignedToMe,
      query.assignedToUserId,
      ctx.userId,
    );
    const { items, total } = await this.repo.findOverdueRuns(
      ctx.organizationId,
      {
        brandId: query.brandId,
        locationId: query.locationId,
        zoneId: query.zoneId,
        checklistTemplateId: query.checklistTemplateId,
        assignedToUserId,
      },
      { page, limit },
      { view: query.view ?? 'full' },
    );
    return { items, total, page, limit };
  }

  async getFailedRuns(
    ctx: { organizationId: string; userId?: string },
    query: ListFailedRunsQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const assignedToUserId = this.resolveAssignmentFilter(
      query.assignedToMe,
      query.assignedToUserId,
      ctx.userId,
    );
    const { items, total } = await this.repo.findFailedRuns(
      ctx.organizationId,
      {
        brandId: query.brandId,
        locationId: query.locationId,
        zoneId: query.zoneId,
        checklistTemplateId: query.checklistTemplateId,
        from: query.from,
        to: query.to,
        assignedToUserId,
      },
      { page, limit },
      { view: query.view ?? 'full' },
    );
    return { items, total, page, limit };
  }

  async getRunById(ctx: { organizationId: string }, id: string) {
    const run = await this.repo.findRunById(ctx.organizationId, id);
    if (!run) throw new NotFoundException('Checklist run not found');
    return run;
  }

  async updateRunAssignment(
    ctx: { organizationId: string },
    runId: string,
    dto: UpdateChecklistRunAssignmentDto,
  ) {
    const existing = await this.repo.findRunById(ctx.organizationId, runId);
    if (!existing) throw new NotFoundException('Checklist run not found');

    if (existing.status === 'COMPLETED') {
      throw new BadRequestException(
        'Cannot change assignment: run is already completed',
      );
    }

    const assignedToUserId = dto.assignedToUserId ?? null;
    if (assignedToUserId != null) {
      const belongsToOrg = await this.usersService.belongsToOrganization(
        assignedToUserId,
        ctx.organizationId,
      );
      if (!belongsToOrg) {
        throw new BadRequestException(
          'Target user not found or does not belong to this organization',
        );
      }
    }

    const updated = await this.repo.updateAssignment(
      ctx.organizationId,
      runId,
      assignedToUserId,
    );
    if (!updated) throw new NotFoundException('Checklist run not found');
    return updated;
  }

  async updateRunItem(
    ctx: { organizationId: string; userId?: string },
    itemId: string,
    dto: UpdateRunItemDto,
  ) {
    const item = await this.repo.findRunItemById(ctx.organizationId, itemId);
    if (!item) throw new NotFoundException('Checklist run item not found');

    const run = item.checklistRun;
    if (run.status === 'COMPLETED') {
      throw new BadRequestException(
        'Cannot update item: run is already completed',
      );
    }
    if (run.status !== 'PENDING' && run.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        `Cannot update item: run status is ${run.status}`,
      );
    }

    if (run.status === 'PENDING') {
      await this.repo.markRunInProgress(
        ctx.organizationId,
        run.id,
        ctx.userId ?? null,
      );
    }

    const hasUpdate =
      dto.result !== undefined ||
      dto.valueJson !== undefined ||
      dto.comment !== undefined;
    if (!hasUpdate) {
      return this.repo.findRunItemById(ctx.organizationId, itemId);
    }

    const updated = await this.repo.updateRunItem(
      ctx.organizationId,
      itemId,
      {
        result: dto.result,
        valueJson: dto.valueJson as Prisma.JsonValue | undefined,
        comment: dto.comment,
        respondedAt: new Date(),
        respondedByUserId: ctx.userId ?? null,
      },
    );

    if (
      updated &&
      item.result !== 'FAIL' &&
      updated.result === 'FAIL'
    ) {
      const eventPayload: ChecklistRunItemFailedPayload = {
        checklistRunItemSnapshotId: updated.id,
        checklistRunId: updated.checklistRunId,
        checklistTemplateId: updated.checklistRun.checklistTemplateId,
        runNumber: updated.checklistRun.runNumber,
        label: updated.labelSnapshot,
        severity: updated.severitySnapshot,
        comment: updated.comment ?? null,
        brandId: updated.checklistRun.brandId ?? null,
        locationId: updated.checklistRun.locationId ?? null,
        zoneId: updated.checklistRun.zoneId ?? null,
        dueAt: updated.checklistRun.dueAt ?? null,
        templateNameSnapshot: updated.checklistRun.templateNameSnapshot,
        sectionTitle: updated.checklistRunSectionSnapshot?.titleSnapshot ?? null,
      };
      const event = createChecklistRunItemFailedEvent(
        ctx.organizationId,
        eventPayload,
      );
      await this.domainEvents.publish(event);
    }

    await this.audit.recordWrite(
      'CHECKLIST_RUN_ITEM_UPDATE',
      ctx,
      itemId,
      { after: updated },
    );
    return updated;
  }

  async submitRun(
    ctx: { organizationId: string; userId?: string },
    runId: string,
  ) {
    const run = await this.getRunById(ctx, runId);
    if (run.status === 'COMPLETED') {
      throw new BadRequestException('Run is already completed');
    }

    const unanswered = await this.repo.listRequiredUnansweredItems(
      ctx.organizationId,
      runId,
    );
    if (unanswered.length > 0) {
      throw new BadRequestException(
        `Cannot submit: ${unanswered.length} required item(s) unanswered: ${unanswered.map((i) => i.labelSnapshot).join(', ')}`,
      );
    }

    const failedWithCompliance = await this.repo.listFailedItemsWithComplianceRequirements(
      ctx.organizationId,
      runId,
    );
    const violations: string[] = [];
    for (const item of failedWithCompliance) {
      if (
        item.requiresEvidenceOnFailSnapshot &&
        item.attachmentCount === 0
      ) {
        violations.push(
          `"${item.labelSnapshot}": requires evidence (attachment) when result is FAIL`,
        );
      }
      if (
        item.requiresCommentOnFailSnapshot &&
        !(item.comment?.trim())
      ) {
        violations.push(
          `"${item.labelSnapshot}": requires comment when result is FAIL`,
        );
      }
    }
    if (violations.length > 0) {
      throw new BadRequestException(
        `Cannot submit: compliance rules not met for failed item(s): ${violations.join('; ')}`,
      );
    }

    const submitted = await this.repo.submitRun(
      ctx.organizationId,
      runId,
      ctx.userId ?? null,
    );

    if (submitted) {
      const event = createChecklistRunCompletedEvent(ctx.organizationId, {
        checklistRunId: submitted.id,
        runNumber: submitted.runNumber,
        checklistTemplateId: submitted.checklistTemplateId,
        templateNameSnapshot: submitted.templateNameSnapshot,
        performedByUserId: submitted.performedByUserId ?? null,
        brandId: submitted.brandId ?? null,
        locationId: submitted.locationId ?? null,
        zoneId: submitted.zoneId ?? null,
        dueAt: submitted.dueAt ?? null,
        completedAt: submitted.completedAt!,
      });
      await this.domainEvents.publish(event);
    }

    await this.audit.recordWrite(
      'CHECKLIST_RUN_SUBMIT',
      ctx,
      runId,
      { before: run, after: submitted },
    );
    return submitted;
  }

  async linkAttachmentToRunItem(
    ctx: { organizationId: string; userId?: string },
    itemId: string,
    dto: LinkAttachmentToRunItemDto,
  ) {
    const item = await this.repo.findRunItemById(ctx.organizationId, itemId);
    if (!item) throw new NotFoundException('Checklist run item not found');

    const run = item.checklistRun;
    if (run.status === 'COMPLETED') {
      throw new BadRequestException(
        'Cannot link attachment: run is already completed',
      );
    }
    if (run.status !== 'PENDING' && run.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        `Cannot link attachment: run status is ${run.status}`,
      );
    }

    return this.attachments.linkToChecklistRunItem(
      ctx,
      dto.attachmentId,
      itemId,
    );
  }

  /**
   * Upload evidence file for a checklist run item. Persists bytes, creates File and Attachment.
   */
  async uploadEvidence(
    ctx: { organizationId: string; userId?: string },
    itemId: string,
    file: EvidenceUploadFile,
  ) {
    const item = await this.repo.findRunItemById(ctx.organizationId, itemId);
    if (!item) throw new NotFoundException('Checklist run item not found');

    const run = item.checklistRun;
    if (run.status === 'COMPLETED') {
      throw new BadRequestException(
        'Cannot upload evidence: run is already completed',
      );
    }
    if (run.status !== 'PENDING' && run.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        `Cannot upload evidence: run status is ${run.status}`,
      );
    }

    this.filesService.validateEvidenceFile(file.mimetype, file.size);

    const bucket = 'uploads';
    const objectKey = `org/${ctx.organizationId}/${uuid()}/${file.originalname ?? 'file'}`;

    if (this.storage.saveBytes) {
      await this.storage.saveBytes(
        bucket,
        objectKey,
        file.buffer,
        file.mimetype,
      );
    } else {
      throw new BadRequestException(
        'Storage does not support direct file upload',
      );
    }

    const fileRecord = await this.filesService.registerFile(ctx, {
      bucket,
      objectKey,
      fileName: file.originalname ?? 'file',
      mimeType: file.mimetype,
      sizeBytes: file.size,
    });

    return this.attachments.create(ctx, {
      fileId: fileRecord.id,
      attachmentType: AttachmentType.EVIDENCE,
      checklistRunResponseId: itemId,
    });
  }

  async createTemperatureReadingForRunItem(
    ctx: { organizationId: string; userId?: string },
    itemId: string,
    dto: CreateTemperatureReadingForRunItemDto,
  ) {
    const item = await this.repo.findRunItemById(ctx.organizationId, itemId);
    if (!item) throw new NotFoundException('Checklist run item not found');

    const run = item.checklistRun;
    if (run.status === 'COMPLETED') {
      throw new BadRequestException(
        'Cannot add temperature reading: run is already completed',
      );
    }
    if (run.status !== 'PENDING' && run.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        `Cannot add temperature reading: run status is ${run.status}`,
      );
    }

    if (!run.locationId) {
      throw new BadRequestException(
        'Cannot add temperature reading: run has no location (required for scope validation)',
      );
    }

    const createAlert = (payload: Parameters<typeof this.alertEvents.createFromPayload>[0]) =>
      this.alertEvents.createFromPayload(payload);

    return this.temperatureReadings.create(
      ctx,
      {
        organizationId: ctx.organizationId,
        locationId: run.locationId,
        brandId: run.brandId ?? undefined,
        zoneId: dto.zoneId ?? run.zoneId ?? undefined,
        assetId: dto.assetId,
        policyId: dto.policyId,
        checklistRunId: run.id,
        checklistRunResponseId: itemId,
        sourceType: dto.sourceType ?? TemperatureSourceType.MANUAL,
        readingValue: dto.readingValue,
        unit: dto.unit,
        recordedAt: dto.recordedAt,
        rawPayloadJson: dto.rawPayloadJson,
      },
      createAlert,
    );
  }
}
