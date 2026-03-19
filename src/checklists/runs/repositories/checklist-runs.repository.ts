import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { Prisma } from '@prisma/client';

const RUN_INCLUDE = {
  sectionSnapshots: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      itemSnapshots: {
        orderBy: { sortOrder: 'asc' as const },
        include: {
          _count: { select: { attachments: true } },
        },
      },
    },
  },
} as const;

/** Run-level fields only; used for summary view to avoid loading sections/items */
const RUN_SUMMARY_SELECT = {
  id: true,
  organizationId: true,
  checklistTemplateId: true,
  checklistScheduleId: true,
  brandId: true,
  locationId: true,
  zoneId: true,
  runSource: true,
  status: true,
  dueAt: true,
  startedAt: true,
  completedAt: true,
  performedByUserId: true,
  runNumber: true,
  templateVersion: true,
  templateKeySnapshot: true,
  templateNameSnapshot: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class ChecklistRunsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Count runs matching today endpoint date semantics (dueAt or createdAt in range).
   */
  async countTodayRuns(
    organizationId: string,
    filters: {
      brandId?: string;
      locationId?: string;
      zoneId?: string;
    },
    dateRange: { start: Date; end: Date },
  ): Promise<number> {
    const where: Prisma.ChecklistRunWhereInput = {
      organizationId,
      OR: [
        { dueAt: { gte: dateRange.start, lte: dateRange.end } },
        {
          dueAt: null,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
      ],
    };
    if (filters.brandId != null) where.brandId = filters.brandId;
    if (filters.locationId != null) where.locationId = filters.locationId;
    if (filters.zoneId != null) where.zoneId = filters.zoneId;
    return this.prisma.checklistRun.count({ where });
  }

  /**
   * Count overdue runs (status PENDING/IN_PROGRESS, dueAt not null, dueAt < now).
   */
  async countOverdueRuns(
    organizationId: string,
    filters: {
      brandId?: string;
      locationId?: string;
      zoneId?: string;
    },
  ): Promise<number> {
    const now = new Date();
    const where: Prisma.ChecklistRunWhereInput = {
      organizationId,
      status: { in: ['PENDING', 'IN_PROGRESS'] },
      dueAt: { not: null, lt: now },
    };
    if (filters.brandId != null) where.brandId = filters.brandId;
    if (filters.locationId != null) where.locationId = filters.locationId;
    if (filters.zoneId != null) where.zoneId = filters.zoneId;
    return this.prisma.checklistRun.count({ where });
  }

  /**
   * Count runs with at least one itemSnapshot result = FAIL.
   */
  async countFailedRuns(
    organizationId: string,
    filters: {
      brandId?: string;
      locationId?: string;
      zoneId?: string;
    },
  ): Promise<number> {
    const where: Prisma.ChecklistRunWhereInput = {
      organizationId,
      itemSnapshots: { some: { result: 'FAIL' } },
    };
    if (filters.brandId != null) where.brandId = filters.brandId;
    if (filters.locationId != null) where.locationId = filters.locationId;
    if (filters.zoneId != null) where.zoneId = filters.zoneId;
    return this.prisma.checklistRun.count({ where });
  }

  async findTodayRuns(
    organizationId: string,
    filters: {
      status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
      brandId?: string;
      locationId?: string;
      zoneId?: string;
    },
    dateRange: { start: Date; end: Date },
    pagination: { page: number; limit: number },
    options?: { view?: 'full' | 'summary' },
  ) {
    const where: Prisma.ChecklistRunWhereInput = {
      organizationId,
      OR: [
        {
          dueAt: { gte: dateRange.start, lte: dateRange.end },
        },
        {
          dueAt: null,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
      ],
    };
    if (filters.status != null) where.status = filters.status;
    if (filters.brandId != null) where.brandId = filters.brandId;
    if (filters.locationId != null) where.locationId = filters.locationId;
    if (filters.zoneId != null) where.zoneId = filters.zoneId;

    const useSummary = options?.view === 'summary';
    const skip = (pagination.page - 1) * pagination.limit;
    const take = pagination.limit;
    const orderBy = [{ dueAt: 'asc' as const }, { createdAt: 'asc' as const }];

    const [items, total] = await Promise.all([
      useSummary
        ? this.prisma.checklistRun.findMany({
            where,
            orderBy,
            skip,
            take,
            select: RUN_SUMMARY_SELECT,
          })
        : this.prisma.checklistRun.findMany({
            where,
            orderBy,
            skip,
            take,
            include: RUN_INCLUDE,
          }),
      this.prisma.checklistRun.count({ where }),
    ]);

    return { items, total };
  }

  async findOverdueRuns(
    organizationId: string,
    filters: {
      brandId?: string;
      locationId?: string;
      zoneId?: string;
      checklistTemplateId?: string;
    },
    pagination: { page: number; limit: number },
    options?: { view?: 'full' | 'summary' },
  ) {
    const now = new Date();
    const where: Prisma.ChecklistRunWhereInput = {
      organizationId,
      status: { in: ['PENDING', 'IN_PROGRESS'] },
      dueAt: { not: null, lt: now },
    };
    if (filters.brandId != null) where.brandId = filters.brandId;
    if (filters.locationId != null) where.locationId = filters.locationId;
    if (filters.zoneId != null) where.zoneId = filters.zoneId;
    if (filters.checklistTemplateId != null)
      where.checklistTemplateId = filters.checklistTemplateId;

    const useSummary = options?.view === 'summary';
    const skip = (pagination.page - 1) * pagination.limit;
    const take = pagination.limit;
    const orderBy = [{ dueAt: 'asc' as const }, { createdAt: 'asc' as const }];

    const [items, total] = await Promise.all([
      useSummary
        ? this.prisma.checklistRun.findMany({
            where,
            orderBy,
            skip,
            take,
            select: RUN_SUMMARY_SELECT,
          })
        : this.prisma.checklistRun.findMany({
            where,
            orderBy,
            skip,
            take,
            include: RUN_INCLUDE,
          }),
      this.prisma.checklistRun.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Returns runs that have at least one item with result=FAIL.
   * Each run appears once (no duplicates). Date filters apply to run-level dueAt/createdAt.
   */
  async findFailedRuns(
    organizationId: string,
    filters: {
      brandId?: string;
      locationId?: string;
      zoneId?: string;
      checklistTemplateId?: string;
      from?: string;
      to?: string;
    },
    pagination: { page: number; limit: number },
    options?: { view?: 'full' | 'summary' },
  ) {
    const where: Prisma.ChecklistRunWhereInput = {
      organizationId,
      itemSnapshots: {
        some: { result: 'FAIL' },
      },
    };
    if (filters.brandId != null) where.brandId = filters.brandId;
    if (filters.locationId != null) where.locationId = filters.locationId;
    if (filters.zoneId != null) where.zoneId = filters.zoneId;
    if (filters.checklistTemplateId != null)
      where.checklistTemplateId = filters.checklistTemplateId;

    if (filters.from || filters.to) {
      const fromDate = filters.from ? new Date(filters.from) : undefined;
      const toDate = filters.to ? new Date(filters.to) : undefined;
      const dueAtFilter: Prisma.DateTimeNullableFilter = { not: null };
      if (fromDate) dueAtFilter.gte = fromDate;
      if (toDate) dueAtFilter.lte = toDate;
      const createdAtFilter: Prisma.DateTimeFilter = {};
      if (fromDate) createdAtFilter.gte = fromDate;
      if (toDate) createdAtFilter.lte = toDate;

      where.OR = [
        { dueAt: dueAtFilter },
        { dueAt: null, createdAt: createdAtFilter },
      ];
    }

    const useSummary = options?.view === 'summary';
    const skip = (pagination.page - 1) * pagination.limit;
    const take = pagination.limit;
    const orderBy = [{ createdAt: 'desc' as const }, { dueAt: 'desc' as const }];

    const [items, total] = await Promise.all([
      useSummary
        ? this.prisma.checklistRun.findMany({
            where,
            orderBy,
            skip,
            take,
            select: RUN_SUMMARY_SELECT,
          })
        : this.prisma.checklistRun.findMany({
            where,
            orderBy,
            skip,
            take,
            include: RUN_INCLUDE,
          }),
      this.prisma.checklistRun.count({ where }),
    ]);

    return { items, total };
  }

  async findRunById(organizationId: string, id: string) {
    return this.prisma.checklistRun.findFirst({
      where: { id, organizationId },
      include: RUN_INCLUDE,
    });
  }

  async findRunItemById(organizationId: string, itemId: string) {
    return this.prisma.checklistRunItemSnapshot.findFirst({
      where: { id: itemId, organizationId },
      include: {
        checklistRun: true,
        checklistRunSectionSnapshot: true,
      },
    });
  }

  async updateRunItem(
    organizationId: string,
    itemId: string,
    data: {
      result?: string;
      valueJson?: Prisma.JsonValue;
      comment?: string;
      respondedAt: Date;
      respondedByUserId: string | null;
    },
  ) {
    await this.prisma.checklistRunItemSnapshot.updateMany({
      where: { id: itemId, organizationId },
      data: {
        result: data.result ?? undefined,
        valueJson: data.valueJson ?? undefined,
        comment: data.comment ?? undefined,
        respondedAt: data.respondedAt,
        respondedByUserId: data.respondedByUserId,
      },
    });
    return this.findRunItemById(organizationId, itemId);
  }

  async markRunInProgress(
    organizationId: string,
    runId: string,
    userId: string | null,
  ) {
    const run = await this.prisma.checklistRun.findFirst({
      where: { id: runId, organizationId },
    });
    if (!run) return null;
    if (run.status !== 'PENDING') return run;

    await this.prisma.checklistRun.updateMany({
      where: { id: runId, organizationId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: run.startedAt ?? new Date(),
        performedByUserId: userId,
      },
    });
    return this.findRunById(organizationId, runId);
  }

  async submitRun(organizationId: string, runId: string, userId: string | null) {
    await this.prisma.checklistRun.updateMany({
      where: { id: runId, organizationId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        performedByUserId: userId,
      },
    });
    return this.findRunById(organizationId, runId);
  }

  async listRequiredUnansweredItems(
    organizationId: string,
    runId: string,
  ): Promise<Array<{ id: string; labelSnapshot: string }>> {
    const items = await this.prisma.checklistRunItemSnapshot.findMany({
      where: {
        organizationId,
        checklistRunId: runId,
        isRequiredSnapshot: true,
        respondedAt: null,
      },
      select: { id: true, labelSnapshot: true },
    });
    return items;
  }

  /**
   * Returns FAIL items that have compliance rules (requiresEvidenceOnFailSnapshot or requiresCommentOnFailSnapshot)
   * with attachment count for evidence validation.
   */
  async listFailedItemsWithComplianceRequirements(
    organizationId: string,
    runId: string,
  ): Promise<
    Array<{
      id: string;
      labelSnapshot: string;
      requiresEvidenceOnFailSnapshot: boolean;
      requiresCommentOnFailSnapshot: boolean;
      comment: string | null;
      attachmentCount: number;
    }>
  > {
    const items = await this.prisma.checklistRunItemSnapshot.findMany({
      where: {
        organizationId,
        checklistRunId: runId,
        result: 'FAIL',
        OR: [
          { requiresEvidenceOnFailSnapshot: true },
          { requiresCommentOnFailSnapshot: true },
        ],
      },
      select: {
        id: true,
        labelSnapshot: true,
        requiresEvidenceOnFailSnapshot: true,
        requiresCommentOnFailSnapshot: true,
        comment: true,
        _count: { select: { attachments: true } },
      },
    });
    return items.map((i) => ({
      id: i.id,
      labelSnapshot: i.labelSnapshot,
      requiresEvidenceOnFailSnapshot: i.requiresEvidenceOnFailSnapshot,
      requiresCommentOnFailSnapshot: i.requiresCommentOnFailSnapshot,
      comment: i.comment,
      attachmentCount: i._count.attachments,
    }));
  }
}
