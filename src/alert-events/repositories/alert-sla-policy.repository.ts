import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

export interface ResolvedSla {
  acknowledgeWithinMinutes: number;
  resolveWithinMinutes: number;
}

@Injectable()
export class AlertSlaPolicyRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find active policy matching locationId + severity (highest priority).
   */
  async findByLocationAndSeverity(
    organizationId: string,
    locationId: string,
    severity: string,
  ): Promise<ResolvedSla | null> {
    const policy = await this.prisma.alertSlaPolicy.findFirst({
      where: {
        organizationId,
        locationId,
        severity,
        isActive: true,
      },
      select: {
        acknowledgeWithinMinutes: true,
        resolveWithinMinutes: true,
      },
    });
    return policy;
  }

  /**
   * Find active policy matching brandId + severity (second priority).
   */
  async findByBrandAndSeverity(
    organizationId: string,
    brandId: string,
    severity: string,
  ): Promise<ResolvedSla | null> {
    const policy = await this.prisma.alertSlaPolicy.findFirst({
      where: {
        organizationId,
        brandId,
        severity,
        isActive: true,
      },
      select: {
        acknowledgeWithinMinutes: true,
        resolveWithinMinutes: true,
      },
    });
    return policy;
  }

  /**
   * Find org-default policy (brandId, locationId, zoneId all null) + severity.
   */
  async findByOrgDefaultAndSeverity(
    organizationId: string,
    severity: string,
  ): Promise<ResolvedSla | null> {
    const policy = await this.prisma.alertSlaPolicy.findFirst({
      where: {
        organizationId,
        brandId: null,
        locationId: null,
        zoneId: null,
        severity,
        isActive: true,
      },
      select: {
        acknowledgeWithinMinutes: true,
        resolveWithinMinutes: true,
      },
    });
    return policy;
  }
}
