import { Injectable } from '@nestjs/common';
import { Prisma, AlertStatus } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

export interface AlertTrendsFilters {
  brandId?: string;
  locationId?: string;
  zoneId?: string;
  severity?: string;
  from?: string;
  to?: string;
}

export type AlertTrendsInterval = 'day' | 'week' | 'month';

const ALERT_TRENDS_INTERVALS: AlertTrendsInterval[] = ['day', 'week', 'month'];

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

  /**
   * Count alerts by status. Used for supervisor dashboard metrics.
   */
  async countByStatus(
    organizationId: string,
    filters: { brandId?: string; locationId?: string; zoneId?: string },
    status: AlertStatus,
  ): Promise<number> {
    const where: Prisma.AlertEventWhereInput = { organizationId, status };
    if (filters.brandId != null) where.brandId = filters.brandId;
    if (filters.locationId != null) where.locationId = filters.locationId;
    if (filters.zoneId != null) where.zoneId = filters.zoneId;
    return this.prisma.alertEvent.count({ where });
  }

  /**
   * Count resolved alerts where resolvedAt is within the given date range (UTC day).
   */
  async countResolvedInRange(
    organizationId: string,
    filters: { brandId?: string; locationId?: string; zoneId?: string },
    dateRange: { start: Date; end: Date },
  ): Promise<number> {
    const where: Prisma.AlertEventWhereInput = {
      organizationId,
      status: AlertStatus.RESOLVED,
      resolvedAt: { gte: dateRange.start, lte: dateRange.end },
    };
    if (filters.brandId != null) where.brandId = filters.brandId;
    if (filters.locationId != null) where.locationId = filters.locationId;
    if (filters.zoneId != null) where.zoneId = filters.zoneId;
    return this.prisma.alertEvent.count({ where });
  }

  /**
   * Find first alert event by source (e.g. CHECKLIST_RUN_ITEM + sourceId).
   * Used for supervisor drilldown to link item snapshot to its fail alert.
   */
  async findFirstBySource(
    organizationId: string,
    sourceType: string,
    sourceId: string,
  ) {
    return this.prisma.alertEvent.findFirst({
      where: { organizationId, sourceType, sourceId },
      select: {
        id: true,
        status: true,
        severity: true,
        acknowledgedAt: true,
        acknowledgedByUserId: true,
        resolvedAt: true,
        resolvedByUserId: true,
        resolutionNote: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find latest alert by source and allowed statuses.
   * Used for convenience endpoints (e.g. acknowledge-alert, resolve-alert from run item).
   */
  async findFirstBySourceAndStatuses(
    organizationId: string,
    sourceType: string,
    sourceId: string,
    statuses: AlertStatus[],
  ) {
    return this.prisma.alertEvent.findFirst({
      where: {
        organizationId,
        sourceType,
        sourceId,
        status: { in: statuses },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get alert lifecycle trends over time.
   * created: bucket by createdAt
   * acknowledged: bucket by acknowledgedAt
   * resolved: bucket by resolvedAt
   * from/to applied to each lifecycle timestamp independently.
   */
  async getTrends(
    organizationId: string,
    filters: AlertTrendsFilters,
    interval: AlertTrendsInterval,
  ): Promise<
    Array<{
      date: string;
      created: number;
      acknowledged: number;
      resolved: number;
    }>
  > {
    const safeInterval = ALERT_TRENDS_INTERVALS.includes(interval)
      ? interval
      : 'day';
    const baseConditions: Prisma.Sql[] = [
      Prisma.sql`ae.organization_id = ${organizationId}`,
    ];
    baseConditions.push(
      ...this.buildDimensionConditions(organizationId, filters),
    );
    const dimWhereClause = Prisma.join(baseConditions, ' AND ');

    const fromDate = filters.from ? new Date(filters.from) : null;
    const toDate = filters.to ? new Date(filters.to) : null;

    const createdConditions: Prisma.Sql[] = [Prisma.sql`1=1`];
    if (fromDate) createdConditions.push(Prisma.sql`ae.created_at >= ${fromDate}`);
    if (toDate) createdConditions.push(Prisma.sql`ae.created_at <= ${toDate}`);
    const createdWhere = Prisma.join(createdConditions, ' AND ');

    const ackConditions: Prisma.Sql[] = [
      Prisma.sql`ae.acknowledged_at IS NOT NULL`,
    ];
    if (fromDate) ackConditions.push(Prisma.sql`ae.acknowledged_at >= ${fromDate}`);
    if (toDate) ackConditions.push(Prisma.sql`ae.acknowledged_at <= ${toDate}`);
    const ackWhere = Prisma.join(ackConditions, ' AND ');

    const resConditions: Prisma.Sql[] = [
      Prisma.sql`ae.resolved_at IS NOT NULL`,
    ];
    if (fromDate) resConditions.push(Prisma.sql`ae.resolved_at >= ${fromDate}`);
    if (toDate) resConditions.push(Prisma.sql`ae.resolved_at <= ${toDate}`);
    const resWhere = Prisma.join(resConditions, ' AND ');

    const rows = await this.prisma.$queryRaw<
      Array<{
        bucket: Date;
        created: bigint;
        acknowledged: bigint;
        resolved: bigint;
      }>
    >(Prisma.sql`
      WITH filtered_alerts AS (
        SELECT id, created_at, acknowledged_at, resolved_at
        FROM alert_events ae
        WHERE ${dimWhereClause}
      ),
      lifecycle_events AS (
        SELECT ae.id, DATE_TRUNC(${safeInterval}, ae.created_at)::date AS bucket, 'created' AS event_type
        FROM filtered_alerts ae
        WHERE ${createdWhere}
        UNION ALL
        SELECT ae.id, DATE_TRUNC(${safeInterval}, ae.acknowledged_at)::date AS bucket, 'acknowledged'
        FROM filtered_alerts ae
        WHERE ${ackWhere}
        UNION ALL
        SELECT ae.id, DATE_TRUNC(${safeInterval}, ae.resolved_at)::date AS bucket, 'resolved'
        FROM filtered_alerts ae
        WHERE ${resWhere}
      )
      SELECT
        le.bucket,
        COUNT(*) FILTER (WHERE le.event_type = 'created')::bigint AS created,
        COUNT(*) FILTER (WHERE le.event_type = 'acknowledged')::bigint AS acknowledged,
        COUNT(*) FILTER (WHERE le.event_type = 'resolved')::bigint AS resolved
      FROM lifecycle_events le
      GROUP BY le.bucket
      ORDER BY le.bucket ASC
    `);

    return rows.map((r) => ({
      date:
        r.bucket instanceof Date
          ? r.bucket.toISOString().slice(0, 10)
          : String(r.bucket).slice(0, 10),
      created: Number(r.created ?? 0),
      acknowledged: Number(r.acknowledged ?? 0),
      resolved: Number(r.resolved ?? 0),
    }));
  }

  private buildDimensionConditions(
    _organizationId: string,
    filters: AlertTrendsFilters,
  ): Prisma.Sql[] {
    const conditions: Prisma.Sql[] = [];
    if (filters.brandId != null) {
      conditions.push(Prisma.sql`ae.brand_id = ${filters.brandId}`);
    }
    if (filters.locationId != null) {
      conditions.push(Prisma.sql`ae.location_id = ${filters.locationId}`);
    }
    if (filters.zoneId != null) {
      conditions.push(Prisma.sql`ae.zone_id = ${filters.zoneId}`);
    }
    if (filters.severity != null) {
      conditions.push(Prisma.sql`ae.severity = ${filters.severity}`);
    }
    return conditions;
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
