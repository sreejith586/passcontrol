import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AttachmentsRepository } from '../repositories/attachments.repository';
import { AttachmentOwnershipService } from './attachment-ownership.service';
import { CreateAttachmentDto } from '../dto/create-attachment.dto';
import { ListAttachmentsQueryDto } from '../dto/list-attachments.dto';
import { AuditLogsService } from '../../audit/services/audit-logs.service';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly repo: AttachmentsRepository,
    private readonly ownership: AttachmentOwnershipService,
    private readonly audit: AuditLogsService,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    ctx: { organizationId: string; userId?: string },
    dto: CreateAttachmentDto,
  ) {
    const target = await this.ownership.validateTarget(ctx.organizationId, {
      incidentId: dto.incidentId,
      taskId: dto.taskId,
      checklistRunId: dto.checklistRunId,
      checklistRunResponseId: dto.checklistRunResponseId,
      assetId: dto.assetId,
    });

    const file = await this.prisma.file.findFirst({
      where: { id: dto.fileId, organizationId: ctx.organizationId },
    });
    if (!file) {
      throw new BadRequestException('File not found or not in organization');
    }

    const created = await this.repo.create({
      organizationId: ctx.organizationId,
      fileId: dto.fileId,
      attachmentType: dto.attachmentType,
      ...target,
    });

    await this.audit.recordWrite('ATTACHMENT_CREATE', ctx, created.id, {
      after: created,
    });
    return created;
  }

  async getById(ctx: { organizationId: string }, id: string) {
    const attachment = await this.repo.findById(ctx.organizationId, id);
    if (!attachment) throw new NotFoundException('Attachment not found');
    return attachment;
  }

  async list(ctx: { organizationId: string }, query: ListAttachmentsQueryDto) {
    const filters = {
      incidentId: query.incidentId,
      taskId: query.taskId,
      checklistRunId: query.checklistRunId,
      checklistRunResponseId: query.checklistRunResponseId,
      assetId: query.assetId,
    };
    const hasFilter = Object.values(filters).some((v) => v != null);
    if (!hasFilter) {
      throw new BadRequestException(
        'At least one filter required: incidentId, taskId, checklistRunId, checklistRunResponseId, assetId',
      );
    }

    const pagination = { page: query.page ?? 1, limit: query.limit ?? 25 };
    return this.repo.list(ctx.organizationId, filters, pagination);
  }

  async delete(ctx: { organizationId: string; userId?: string }, id: string) {
    const existing = await this.getById(ctx, id);
    const result = await this.repo.delete(ctx.organizationId, id);
    await this.audit.recordWrite('ATTACHMENT_DELETE', ctx, id, {
      before: existing,
    });
    return result;
  }
}
