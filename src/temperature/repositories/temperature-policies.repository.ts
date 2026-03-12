import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class TemperaturePoliciesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    organizationId: string;
    brandId?: string | null;
    locationId?: string | null;
    zoneId?: string | null;
    assetId?: string | null;
    name: string;
    minTemp: number;
    maxTemp: number;
    unit: string;
    breachGraceSeconds?: number | null;
    isActive: boolean;
  }) {
    return this.prisma.temperaturePolicy.create({
      data: {
        ...data,
        breachGraceSeconds: data.breachGraceSeconds ?? null,
      },
    });
  }

  async findById(organizationId: string, id: string) {
    return this.prisma.temperaturePolicy.findFirst({
      where: { id, organizationId },
    });
  }

  async list(
    organizationId: string,
    filters: {
      brandId?: string;
      locationId?: string;
      zoneId?: string;
      assetId?: string;
      isActive?: boolean;
    },
    pagination: { page: number; limit: number },
    sort: { [k: string]: 'asc' | 'desc' },
  ) {
    const where: Record<string, unknown> = { organizationId };
    if (filters.brandId != null) where.brandId = filters.brandId;
    if (filters.locationId != null) where.locationId = filters.locationId;
    if (filters.zoneId != null) where.zoneId = filters.zoneId;
    if (filters.assetId != null) where.assetId = filters.assetId;
    if (filters.isActive != null) where.isActive = filters.isActive;

    return this.prisma.temperaturePolicy.findMany({
      where,
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      orderBy: sort,
    });
  }

  async update(
    organizationId: string,
    id: string,
    data: {
      name?: string;
      minTemp?: number;
      maxTemp?: number;
      unit?: string;
      breachGraceSeconds?: number | null;
      isActive?: boolean;
    },
  ) {
    await this.prisma.temperaturePolicy.updateMany({
      where: { id, organizationId },
      data,
    });
    return this.findById(organizationId, id);
  }

  async deactivate(organizationId: string, id: string) {
    return this.update(organizationId, id, { isActive: false });
  }

  async findApplicablePolicies(organizationId: string, scope: {
    assetId?: string | null;
    zoneId?: string | null;
    locationId?: string | null;
    brandId?: string | null;
  }): Promise<Array<{
    id: string;
    assetId: string | null;
    zoneId: string | null;
    locationId: string | null;
    brandId: string | null;
    minTemp: number;
    maxTemp: number;
    unit: string;
  }>> {
    const policies = await this.prisma.temperaturePolicy.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(scope.assetId && { assetId: scope.assetId }),
        ...(scope.zoneId && { zoneId: scope.zoneId }),
        ...(scope.locationId && { locationId: scope.locationId }),
        ...(scope.brandId && { brandId: scope.brandId }),
      },
      select: {
        id: true,
        assetId: true,
        zoneId: true,
        locationId: true,
        brandId: true,
        minTemp: true,
        maxTemp: true,
        unit: true,
      },
    });
    return policies as Array<{
      id: string;
      assetId: string | null;
      zoneId: string | null;
      locationId: string | null;
      brandId: string | null;
      minTemp: number;
      maxTemp: number;
      unit: string;
    }>;
  }
}
