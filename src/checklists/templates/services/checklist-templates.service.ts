import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ChecklistTemplatesRepository } from '../repositories/checklist-templates.repository';
import { AuditLogsService } from '../../../audit/services/audit-logs.service';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { ListTemplatesQueryDto } from '../dto/list-templates.dto';

@Injectable()
export class ChecklistTemplatesService {
  constructor(
    private readonly repo: ChecklistTemplatesRepository,
    private readonly audit: AuditLogsService,
  ) {}

  async create(
    ctx: { organizationId: string; userId?: string },
    dto: CreateTemplateDto,
  ) {
    const version = await this.repo.findNextVersion(
      ctx.organizationId,
      dto.templateKey,
    );

    const sections = (dto.sections ?? []).map((s) => ({
      title: s.title,
      description: s.description ?? null,
      sortOrder: s.sortOrder,
      items: (s.items ?? []).map((i) => ({
        itemType: i.itemType,
        label: i.label,
        helpText: i.helpText ?? null,
        isRequired: i.isRequired ?? true,
        requiresEvidenceOnFail: i.requiresEvidenceOnFail ?? false,
        requiresCommentOnFail: i.requiresCommentOnFail ?? false,
        failureCreatesIncident: i.failureCreatesIncident ?? false,
        configJson: (i.configJson ?? undefined) as Prisma.JsonValue | undefined,
        sortOrder: i.sortOrder,
      })),
    }));

    const created = await this.repo.create(ctx.organizationId, {
      templateKey: dto.templateKey,
      version,
      name: dto.name,
      description: dto.description ?? null,
      brandId: dto.brandId ?? null,
      locationId: dto.locationId ?? null,
      zoneId: dto.zoneId ?? null,
      sections,
    });

    if (!created) throw new NotFoundException('Template not found after create');
    await this.audit.recordWrite(
      'CHECKLIST_TEMPLATE_CREATE',
      ctx,
      created.id,
      { after: created },
    );
    return created;
  }

  async getById(ctx: { organizationId: string }, id: string) {
    const template = await this.repo.findById(ctx.organizationId, id);
    if (!template) throw new NotFoundException('Checklist template not found');
    return template;
  }

  async list(ctx: { organizationId: string }, query: ListTemplatesQueryDto) {
    const pagination = { page: query.page ?? 1, limit: query.limit ?? 25 };
    return this.repo.list(
      ctx.organizationId,
      {
        status: query.status,
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
    dto: UpdateTemplateDto,
  ) {
    const existing = await this.getById(ctx, id);
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(
        'Template can only be updated when status is DRAFT',
      );
    }

    const sections =
      dto.sections?.filter(
        (s) => s.title != null && s.sortOrder != null,
      ).map((s) => ({
        title: s.title as string,
        description: s.description ?? null,
        sortOrder: s.sortOrder as number,
        items: (s.items ?? [])
          .filter((i) => i.itemType != null && i.label != null && i.sortOrder != null)
          .map((i) => ({
            itemType: i.itemType as string,
            label: i.label as string,
            helpText: i.helpText ?? null,
            isRequired: i.isRequired ?? true,
            requiresEvidenceOnFail: i.requiresEvidenceOnFail ?? false,
            requiresCommentOnFail: i.requiresCommentOnFail ?? false,
            failureCreatesIncident: i.failureCreatesIncident ?? false,
            configJson: (i.configJson ?? undefined) as Prisma.JsonValue | undefined,
            sortOrder: i.sortOrder as number,
          })),
      })) ?? undefined;

    const updated = await this.repo.update(ctx.organizationId, id, {
      name: dto.name,
      description: dto.description,
      brandId: dto.brandId,
      locationId: dto.locationId,
      zoneId: dto.zoneId,
      sections,
    });

    if (updated) {
      await this.audit.recordWrite(
        'CHECKLIST_TEMPLATE_UPDATE',
        ctx,
        id,
        { before: existing, after: updated },
      );
    }
    return updated!;
  }

  async publish(ctx: { organizationId: string; userId?: string }, id: string) {
    const existing = await this.getById(ctx, id);
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(
        'Template can only be published when status is DRAFT',
      );
    }

    const published = await this.repo.publish(ctx.organizationId, id);
    if (published) {
      await this.audit.recordWrite(
        'CHECKLIST_TEMPLATE_PUBLISH',
        ctx,
        id,
        { before: existing, after: published },
      );
    }
    return published!;
  }

  async archive(ctx: { organizationId: string; userId?: string }, id: string) {
    const existing = await this.getById(ctx, id);
    const archived = await this.repo.archive(ctx.organizationId, id);
    if (archived) {
      await this.audit.recordWrite(
        'CHECKLIST_TEMPLATE_ARCHIVE',
        ctx,
        id,
        { before: existing, after: archived },
      );
    }
    return archived!;
  }
}
