import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { Prisma } from '@prisma/client';

const RUN_INCLUDE = {
  sectionSnapshots: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      itemSnapshots: {
        orderBy: { sortOrder: 'asc' as const },
      },
    },
  },
} as const;

@Injectable()
export class ChecklistRunsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findTodayRuns(
    organizationId: string,
    filters: {
      status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
      brandId?: string;
      locationId?: string;
      zoneId?: string;
    },
    dateRange: { start: Date; end: Date },
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

    return this.prisma.checklistRun.findMany({
      where,
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
      include: RUN_INCLUDE,
    });
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
      respondedByUserId: string;
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
    userId: string,
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

  async submitRun(organizationId: string, runId: string, userId: string) {
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
}
