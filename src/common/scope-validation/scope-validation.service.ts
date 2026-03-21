import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

export interface ScopeInput {
  brandId?: string | null;
  locationId?: string | null;
  zoneId?: string | null;
}

/**
 * Validates brand/location/zone scope for templates and schedules.
 * Rules:
 * - brandId, if provided, must exist in the same organization
 * - locationId, if provided, must exist in the same organization
 * - zoneId, if provided, must exist in the same organization
 * - if both brandId and locationId provided, location must belong to brand
 * - if both locationId and zoneId provided, zone must belong to location
 * - if all three provided, hierarchy must be consistent
 */
@Injectable()
export class ScopeValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async validate(
    organizationId: string,
    scope: ScopeInput,
  ): Promise<void> {
    const brandId = scope.brandId ?? null;
    const locationId = scope.locationId ?? null;
    const zoneId = scope.zoneId ?? null;

    if (brandId) {
      const brand = await this.prisma.brand.findFirst({
        where: { id: brandId, organizationId },
        select: { id: true },
      });
      if (!brand) {
        throw new BadRequestException(
          'Brand not found or does not belong to organization',
        );
      }
    }

    if (locationId) {
      const location = await this.prisma.location.findFirst({
        where: { id: locationId, organizationId },
        select: { id: true, brandId: true },
      });
      if (!location) {
        throw new BadRequestException(
          'Location not found or does not belong to organization',
        );
      }
      if (brandId && location.brandId !== brandId) {
        throw new BadRequestException(
          'Location does not belong to the specified brand',
        );
      }
    }

    if (zoneId) {
      const zone = await this.prisma.zone.findFirst({
        where: { id: zoneId, organizationId },
        select: { id: true, locationId: true },
      });
      if (!zone) {
        throw new BadRequestException(
          'Zone not found or does not belong to organization',
        );
      }
      if (locationId && zone.locationId !== locationId) {
        throw new BadRequestException(
          'Zone does not belong to the specified location',
        );
      }
    }
  }
}
