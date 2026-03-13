import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class TemperatureReadingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    organizationId: string;
    brandId?: string | null;
    locationId: string;
    zoneId?: string | null;
    assetId?: string | null;
    policyId?: string | null;
    checklistRunId?: string | null;
    checklistRunResponseId?: string | null;
    sourceType: string;
    readingValue: number;
    unit: string;
    recordedAt: Date;
    recordedByUserId?: string | null;
    isBreach: boolean;
    breachType: string;
    rawPayloadJson?: Record<string, unknown> | null;
  }) {
    return this.prisma.temperatureReading.create({
      data: {
        ...data,
        rawPayloadJson:
          data.rawPayloadJson === undefined
            ? undefined
            : data.rawPayloadJson === null
              ? Prisma.JsonNull
              : (data.rawPayloadJson as Prisma.InputJsonValue),
      },
    });
  }

  async findById(organizationId: string, id: string) {
    return this.prisma.temperatureReading.findFirst({
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
      policyId?: string;
      checklistRunId?: string;
      checklistRunResponseId?: string;
      sourceType?: string;
      isBreach?: boolean;
      breachType?: string;
      from?: string;
      to?: string;
    },
    pagination: { page: number; limit: number },
    sort: { recordedAt?: 'asc' | 'desc'; createdAt?: 'desc' },
  ) {
    const where: Record<string, unknown> = { organizationId };
    if (filters.brandId != null) where.brandId = filters.brandId;
    if (filters.locationId != null) where.locationId = filters.locationId;
    if (filters.zoneId != null) where.zoneId = filters.zoneId;
    if (filters.assetId != null) where.assetId = filters.assetId;
    if (filters.policyId != null) where.policyId = filters.policyId;
    if (filters.checklistRunId != null) where.checklistRunId = filters.checklistRunId;
    if (filters.checklistRunResponseId != null) where.checklistRunResponseId = filters.checklistRunResponseId;
    if (filters.sourceType != null) where.sourceType = filters.sourceType;
    if (filters.isBreach != null) where.isBreach = filters.isBreach;
    if (filters.breachType != null) where.breachType = filters.breachType;
    if (filters.from || filters.to) {
      where.recordedAt = {};
      if (filters.from) (where.recordedAt as Record<string, Date>).gte = new Date(filters.from);
      if (filters.to) (where.recordedAt as Record<string, Date>).lte = new Date(filters.to);
    }

    const orderBy = sort.recordedAt
      ? { recordedAt: sort.recordedAt }
      : { createdAt: 'desc' as const };

    return this.prisma.temperatureReading.findMany({
      where,
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      orderBy,
    });
  }
}
