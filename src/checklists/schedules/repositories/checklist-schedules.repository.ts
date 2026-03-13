import { Injectable } from '@nestjs/common';
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
      startsAt?: Date | null;
      endsAt?: Date | null;
    },
  ) {
    return this.prisma.checklistSchedule.create({
      data: {
        organizationId,
        checklistTemplateId: data.checklistTemplateId,
        name: data.name,
        timezone: data.timezone,
        rrule: data.rrule,
        brandId: data.brandId ?? null,
        locationId: data.locationId ?? null,
        zoneId: data.zoneId ?? null,
        startsAt: data.startsAt ?? null,
        endsAt: data.endsAt ?? null,
        isActive: true,
      },
      include: SCHEDULE_INCLUDE,
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
      startsAt?: Date | null;
      endsAt?: Date | null;
    },
  ) {
    const updateData: Prisma.ChecklistScheduleUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    if (data.rrule !== undefined) updateData.rrule = data.rrule;
    if (data.brandId !== undefined) updateData.brandId = data.brandId;
    if (data.locationId !== undefined) updateData.locationId = data.locationId;
    if (data.zoneId !== undefined) updateData.zoneId = data.zoneId;
    if (data.startsAt !== undefined) updateData.startsAt = data.startsAt;
    if (data.endsAt !== undefined) updateData.endsAt = data.endsAt;

    await this.prisma.checklistSchedule.updateMany({
      where: { id, organizationId },
      data: updateData,
    });
    return this.findById(organizationId, id);
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
}
