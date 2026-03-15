import { Injectable } from '@nestjs/common';
import { Prisma, AlertStatus } from '@prisma/client';
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
    status: AlertStatus | string;
    severity?: string | null;
    payloadJson?: Record<string, unknown> | null;
    triggeredAt: Date;
  }) {
    return this.prisma.alertEvent.create({
      data: {
        ...data,
        status: (data.status as AlertStatus) ?? AlertStatus.OPEN,
        payloadJson:
          data.payloadJson === undefined
            ? undefined
            : data.payloadJson === null
              ? Prisma.JsonNull
              : (data.payloadJson as Prisma.InputJsonValue),
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
      severity?: string;
      sourceType?: string;
      from?: string;
      to?: string;
    },
    pagination: { page: number; limit: number },
    sort: { triggeredAt?: 'asc' | 'desc'; createdAt?: 'desc' },
  ) {
    const where: Prisma.AlertEventWhereInput = { organizationId };
    if (filters.brandId != null) where.brandId = filters.brandId;
    if (filters.locationId != null) where.locationId = filters.locationId;
    if (filters.zoneId != null) where.zoneId = filters.zoneId;
    if (filters.assetId != null) where.assetId = filters.assetId;
    if (filters.type != null) where.type = filters.type;
    if (filters.status != null) where.status = filters.status as AlertStatus;
    if (filters.severity != null) where.severity = filters.severity;
    if (filters.sourceType != null) where.sourceType = filters.sourceType;
    if (filters.from || filters.to) {
      where.triggeredAt = {};
      if (filters.from) (where.triggeredAt as Prisma.DateTimeFilter).gte = new Date(filters.from);
      if (filters.to) (where.triggeredAt as Prisma.DateTimeFilter).lte = new Date(filters.to);
    }

    const orderBy = sort.triggeredAt
      ? { triggeredAt: sort.triggeredAt }
      : { createdAt: 'desc' as const };

    const [items, total] = await Promise.all([
      this.prisma.alertEvent.findMany({
        where,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy,
      }),
      this.prisma.alertEvent.count({ where }),
    ]);

    return { items, total };
  }

  async update(
    organizationId: string,
    id: string,
    data: {
      status?: AlertStatus;
      acknowledgedAt?: Date | null;
      acknowledgedByUserId?: string | null;
      resolvedAt?: Date | null;
      resolvedByUserId?: string | null;
      resolutionNote?: string | null;
    },
  ) {
    await this.prisma.alertEvent.updateMany({
      where: { id, organizationId },
      data,
    });
    return this.findById(organizationId, id);
  }
}
