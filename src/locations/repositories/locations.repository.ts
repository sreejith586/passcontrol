import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

const LOCATION_INCLUDE = {
  brand: {
    select: { id: true, name: true },
  },
} as const;

@Injectable()
export class LocationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(organizationId: string, id: string) {
    return this.prisma.location.findFirst({
      where: { id, organizationId },
      include: LOCATION_INCLUDE,
    });
  }

  async findMany(organizationId: string, filters?: { brandId?: string }) {
    const where: { organizationId: string; brandId?: string } = {
      organizationId,
    };
    if (filters?.brandId) where.brandId = filters.brandId;

    return this.prisma.location.findMany({
      where,
      orderBy: { name: 'asc' },
      include: LOCATION_INCLUDE,
    });
  }

  async create(
    organizationId: string,
    data: { brandId: string; name: string; timezone: string },
  ) {
    return this.prisma.location.create({
      data: {
        organizationId,
        brandId: data.brandId,
        name: data.name.trim(),
        timezone: data.timezone.trim(),
      },
      include: LOCATION_INCLUDE,
    });
  }

  async update(
    organizationId: string,
    id: string,
    data: { brandId?: string; name?: string; timezone?: string },
  ) {
    const updateData: { brandId?: string; name?: string; timezone?: string } =
      {};
    if (data.brandId !== undefined) updateData.brandId = data.brandId;
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.timezone !== undefined) updateData.timezone = data.timezone.trim();

    await this.prisma.location.updateMany({
      where: { id, organizationId },
      data: updateData,
    });
    return this.findById(organizationId, id);
  }

  /** Check if location exists and belongs to organization (for scope validation). */
  async existsInOrg(
    organizationId: string,
    locationId: string,
  ): Promise<boolean> {
    const location = await this.prisma.location.findFirst({
      where: { id: locationId, organizationId },
      select: { id: true },
    });
    return !!location;
  }

  /** Check if location belongs to brand (for hierarchy validation). */
  async belongsToBrand(
    organizationId: string,
    locationId: string,
    brandId: string,
  ): Promise<boolean> {
    const location = await this.prisma.location.findFirst({
      where: { id: locationId, organizationId, brandId },
      select: { id: true },
    });
    return !!location;
  }
}
