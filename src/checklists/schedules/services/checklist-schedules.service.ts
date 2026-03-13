import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ChecklistSchedulesRepository } from '../repositories/checklist-schedules.repository';
import { AuditLogsService } from '../../../audit/services/audit-logs.service';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { UpdateScheduleDto } from '../dto/update-schedule.dto';
import { ListSchedulesQueryDto } from '../dto/list-schedules.dto';

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
}
