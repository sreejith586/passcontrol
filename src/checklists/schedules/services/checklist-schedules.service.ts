import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ChecklistSchedulesRepository } from '../repositories/checklist-schedules.repository';
import { ChecklistScheduleRecurrenceService } from './checklist-schedule-recurrence.service';
import { AuditLogsService } from '../../../audit/services/audit-logs.service';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { ScopeValidationService } from '../../../common/scope-validation/scope-validation.service';
import { UsersService } from '../../../users/services/users.service';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { UpdateScheduleDto } from '../dto/update-schedule.dto';
import { ListSchedulesQueryDto } from '../dto/list-schedules.dto';
import { GenerateRunDto } from '../dto/generate-run.dto';
import { PreviewNextRunDto } from '../dto/preview-next-run.dto';
import {
  validateRrule,
  validateTimezone,
  validateStartsAtEndsAt,
} from '../validators/schedule-recurrence.validator';

@Injectable()
export class ChecklistSchedulesService {
  constructor(
    private readonly repo: ChecklistSchedulesRepository,
    private readonly recurrence: ChecklistScheduleRecurrenceService,
    private readonly audit: AuditLogsService,
    private readonly prisma: PrismaService,
    private readonly scopeValidation: ScopeValidationService,
    private readonly usersService: UsersService,
  ) {}

  async create(
    ctx: { organizationId: string; userId?: string },
    dto: CreateScheduleDto,
  ) {
    validateRrule(dto.rrule);
    validateTimezone(dto.timezone);
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    validateStartsAtEndsAt(startsAt, endsAt);

    await this.scopeValidation.validate(ctx.organizationId, {
      brandId: dto.brandId ?? null,
      locationId: dto.locationId ?? null,
      zoneId: dto.zoneId ?? null,
    });

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

    if (dto.ownerUserId) {
      const belongsToOrg = await this.usersService.belongsToOrganization(
        dto.ownerUserId,
        ctx.organizationId,
      );
      if (!belongsToOrg) {
        throw new BadRequestException(
          'Owner user not found or does not belong to this organization',
        );
      }
    }

    const watcherUserIds = [...new Set(dto.watcherUserIds ?? [])].filter(Boolean);
    for (const userId of watcherUserIds) {
      const belongsToOrg = await this.usersService.belongsToOrganization(
        userId,
        ctx.organizationId,
      );
      if (!belongsToOrg) {
        throw new BadRequestException(
          `Watcher user ${userId} not found or does not belong to this organization`,
        );
      }
    }

    const created = await this.repo.create(ctx.organizationId, {
      checklistTemplateId: dto.checklistTemplateId,
      name: dto.name,
      timezone: dto.timezone,
      rrule: dto.rrule,
      brandId: dto.brandId ?? null,
      locationId: dto.locationId ?? null,
      zoneId: dto.zoneId ?? null,
      ownerUserId: dto.ownerUserId ?? null,
      startsAt,
      endsAt,
      watcherUserIds,
    });

    const nextRunAt = this.recurrence.computeNextRunAt(
      {
        rrule: created.rrule,
        timezone: created.timezone,
        startsAt: created.startsAt,
        endsAt: created.endsAt,
      },
      new Date(),
    );
    await this.repo.updateNextRunAt(
      ctx.organizationId,
      created.id,
      nextRunAt,
    );

    const final = await this.repo.findById(ctx.organizationId, created.id);
    await this.audit.recordWrite(
      'CHECKLIST_SCHEDULE_CREATE',
      ctx,
      created.id,
      { after: final ?? created },
    );
    return final ?? created;
  }

