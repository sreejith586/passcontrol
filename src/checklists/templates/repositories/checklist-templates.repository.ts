import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { Prisma } from '@prisma/client';

const TEMPLATE_INCLUDE = {
  sections: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      items: {
        orderBy: { sortOrder: 'asc' as const },
      },
    },
  },
} as const;

@Injectable()
export class ChecklistTemplatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    data: {
      templateKey: string;
      version: number;
      name: string;
      description?: string | null;
      brandId?: string | null;
      locationId?: string | null;
      zoneId?: string | null;
      sections?: Array<{
        title: string;
        description?: string | null;
        sortOrder: number;
        items: Array<{
          itemType: string;
          label: string;
          helpText?: string | null;
          isRequired: boolean;
          requiresEvidenceOnFail: boolean;
          requiresCommentOnFail: boolean;
          failureCreatesIncident: boolean;
          configJson?: Prisma.JsonValue;
          sortOrder: number;
        }>;
      }>;
    },
  ) {
    const template = await this.prisma.checklistTemplate.create({
      data: {
        organizationId,
        templateKey: data.templateKey,
        version: data.version,
        name: data.name,
        description: data.description ?? null,
        brandId: data.brandId ?? null,
        locationId: data.locationId ?? null,
        zoneId: data.zoneId ?? null,
        status: 'DRAFT',
        isLatest: false,
      },
    });

    if (data.sections?.length) {
      for (const s of data.sections) {
        const section = await this.prisma.checklistTemplateSection.create({
          data: {
            organizationId,
            checklistTemplateId: template.id,
            title: s.title,
            description: s.description ?? null,
            sortOrder: s.sortOrder,
          },
        });
        if (s.items?.length) {
          await this.prisma.checklistTemplateItem.createMany({
            data: s.items.map((i) => ({
              organizationId,
              checklistTemplateId: template.id,
              checklistTemplateSectionId: section.id,
              itemType: i.itemType,
              label: i.label,
              helpText: i.helpText ?? null,
              isRequired: i.isRequired ?? true,
              requiresEvidenceOnFail: i.requiresEvidenceOnFail ?? false,
              requiresCommentOnFail: i.requiresCommentOnFail ?? false,
              failureCreatesIncident: i.failureCreatesIncident ?? false,
              configJson: i.configJson ?? Prisma.JsonNull,
              sortOrder: i.sortOrder,
            })),
          });
        }
      }
    }

    return this.findById(organizationId, template.id);
  }

  async findById(organizationId: string, id: string) {
    return this.prisma.checklistTemplate.findFirst({
      where: { id, organizationId },
      include: TEMPLATE_INCLUDE,
    });
  }

  async findNextVersion(organizationId: string, templateKey: string): Promise<number> {
    const latest = await this.prisma.checklistTemplate.findFirst({
      where: { organizationId, templateKey },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    return (latest?.version ?? 0) + 1;
  }

  async list(
    organizationId: string,
    filters: {
      status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
      brandId?: string;
      locationId?: string;
      zoneId?: string;
    },
    pagination: { page: number; limit: number },
  ) {
    const where: Prisma.ChecklistTemplateWhereInput = { organizationId };
    if (filters.status != null) where.status = filters.status;
    if (filters.brandId != null) where.brandId = filters.brandId;
    if (filters.locationId != null) where.locationId = filters.locationId;
    if (filters.zoneId != null) where.zoneId = filters.zoneId;

    return this.prisma.checklistTemplate.findMany({
      where,
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      orderBy: { updatedAt: 'desc' },
      include: TEMPLATE_INCLUDE,
    });
  }

  async update(
    organizationId: string,
    id: string,
    data: {
      name?: string;
      description?: string | null;
      brandId?: string | null;
      locationId?: string | null;
      zoneId?: string | null;
      sections?: Array<{
        title: string;
        description?: string | null;
        sortOrder: number;
        items: Array<{
          itemType: string;
          label: string;
          helpText?: string | null;
          isRequired: boolean;
          requiresEvidenceOnFail: boolean;
          requiresCommentOnFail: boolean;
          failureCreatesIncident: boolean;
          configJson?: Prisma.JsonValue;
          sortOrder: number;
        }>;
      }>;
    },
  ) {
    const template = await this.prisma.checklistTemplate.findFirst({
      where: { id, organizationId },
      include: { sections: { include: { items: true } } },
    });
    if (!template) return null;

    if (data.sections !== undefined) {
      await this.prisma.checklistTemplateItem.deleteMany({
        where: {
          checklistTemplateSectionId: {
            in: template.sections.map((s) => s.id),
          },
        },
      });
      await this.prisma.checklistTemplateSection.deleteMany({
        where: { checklistTemplateId: id },
      });

      for (const s of data.sections) {
        await this.prisma.checklistTemplateSection.create({
          data: {
            organizationId,
            checklistTemplateId: id,
            title: s.title,
            description: s.description ?? null,
            sortOrder: s.sortOrder,
            items: {
              create: (s.items ?? []).map((item) => ({
                organizationId,
                checklistTemplateId: id,
                itemType: item.itemType,
                label: item.label,
                helpText: item.helpText ?? null,
                isRequired: item.isRequired ?? true,
                requiresEvidenceOnFail: item.requiresEvidenceOnFail ?? false,
                requiresCommentOnFail: item.requiresCommentOnFail ?? false,
                failureCreatesIncident: item.failureCreatesIncident ?? false,
                configJson: item.configJson ?? Prisma.JsonNull,
                sortOrder: item.sortOrder,
              })),
            },
          },
        });
      }
    }

    const updateData: Prisma.ChecklistTemplateUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.brandId !== undefined) updateData.brandId = data.brandId;
    if (data.locationId !== undefined) updateData.locationId = data.locationId;
    if (data.zoneId !== undefined) updateData.zoneId = data.zoneId;

    if (Object.keys(updateData).length > 0) {
      await this.prisma.checklistTemplate.updateMany({
        where: { id, organizationId },
        data: updateData,
      });
    }

    return this.findById(organizationId, id);
  }

  async publish(organizationId: string, id: string) {
    const template = await this.prisma.checklistTemplate.findFirst({
      where: { id, organizationId },
    });
    if (!template) return null;

    await this.prisma.$transaction([
      this.prisma.checklistTemplate.updateMany({
        where: {
          organizationId,
          templateKey: template.templateKey,
        },
        data: { isLatest: false },
      }),
      this.prisma.checklistTemplate.updateMany({
        where: { id, organizationId },
        data: {
          status: 'PUBLISHED',
          isLatest: true,
          publishedAt: new Date(),
        },
      }),
    ]);

    return this.findById(organizationId, id);
  }

  async archive(organizationId: string, id: string) {
    await this.prisma.checklistTemplate.updateMany({
      where: { id, organizationId },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
    });
    return this.findById(organizationId, id);
  }
}
