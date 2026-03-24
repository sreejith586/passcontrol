import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class OrganizationSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getOrganizationName(organizationId: string): Promise<string | null> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
    return org?.name ?? null;
  }

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

  async getRegionalSettings(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        defaultTimezone: true,
        defaultTemperatureUnit: true,
      },
    });
    return org;
  }

  async updateRegionalSettings(
    organizationId: string,
    data: {
      defaultTimezone?: string | null;
      defaultTemperatureUnit?: string | null;
    },
  ) {
    const updateData: Record<string, string | null> = {};
    if (data.defaultTimezone !== undefined) {
      updateData.defaultTimezone = data.defaultTimezone ?? null;
    }
    if (data.defaultTemperatureUnit !== undefined) {
      updateData.defaultTemperatureUnit = data.defaultTemperatureUnit ?? null;
    }
    if (Object.keys(updateData).length === 0) {
      return this.getRegionalSettings(organizationId);
    }
    await this.prisma.organization.updateMany({
      where: { id: organizationId },
      data: updateData,
    });
    return this.getRegionalSettings(organizationId);
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
