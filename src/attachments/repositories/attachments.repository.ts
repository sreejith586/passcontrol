import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class AttachmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    organizationId: string;
    fileId: string;
    attachmentType: string;
    incidentId?: string | null;
    taskId?: string | null;
    checklistRunId?: string | null;
    checklistRunItemSnapshotId?: string | null;
    assetId?: string | null;
  }) {
    return this.prisma.attachment.create({
      data: {
        ...data,
        incidentId: data.incidentId ?? null,
        taskId: data.taskId ?? null,
        checklistRunId: data.checklistRunId ?? null,
        checklistRunItemSnapshotId: data.checklistRunItemSnapshotId ?? null,
        assetId: data.assetId ?? null,
      },
      include: { file: true },
    });
  }

  async findById(organizationId: string, id: string) {
    return this.prisma.attachment.findFirst({
      where: { id, organizationId },
      include: { file: true },
    });
  }

  async list(
    organizationId: string,
    filters: {
      incidentId?: string;
      taskId?: string;
      checklistRunId?: string;
      checklistRunResponseId?: string;
      assetId?: string;
    },
    pagination: { page: number; limit: number },
  ) {
    const where: Record<string, unknown> = { organizationId };
    if (filters.incidentId != null) where.incidentId = filters.incidentId;
    if (filters.taskId != null) where.taskId = filters.taskId;
    if (filters.checklistRunId != null) where.checklistRunId = filters.checklistRunId;
    if (filters.checklistRunResponseId != null) where.checklistRunItemSnapshotId = filters.checklistRunResponseId;
    if (filters.assetId != null) where.assetId = filters.assetId;

    return this.prisma.attachment.findMany({
      where,
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      orderBy: { createdAt: 'desc' },
      include: { file: true },
    });
  }

  async delete(organizationId: string, id: string) {
    await this.prisma.attachment.deleteMany({
      where: { id, organizationId },
    });
    return { id, deleted: true };
  }
}
