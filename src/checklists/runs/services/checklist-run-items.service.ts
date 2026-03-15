import { Injectable } from '@nestjs/common';
import { ChecklistRunItemsRepository } from '../repositories/checklist-run-items.repository';
import { ListFailedChecklistRunItemsQueryDto } from '../dto/list-failed-checklist-run-items.dto';

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
