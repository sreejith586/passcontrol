import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class OrganizationSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getAlertWorkflowSettings(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { requireResolutionNoteOnResolve: true },
    });
    return org;
  }

  async updateAlertWorkflowSettings(
    organizationId: string,
    data: { requireResolutionNoteOnResolve: boolean },
  ) {
    const updated = await this.prisma.organization.updateMany({
      where: { id: organizationId },
      data: { requireResolutionNoteOnResolve: data.requireResolutionNoteOnResolve },
    });
    if (updated.count === 0) return null;
    return this.getAlertWorkflowSettings(organizationId);
  }
}
