import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

/**
 * Validates that the target entity exists and belongs to the organization.
 * Ensures exactly one target FK is set for attachment creation.
 */
@Injectable()
export class AttachmentOwnershipService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates CreateAttachmentDto: exactly one target, and that entity is in org.
   */
  async validateTarget(
    organizationId: string,
    dto: {
      incidentId?: string;
      taskId?: string;
      checklistRunId?: string;
      checklistRunResponseId?: string;
      assetId?: string;
    },
  ): Promise<{
    incidentId?: string;
    taskId?: string;
    checklistRunId?: string;
    checklistRunResponseId?: string;
    checklistRunItemSnapshotId?: string;
    assetId?: string;
  }> {
    const keys = [
      dto.incidentId,
      dto.taskId,
      dto.checklistRunId,
      dto.checklistRunResponseId,
      dto.assetId,
    ].filter(Boolean);

    if (keys.length !== 1) {
      throw new BadRequestException(
        'Exactly one of incidentId, taskId, checklistRunId, checklistRunResponseId, assetId must be set',
      );
    }

    if (dto.incidentId) {
      const incident = await this.prisma.incident.findFirst({
        where: { id: dto.incidentId, organizationId },
      });
      if (!incident) throw new BadRequestException('Incident not found or not in organization');
      return { incidentId: dto.incidentId };
    }

    if (dto.taskId) {
      const task = await this.prisma.task.findFirst({
        where: { id: dto.taskId, organizationId },
      });
      if (!task) throw new BadRequestException('Task not found or not in organization');
      return { taskId: dto.taskId };
    }

    if (dto.checklistRunId) {
      const run = await this.prisma.checklistRun.findFirst({
        where: { id: dto.checklistRunId, organizationId },
      });
      if (!run) throw new BadRequestException('Checklist run not found or not in organization');
      return { checklistRunId: dto.checklistRunId };
    }

    if (dto.checklistRunResponseId) {
      const resp = await this.prisma.checklistRunItemSnapshot.findFirst({
        where: { id: dto.checklistRunResponseId, organizationId },
      });
      if (!resp) throw new BadRequestException('Checklist run response not found or not in organization');
      return { checklistRunItemSnapshotId: dto.checklistRunResponseId };
    }

    if (dto.assetId) {
      const asset = await this.prisma.asset.findFirst({
        where: { id: dto.assetId, organizationId },
      });
      if (!asset) throw new BadRequestException('Asset not found or not in organization');
      return { assetId: dto.assetId };
    }

    throw new BadRequestException('No valid attachment target provided');
  }
}
