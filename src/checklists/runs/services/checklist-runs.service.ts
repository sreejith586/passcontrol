import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DateTime } from 'luxon';
import { Prisma } from '@prisma/client';
import { ChecklistRunsRepository } from '../repositories/checklist-runs.repository';
import { AuditLogsService } from '../../../audit/services/audit-logs.service';
import { AlertEventsService } from '../../../alert-events/services/alert-events.service';
import { AttachmentsService } from '../../../attachments/services/attachments.service';
import { TemperatureReadingsService } from '../../../temperature/services/temperature-readings.service';
import { ListTodayRunsQueryDto } from '../dto/list-today-runs.dto';
import { UpdateRunItemDto } from '../dto/update-run-item.dto';
import { LinkAttachmentToRunItemDto } from '../dto/link-attachment-to-run-item.dto';
import { CreateTemperatureReadingForRunItemDto } from '../dto/create-temperature-reading-for-run-item.dto';
import { TemperatureSourceType } from '../../../temperature/enums/source-type.enum';

@Injectable()
export class ChecklistRunsService {
  constructor(
    private readonly repo: ChecklistRunsRepository,
    private readonly audit: AuditLogsService,
    private readonly alertEvents: AlertEventsService,
    private readonly attachments: AttachmentsService,
    private readonly temperatureReadings: TemperatureReadingsService,
  ) {}

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

  async getTodayRuns(
    ctx: { organizationId: string },
    query: ListTodayRunsQueryDto,
  ) {
    const { start, end } = this.getDateRange(query.timezone, query.date);
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const { items, total } = await this.repo.findTodayRuns(
      ctx.organizationId,
      {
        status: query.status,
        brandId: query.brandId,
        locationId: query.locationId,
        zoneId: query.zoneId,
      },
      { start, end },
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
        ctx.userId ?? '',
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
        respondedByUserId: ctx.userId ?? '',
      },
    );

    if (
      updated &&
      item.result !== 'FAIL' &&
      updated.result === 'FAIL'
    ) {
      await this.alertEvents.createFromPayload({
        organizationId: ctx.organizationId,
        sourceType: 'CHECKLIST_RUN_ITEM',
        sourceId: updated.id,
        type: 'CHECKLIST_ITEM_FAIL',
        severity: updated.severitySnapshot,
        scope: {
          brandId: updated.checklistRun.brandId ?? undefined,
          locationId: updated.checklistRun.locationId ?? undefined,
          zoneId: updated.checklistRun.zoneId ?? undefined,
        },
        payload: {
          runId: updated.checklistRunId,
          checklistRunItemSnapshotId: updated.id,
          templateNameSnapshot: updated.checklistRun.templateNameSnapshot,
          sectionTitle: updated.checklistRunSectionSnapshot?.titleSnapshot,
          label: updated.labelSnapshot,
          result: updated.result,
          comment: updated.comment ?? undefined,
          severity: updated.severitySnapshot,
        },
      });
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
      ctx.userId ?? '',
    );

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
