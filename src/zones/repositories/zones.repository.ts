import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

const ZONE_INCLUDE = {
  location: {
    select: { id: true, name: true },
  },
} as const;

@Injectable()
export class ZonesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(organizationId: string, id: string) {
    return this.prisma.zone.findFirst({
      where: { id, organizationId },
      include: ZONE_INCLUDE,
    });
  }

  async findMany(organizationId: string, filters?: { locationId?: string }) {
    const where: { organizationId: string; locationId?: string } = {
      organizationId,
    };
    if (filters?.locationId) where.locationId = filters.locationId;

    return this.prisma.zone.findMany({
      where,
      orderBy: { name: 'asc' },
      include: ZONE_INCLUDE,
    });
  }

  async create(
    organizationId: string,
    data: { locationId: string; name: string },
  ) {
    return this.prisma.zone.create({
      data: {
        organizationId,
        locationId: data.locationId,
        name: data.name.trim(),
      },
      include: ZONE_INCLUDE,
    });
  }

  async update(
    organizationId: string,
    id: string,
    data: { locationId?: string; name?: string },
  ) {
    const updateData: { locationId?: string; name?: string } = {};
    if (data.locationId !== undefined) updateData.locationId = data.locationId;
    if (data.name !== undefined) updateData.name = data.name.trim();

    await this.prisma.zone.updateMany({
      where: { id, organizationId },
      data: updateData,
    });
    return this.findById(organizationId, id);
  }

  /** Check if zone exists and belongs to organization (for scope validation). */
  async existsInOrg(organizationId: string, zoneId: string): Promise<boolean> {
    const zone = await this.prisma.zone.findFirst({
      where: { id: zoneId, organizationId },
      select: { id: true },
    });
    return !!zone;
  }

  /** Check if zone belongs to location (for hierarchy validation). */
  async belongsToLocation(
    organizationId: string,
    zoneId: string,
    locationId: string,
  ): Promise<boolean> {
    const zone = await this.prisma.zone.findFirst({
      where: { id: zoneId, organizationId, locationId },
      select: { id: true },
    });
    return !!zone;
  }
}