  /**
   * Preview next run for draft schedule config. No DB calls, no org scoping.
   * Invalid RRULE returns null (does not throw).
   */
  previewNextRun(dto: PreviewNextRunDto): { nextRunAt: string | null } {
    validateTimezone(dto.timezone);
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    validateStartsAtEndsAt(startsAt, endsAt);

    const next = this.recurrence.computeNextRunAt(
      {
        rrule: dto.rrule,
        timezone: dto.timezone,
        startsAt,
        endsAt,
      },
      new Date(),
    );
    return { nextRunAt: next?.toISOString() ?? null };
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

    const effectiveScope = {
      brandId: dto.brandId !== undefined ? dto.brandId : existing.brandId,
      locationId: dto.locationId !== undefined ? dto.locationId : existing.locationId,
      zoneId: dto.zoneId !== undefined ? dto.zoneId : existing.zoneId,
    };
    await this.scopeValidation.validate(ctx.organizationId, effectiveScope);

    if (dto.rrule !== undefined) validateRrule(dto.rrule);
    if (dto.timezone !== undefined) validateTimezone(dto.timezone);
    const effectiveStartsAt =
      dto.startsAt !== undefined
        ? (dto.startsAt ? new Date(dto.startsAt) : null)
        : existing.startsAt;
    const effectiveEndsAt =
      dto.endsAt !== undefined
        ? (dto.endsAt ? new Date(dto.endsAt) : null)
        : existing.endsAt;
    validateStartsAtEndsAt(effectiveStartsAt, effectiveEndsAt);

    if (dto.ownerUserId !== undefined && dto.ownerUserId != null) {
      const belongsToOrg = await this.usersService.belongsToOrganization(
        dto.ownerUserId,
        ctx.organizationId,
      );
      if (!belongsToOrg) {
        throw new BadRequestException(
          'Owner user not found or does not belong to this organization',
        );
      }
    }

    const watcherUserIds =
      dto.watcherUserIds !== undefined
        ? [...new Set(dto.watcherUserIds)].filter(Boolean)
        : undefined;
    if (watcherUserIds !== undefined) {
      for (const userId of watcherUserIds) {
        const belongsToOrg = await this.usersService.belongsToOrganization(
          userId,
          ctx.organizationId,
        );
        if (!belongsToOrg) {
          throw new BadRequestException(
            `Watcher user ${userId} not found or does not belong to this organization`,
          );
        }
      }
    }

    const updated = await this.repo.update(ctx.organizationId, id, {
      name: dto.name,
      timezone: dto.timezone,
      rrule: dto.rrule,
      brandId: dto.brandId,
      locationId: dto.locationId,
      zoneId: dto.zoneId,
      ownerUserId: dto.ownerUserId,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      watcherUserIds,
    });

    const recurrenceFieldsChanged =
      dto.rrule !== undefined ||
      dto.timezone !== undefined ||
      dto.startsAt !== undefined ||
      dto.endsAt !== undefined;
    if (updated && recurrenceFieldsChanged) {
      const nextRunAt = this.recurrence.computeNextRunAt(
        {
          rrule: updated.rrule,
          timezone: updated.timezone,
          startsAt: updated.startsAt,
          endsAt: updated.endsAt,
        },
        new Date(),
      );
      await this.repo.updateNextRunAt(ctx.organizationId, id, nextRunAt);
      const final = await this.repo.findById(ctx.organizationId, id);
      await this.audit.recordWrite(
        'CHECKLIST_SCHEDULE_UPDATE',
        ctx,
        id,
        { before: existing, after: final ?? updated },
      );
      return final ?? updated;
    }

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
      const nextRunAt = this.recurrence.computeNextRunAt(
        {
          rrule: activated.rrule,
          timezone: activated.timezone,
          startsAt: activated.startsAt,
          endsAt: activated.endsAt,
        },
        new Date(),
      );
      await this.repo.updateNextRunAt(ctx.organizationId, id, nextRunAt);
      const final = await this.repo.findById(ctx.organizationId, id);
      await this.audit.recordWrite(
        'CHECKLIST_SCHEDULE_ACTIVATE',
        ctx,
        id,
        { before: existing, after: final ?? activated },
      );
      return final ?? activated;
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

  /**
   * Skip reasons for generateRunCore (used by cron for failure classification):
   * - duplicate: run already exists for same schedule+day
   * - template_not_found: schedule or template missing/deleted
   * - template_not_published: template exists but status != PUBLISHED
   * - schedule_ended: schedule.endsAt has passed
   * - transient_error: thrown (not returned); cron retries next tick
   */
  async generateRunCore(
    organizationId: string,
    scheduleId: string,
    dueAt?: Date,
    duplicatePolicy: 'ACTIVE_ONLY' | 'ANY_SAME_DAY' = 'ACTIVE_ONLY',
  ) {
    const schedule = await this.repo.findById(organizationId, scheduleId);
    if (!schedule) return { skipped: 'template_not_found' };

    const effectiveDueAt = dueAt ?? schedule.nextRunAt ?? new Date();

    if (schedule.endsAt && schedule.endsAt < effectiveDueAt) {
      return { skipped: 'schedule_ended' };
    }

    const template = await this.prisma.checklistTemplate.findFirst({
      where: {
        id: schedule.checklistTemplateId,
        organizationId,
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

    if (!template) return { skipped: 'template_not_found' };
    if (template.status !== 'PUBLISHED') {
      return { skipped: 'template_not_published' };
    }

    const dayStart = new Date(effectiveDueAt);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(effectiveDueAt);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const where: Prisma.ChecklistRunWhereInput = {
      organizationId,
      checklistScheduleId: scheduleId,
      OR: [
        { dueAt: { gte: dayStart, lte: dayEnd } },
        {
          dueAt: null,
          createdAt: { gte: dayStart, lte: dayEnd },
        },
      ],
      ...(duplicatePolicy === 'ACTIVE_ONLY' && {
        status: { in: ['PENDING', 'IN_PROGRESS'] as const },
      }),
    };
    const existingRun = await this.prisma.checklistRun.findFirst({ where });

    if (existingRun) return { skipped: 'duplicate' };

    const run = await this.prisma.$transaction(async (tx) => {
      // Advisory lock per org to prevent concurrent runNumber collisions.
      // pg_advisory_xact_lock releases automatically at transaction end.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(('run_' || ${organizationId})::text))`;

      const maxRun = await tx.checklistRun.aggregate({
        where: { organizationId },
        _max: { runNumber: true },
      });
      const runNumber = (maxRun._max.runNumber ?? 0) + 1;

      const created = await tx.checklistRun.create({
        data: {
          organizationId,
          checklistTemplateId: template.id,
          checklistScheduleId: scheduleId,
          brandId: schedule.brandId,
          locationId: schedule.locationId,
          zoneId: schedule.zoneId,
          assignedToUserId: schedule.ownerUserId ?? null,
          runSource: 'SCHEDULE',
          status: 'PENDING',
          dueAt: effectiveDueAt,
          runNumber,
          templateVersion: template.version,
          templateKeySnapshot: template.templateKey,
          templateNameSnapshot: template.name,
        },
      });

      for (const section of template.sections) {
        const sectionSnapshot = await tx.checklistRunSectionSnapshot.create({
          data: {
            organizationId,
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
              organizationId,
              checklistRunId: created.id,
              checklistRunSectionSnapshotId: sectionSnapshot.id,
              checklistTemplateItemId: item.id,
              itemTypeSnapshot: item.itemType,
              labelSnapshot: item.label,
              helpTextSnapshot: item.helpText,
              isRequiredSnapshot: item.isRequired,
              requiresEvidenceOnFailSnapshot: item.requiresEvidenceOnFail,
              requiresCommentOnFailSnapshot: item.requiresCommentOnFail,
              severitySnapshot: item.severity,
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
          assignedToUser: {
            select: { id: true, name: true },
          },
          sectionSnapshots: {
            orderBy: { sortOrder: 'asc' as const },
            include: {
              itemSnapshots: { orderBy: { sortOrder: 'asc' as const } },
            },
          },
        },
      });
    });

    return { run };
  }

  async generateRun(
    ctx: { organizationId: string; userId?: string },
    scheduleId: string,
    dto?: GenerateRunDto,
  ) {
    const schedule = await this.repo.findById(ctx.organizationId, scheduleId);
    if (!schedule) throw new NotFoundException('Checklist schedule not found');

    const dueAt = dto?.dueAt
      ? new Date(dto.dueAt)
      : schedule.nextRunAt ?? undefined;

    const result = await this.generateRunCore(
      ctx.organizationId,
      scheduleId,
      dueAt,
    );

    if ('skipped' in result) {
      if (result.skipped === 'duplicate') {
        throw new BadRequestException(
          'A PENDING or IN_PROGRESS run already exists for this schedule on the same day',
        );
      }
      if (result.skipped === 'schedule_ended') {
        throw new BadRequestException('Schedule has ended');
      }
      throw new BadRequestException(
        'Checklist template not found or not published',
      );
    }

    const run = result.run!;
    const referenceDate = run.dueAt ?? schedule.nextRunAt ?? new Date();
    const nextRunAt = this.recurrence.computeNextRunAt(
      {
        rrule: schedule.rrule,
        timezone: schedule.timezone,
        startsAt: schedule.startsAt,
        endsAt: schedule.endsAt,
      },
      referenceDate,
      { inclusive: false },
    );
    await this.repo.updateNextRunAt(ctx.organizationId, scheduleId, nextRunAt);

    await this.audit.recordWrite(
      'CHECKLIST_RUN_GENERATE',
      ctx,
      run.id,
      { after: run },
    );

    return run;
  }
}
