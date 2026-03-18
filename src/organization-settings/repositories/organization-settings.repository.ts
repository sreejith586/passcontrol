import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class OrganizationSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getAlertWorkflowSettings(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        requireResolutionNoteOnResolve: true,
        requireReopenNoteOnReopen: true,
      },
    });
    return org;
  }

  async updateAlertWorkflowSettings(
    organizationId: string,
    data: {
      requireResolutionNoteOnResolve?: boolean;
      requireReopenNoteOnReopen?: boolean;
    },
  ) {
    const updateData: Record<string, boolean> = {};
    if (data.requireResolutionNoteOnResolve !== undefined) {
      updateData.requireResolutionNoteOnResolve = data.requireResolutionNoteOnResolve;
    }
    if (data.requireReopenNoteOnReopen !== undefined) {
      updateData.requireReopenNoteOnReopen = data.requireReopenNoteOnReopen;
    }
    if (Object.keys(updateData).length === 0) {
      return this.getAlertWorkflowSettings(organizationId);
    }
    const updated = await this.prisma.organization.updateMany({
      where: { id: organizationId },
      data: updateData,
    });
    if (updated.count === 0) return null;
    return this.getAlertWorkflowSettings(organizationId);
  }
}
