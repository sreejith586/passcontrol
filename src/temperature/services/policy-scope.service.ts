import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

/**
 * Validates temperature policy and reading scope: tenant-safe and hierarchy consistency.
 */
@Injectable()
export class PolicyScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async validatePolicyScope(organizationId: string, dto: {
    organizationId: string;
    brandId?: string;
    locationId?: string;
    zoneId?: string;
    assetId?: string;
  }) {
    if (dto.organizationId !== organizationId) {
      throw new BadRequestException('organizationId must match tenant');
    }

    if (dto.brandId) {
      const brand = await this.prisma.brand.findFirst({
        where: { id: dto.brandId, organizationId },
      });
      if (!brand) throw new BadRequestException('Brand not in organization');
    }

    if (dto.locationId) {
      const loc = await this.prisma.location.findFirst({
        where: { id: dto.locationId, organizationId },
      });
      if (!loc) throw new BadRequestException('Location not in organization');
      if (dto.brandId && loc.brandId !== dto.brandId) {
        throw new BadRequestException('Location does not belong to brand');
      }
    }

    if (dto.zoneId) {
      const zone = await this.prisma.zone.findFirst({
        where: { id: dto.zoneId, organizationId },
      });
      if (!zone) throw new BadRequestException('Zone not in organization');
      if (dto.locationId && zone.locationId !== dto.locationId) {
        throw new BadRequestException('Zone does not belong to location');
      }
    }

    if (dto.assetId) {
      const asset = await this.prisma.asset.findFirst({
        where: { id: dto.assetId, organizationId },
      });
      if (!asset) throw new BadRequestException('Asset not in organization');
      if (dto.locationId && asset.locationId !== dto.locationId) {
        throw new BadRequestException('Asset does not belong to location');
      }
      if (dto.zoneId && asset.zoneId !== dto.zoneId) {
        throw new BadRequestException('Asset zone mismatch');
      }
    }
  }

  async validateReadingScope(organizationId: string, dto: {
    organizationId: string;
    locationId: string;
    brandId?: string;
    zoneId?: string;
    assetId?: string;
    checklistRunId?: string;
    checklistRunResponseId?: string;
  }) {
    if (dto.organizationId !== organizationId) {
      throw new BadRequestException('organizationId must match tenant');
    }

    if (!dto.locationId && !dto.assetId) {
      throw new BadRequestException('At least one of locationId or assetId is required');
    }

    const loc = await this.prisma.location.findFirst({
      where: { id: dto.locationId, organizationId },
    });
    if (!loc) throw new BadRequestException('Location not in organization');
    if (dto.brandId && loc.brandId !== dto.brandId) {
      throw new BadRequestException('Location does not belong to brand');
    }

    if (dto.zoneId) {
      const zone = await this.prisma.zone.findFirst({
        where: { id: dto.zoneId, organizationId },
      });
      if (!zone) throw new BadRequestException('Zone not in organization');
      if (zone.locationId !== dto.locationId) {
        throw new BadRequestException('Zone does not belong to location');
      }
    }

    if (dto.assetId) {
      const asset = await this.prisma.asset.findFirst({
        where: { id: dto.assetId, organizationId },
      });
      if (!asset) throw new BadRequestException('Asset not in organization');
      if (asset.locationId !== dto.locationId) {
        throw new BadRequestException('Asset does not belong to location');
      }
    }

    if (dto.checklistRunId) {
      const run = await this.prisma.checklistRun.findFirst({
        where: { id: dto.checklistRunId, organizationId },
      });
      if (!run) throw new BadRequestException('Checklist run not in organization');
      if (run.locationId !== dto.locationId) {
        throw new BadRequestException('Checklist run location mismatch');
      }
    }

    if (dto.checklistRunResponseId) {
      const resp = await this.prisma.checklistRunItemSnapshot.findFirst({
        where: { id: dto.checklistRunResponseId, organizationId },
      });
      if (!resp) throw new BadRequestException('Checklist run response not in organization');
      if (dto.checklistRunId && resp.checklistRunId !== dto.checklistRunId) {
        throw new BadRequestException('Checklist run response does not belong to run');
      }
    }
  }
}
