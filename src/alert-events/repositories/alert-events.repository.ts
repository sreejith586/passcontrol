import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class AlertEventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    organizationId: string;
    brandId?: string | null;
    locationId?: string | null;
    zoneId?: string | null;
    assetId?: string | null;
    sourceType: string;
    sourceId: string;
    type: string;
    status: string;
    severity?: string | null;
    payloadJson?: Record<string, unknown> | null;
    triggeredAt: Date;
  }) {
    return this.prisma.alertEvent.create({
      data: {
        ...data,
        payloadJson: data.payloadJson ?? undefined,
      },
    });
  }

  async findById(organizationId: string, id: string) {
    return this.prisma.alertEvent.findFirst({
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
      type?: string;
      status?: string;
      sourceType?: string;
      from?: string;
      to?: string;
    },
    pagination: { page: number; limit: number },
    sort: { triggeredAt?: 'asc' | 'desc'; createdAt?: 'desc' },
  ) {
    const where: Record<string, unknown> = { organizationId };
    if (filters.brandId != null) where.brandId = filters.brandId;
    if (filters.locationId != null) where.locationId = filters.locationId;
    if (filters.zoneId != null) where.zoneId = filters.zoneId;
    if (filters.assetId != null) where.assetId = filters.assetId;
    if (filters.type != null) where.type = filters.type;
    if (filters.status != null) where.status = filters.status;
    if (filters.sourceType != null) where.sourceType = filters.sourceType;
    if (filters.from || filters.to) {
      where.triggeredAt = {};
      if (filters.from) (where.triggeredAt as Record<string, Date>).gte = new Date(filters.from);
      if (filters.to) (where.triggeredAt as Record<string, Date>).lte = new Date(filters.to);
    }

    const orderBy = sort.triggeredAt
      ? { triggeredAt: sort.triggeredAt }
      : { createdAt: 'desc' as const };

    return this.prisma.alertEvent.findMany({
      where,
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      orderBy,
    });
  }

  async update(
    organizationId: string,
    id: string,
    data: {
      status?: string;
      acknowledgedAt?: Date | null;
      resolvedAt?: Date | null;
    },
  ) {
    await this.prisma.alertEvent.updateMany({
      where: { id, organizationId },
      data,
    });
    return this.findById(organizationId, id);
  }
}
