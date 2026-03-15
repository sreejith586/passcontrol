import { Injectable, NotFoundException } from '@nestjs/common';
import { ChecklistRunItemsRepository } from '../repositories/checklist-run-items.repository';
import { ListFailedChecklistRunItemsQueryDto } from '../dto/list-failed-checklist-run-items.dto';

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

  async getFailedItems(
    ctx: { organizationId: string },
    query: ListFailedChecklistRunItemsQueryDto,
  ): Promise<{
    items: FailedRunItemResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const pagination = { page, limit };

    const filters = {
      brandId: query.brandId,
      locationId: query.locationId,
      zoneId: query.zoneId,
      checklistTemplateId: query.checklistTemplateId,
      severity: query.severity,
      from: query.from,
      to: query.to,
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
