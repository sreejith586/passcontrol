import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ChecklistSchedulesRepository } from '../repositories/checklist-schedules.repository';
import { AuditLogsService } from '../../../audit/services/audit-logs.service';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { UpdateScheduleDto } from '../dto/update-schedule.dto';
import { ListSchedulesQueryDto } from '../dto/list-schedules.dto';
import { GenerateRunDto } from '../dto/generate-run.dto';

@Injectable()
export class ChecklistSchedulesService {
  constructor(
    private readonly repo: ChecklistSchedulesRepository,
    private readonly audit: AuditLogsService,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    ctx: { organizationId: string; userId?: string },
    dto: CreateScheduleDto,
  ) {
    const template = await this.prisma.checklistTemplate.findFirst({
      where: {
        id: dto.checklistTemplateId,
        organizationId: ctx.organizationId,
        status: 'PUBLISHED',
      },
    });
    if (!template) {
      throw new BadRequestException(
        'Checklist template not found or not published',
      );
    }

    const created = await this.repo.create(ctx.organizationId, {
      checklistTemplateId: dto.checklistTemplateId,
      name: dto.name,
      timezone: dto.timezone,
      rrule: dto.rrule,
      brandId: dto.brandId ?? null,
      locationId: dto.locationId ?? null,
      zoneId: dto.zoneId ?? null,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
    });

    await this.audit.recordWrite(
      'CHECKLIST_SCHEDULE_CREATE',
      ctx,
      created.id,
      { after: created },
    );
    return created;
  }

  async getById(ctx: { organizationId: string }, id: string) {
    const schedule = await this.repo.findById(ctx.organizationId, id);
    if (!schedule) throw new NotFoundException('Checklist schedule not found');
    return schedule;
  }

  async list(ctx: { organizationId: string }, query: ListSchedulesQueryDto) {
    const pagination = { page: query.page ?? 1, limit: query.limit ?? 25 };
    return this.repo.list(
      ctx.organizationId,
      {
        checklistTemplateId: query.checklistTemplateId,
        isActive: query.isActive,
        brandId: query.brandId,
        locationId: query.locationId,
        zoneId: query.zoneId,
      },
      pagination,
    );
  }

  async update(
    ctx: { organizationId: string; userId?: string },
    id: string,
    dto: UpdateScheduleDto,
  ) {
    const existing = await this.getById(ctx, id);
    const updated = await this.repo.update(ctx.organizationId, id, {
      name: dto.name,
      timezone: dto.timezone,
      rrule: dto.rrule,
      brandId: dto.brandId,
      locationId: dto.locationId,
      zoneId: dto.zoneId,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
    });

    if (updated) {
      await this.audit.recordWrite(
        'CHECKLIST_SCHEDULE_UPDATE',
        ctx,
        id,
        { before: existing, after: updated },
      );
    }
    return updated!;
  }

  async activate(ctx: { organizationId: string; userId?: string }, id: string) {
    const existing = await this.getById(ctx, id);
    const activated = await this.repo.activate(ctx.organizationId, id);
    if (activated) {
      await this.audit.recordWrite(
        'CHECKLIST_SCHEDULE_ACTIVATE',
        ctx,
        id,
        { before: existing, after: activated },
      );
    }
    return activated!;
  }

  async deactivate(
    ctx: { organizationId: string; userId?: string },
    id: string,
  ) {
    const existing = await this.getById(ctx, id);
    const deactivated = await this.repo.deactivate(ctx.organizationId, id);
    if (deactivated) {
      await this.audit.recordWrite(
        'CHECKLIST_SCHEDULE_DEACTIVATE',
        ctx,
        id,
        { before: existing, after: deactivated },
      );
    }
    return deactivated!;
  }

  async generateRun(
    ctx: { organizationId: string; userId?: string },
    scheduleId: string,
    dto?: GenerateRunDto,
  ) {
    const schedule = await this.repo.findById(ctx.organizationId, scheduleId);
    if (!schedule) throw new NotFoundException('Checklist schedule not found');

    const template = await this.prisma.checklistTemplate.findFirst({
      where: {
        id: schedule.checklistTemplateId,
        organizationId: ctx.organizationId,
        status: 'PUBLISHED',
      },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' as const },
          include: {
            items: { orderBy: { sortOrder: 'asc' as const } },
          },
        },
      },
    });

    if (!template) {
      throw new BadRequestException(
        'Checklist template not found or not published',
      );
    }

    const dueAt = dto?.dueAt
      ? new Date(dto.dueAt)
      : schedule.nextRunAt ?? new Date();

    const dayStart = new Date(dueAt);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dueAt);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const existingRun = await this.prisma.checklistRun.findFirst({
      where: {
        organizationId: ctx.organizationId,
        checklistScheduleId: scheduleId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        OR: [
          { dueAt: { gte: dayStart, lte: dayEnd } },
          {
            dueAt: null,
            createdAt: { gte: dayStart, lte: dayEnd },
          },
        ],
      },
    });

    if (existingRun) {
      throw new BadRequestException(
        'A PENDING or IN_PROGRESS run already exists for this schedule on the same day',
      );
    }

    const maxRun = await this.prisma.checklistRun.aggregate({
      where: { organizationId: ctx.organizationId },
      _max: { runNumber: true },
    });
    const runNumber = (maxRun._max.runNumber ?? 0) + 1;

    const run = await this.prisma.$transaction(async (tx) => {
      const created = await tx.checklistRun.create({
        data: {
          organizationId: ctx.organizationId,
          checklistTemplateId: template.id,
          checklistScheduleId: scheduleId,
          brandId: schedule.brandId,
          locationId: schedule.locationId,
          zoneId: schedule.zoneId,
          runSource: 'SCHEDULE',
          status: 'PENDING',
          dueAt,
          runNumber,
          templateVersion: template.version,
          templateKeySnapshot: template.templateKey,
          templateNameSnapshot: template.name,
        },
      });

      for (const section of template.sections) {
        const sectionSnapshot = await tx.checklistRunSectionSnapshot.create({
          data: {
            organizationId: ctx.organizationId,
            checklistRunId: created.id,
            checklistTemplateSectionId: section.id,
            titleSnapshot: section.title,
            descriptionSnapshot: section.description,
            sortOrder: section.sortOrder,
          },
        });

        for (const item of section.items) {
          await tx.checklistRunItemSnapshot.create({
            data: {
              organizationId: ctx.organizationId,
              checklistRunId: created.id,
              checklistRunSectionSnapshotId: sectionSnapshot.id,
              checklistTemplateItemId: item.id,
              itemTypeSnapshot: item.itemType,
              labelSnapshot: item.label,
              helpTextSnapshot: item.helpText,
              isRequiredSnapshot: item.isRequired,
              requiresEvidenceOnFailSnapshot: item.requiresEvidenceOnFail,
              failureCreatesIncidentSnapshot: item.failureCreatesIncident,
              configSnapshotJson: item.configJson ?? Prisma.JsonNull,
              sortOrder: item.sortOrder,
            },
          });
        }
      }

      return tx.checklistRun.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          sectionSnapshots: {
            orderBy: { sortOrder: 'asc' as const },
            include: {
              itemSnapshots: { orderBy: { sortOrder: 'asc' as const } },
            },
          },
        },
      });
    });

    await this.audit.recordWrite(
      'CHECKLIST_RUN_GENERATE',
      ctx,
      run.id,
      { after: run },
    );

    return run;
  }
}
