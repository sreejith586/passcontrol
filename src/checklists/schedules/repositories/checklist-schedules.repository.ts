import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { Prisma } from '@prisma/client';

const SCHEDULE_INCLUDE = {
  checklistTemplate: {
    select: {
      id: true,
      templateKey: true,
      name: true,
      version: true,
      status: true,
    },
  },
  ownerUser: {
    select: { id: true, name: true },
  },
  watchers: {
    select: {
      userId: true,
      user: { select: { id: true, name: true } },
    },
  },
} as const;

@Injectable()
export class ChecklistSchedulesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    data: {
      checklistTemplateId: string;
      name: string;
      timezone: string;
      rrule: string;
      brandId?: string | null;
      locationId?: string | null;
      zoneId?: string | null;
      ownerUserId?: string | null;
      startsAt?: Date | null;
      endsAt?: Date | null;
      watcherUserIds?: string[];
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.checklistSchedule.create({
        data: {
          organizationId,
          checklistTemplateId: data.checklistTemplateId,
          name: data.name,
          timezone: data.timezone,
          rrule: data.rrule,
          brandId: data.brandId ?? null,
          locationId: data.locationId ?? null,
          zoneId: data.zoneId ?? null,
          ownerUserId: data.ownerUserId ?? null,
          startsAt: data.startsAt ?? null,
          endsAt: data.endsAt ?? null,
          isActive: true,
        },
      });
      const uniqueWatcherIds = [...new Set(data.watcherUserIds ?? [])].filter(Boolean);
      for (const userId of uniqueWatcherIds) {
        await tx.checklistScheduleWatcher.create({
          data: {
            organizationId,
            checklistScheduleId: created.id,
            userId,
          },
        });
      }
      return tx.checklistSchedule.findUniqueOrThrow({
        where: { id: created.id },
        include: SCHEDULE_INCLUDE,
      });
    });
  }

  async findById(organizationId: string, id: string) {
    return this.prisma.checklistSchedule.findFirst({
      where: { id, organizationId },
      include: SCHEDULE_INCLUDE,
    });
  }

  async list(
    organizationId: string,
    filters: {
      checklistTemplateId?: string;
      isActive?: boolean;
      brandId?: string;
      locationId?: string;
      zoneId?: string;
    },
    pagination: { page: number; limit: number },
  ) {
    const where: Prisma.ChecklistScheduleWhereInput = { organizationId };
    if (filters.checklistTemplateId != null)
      where.checklistTemplateId = filters.checklistTemplateId;
    if (filters.isActive != null) where.isActive = filters.isActive;
    if (filters.brandId != null) where.brandId = filters.brandId;
    if (filters.locationId != null) where.locationId = filters.locationId;
    if (filters.zoneId != null) where.zoneId = filters.zoneId;

    return this.prisma.checklistSchedule.findMany({
      where,
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      orderBy: { createdAt: 'desc' },
      include: SCHEDULE_INCLUDE,
    });
  }

  async update(
    organizationId: string,
    id: string,
    data: {
      name?: string;
      timezone?: string;
      rrule?: string;
      brandId?: string | null;
      locationId?: string | null;
      zoneId?: string | null;
      ownerUserId?: string | null;
      startsAt?: Date | null;
      endsAt?: Date | null;
      watcherUserIds?: string[];
    },
  ) {
    const updateData: Prisma.ChecklistScheduleUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    if (data.rrule !== undefined) updateData.rrule = data.rrule;
    if (data.brandId !== undefined) updateData.brandId = data.brandId;
    if (data.locationId !== undefined) updateData.locationId = data.locationId;
    if (data.zoneId !== undefined) updateData.zoneId = data.zoneId;
    if (data.ownerUserId !== undefined) {
      updateData.ownerUser =
        data.ownerUserId != null
          ? { connect: { id: data.ownerUserId } }
          : { disconnect: true };
    }
    if (data.startsAt !== undefined) updateData.startsAt = data.startsAt;
    if (data.endsAt !== undefined) updateData.endsAt = data.endsAt;

    const existing = await this.prisma.checklistSchedule.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Checklist schedule not found');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.checklistSchedule.update({
        where: { id },
        data: updateData,
      });
      if (data.watcherUserIds !== undefined) {
        await tx.checklistScheduleWatcher.deleteMany({
          where: { checklistScheduleId: id },
        });
        const uniqueIds = [...new Set(data.watcherUserIds)].filter(Boolean);
        for (const userId of uniqueIds) {
          await tx.checklistScheduleWatcher.create({
            data: {
              organizationId,
              checklistScheduleId: id,
              userId,
            },
          });
        }
      }
      return tx.checklistSchedule.findUniqueOrThrow({
        where: { id },
        include: SCHEDULE_INCLUDE,
      });
    });
  }

  async activate(organizationId: string, id: string) {
    await this.prisma.checklistSchedule.updateMany({
      where: { id, organizationId },
      data: { isActive: true },
    });
    return this.findById(organizationId, id);
  }

  async deactivate(organizationId: string, id: string) {
    await this.prisma.checklistSchedule.updateMany({
      where: { id, organizationId },
      data: { isActive: false },
    });
    return this.findById(organizationId, id);
  }

  async findDueSchedules(now: Date, limit: number) {
    return this.prisma.checklistSchedule.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now, not: null },
        OR: [
          { nextGenerationAttemptAt: null },
          { nextGenerationAttemptAt: { lte: now } },
        ],
      },
      orderBy: { nextRunAt: 'asc' },
      take: limit,
      include: SCHEDULE_INCLUDE,
    });
  }

  async updateNextGenerationAttemptAt(
    organizationId: string,
    scheduleId: string,
    nextGenerationAttemptAt: Date | null,
  ) {
    await this.prisma.checklistSchedule.updateMany({
      where: { id: scheduleId, organizationId },
      data: { nextGenerationAttemptAt },
    });
  }

  /**
   * Returns watcher user IDs for the schedule linked to the given run.
   * Returns [] if run has no schedule or schedule has no watchers.
   */
  async getWatcherUserIdsForRun(
    organizationId: string,
    runId: string,
  ): Promise<string[]> {
    const run = await this.prisma.checklistRun.findFirst({
      where: { id: runId, organizationId },
      select: { checklistScheduleId: true },
    });
    if (!run?.checklistScheduleId) return [];
    const watchers = await this.prisma.checklistScheduleWatcher.findMany({
      where: {
        checklistScheduleId: run.checklistScheduleId,
        organizationId,
      },
      select: { userId: true },
    });
    return watchers.map((w) => w.userId);
  }

  /**
   * Returns a map of scheduleId -> userId[] for batch watcher resolution.
   * Only includes schedule IDs that have watchers.
   */
  async getWatcherUserIdsByScheduleIds(
    organizationId: string,
    scheduleIds: string[],
  ): Promise<Map<string, string[]>> {
    const unique = [...new Set(scheduleIds)].filter(Boolean);
    if (unique.length === 0) return new Map();
    const rows = await this.prisma.checklistScheduleWatcher.findMany({
      where: {
        checklistScheduleId: { in: unique },
        organizationId,
      },
      select: { checklistScheduleId: true, userId: true },
    });
    const map = new Map<string, string[]>();
    for (const row of rows) {
      const existing = map.get(row.checklistScheduleId) ?? [];
      existing.push(row.userId);
      map.set(row.checklistScheduleId, existing);
    }
    return map;
  }

  async updateNextRunAt(
    organizationId: string,
    scheduleId: string,
    nextRunAt: Date | null,
  ) {
    await this.prisma.checklistSchedule.updateMany({
      where: { id: scheduleId, organizationId },
      data: { nextRunAt },
    });
  }

  async updateGenerationStatus(
    organizationId: string,
    scheduleId: string,
    status: string,
    error?: string,
  ) {
    const now = new Date();
    await this.prisma.checklistSchedule.updateMany({
      where: { id: scheduleId, organizationId },
      data: {
        lastGenerationAttemptAt: now,
        lastGenerationStatus: status,
        lastGenerationError: error ?? null,
      },
    });
  }
}
