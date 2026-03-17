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
    acknowledgeWithinMinutes: number;
    resolveWithinMinutes: number;
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

  /**
   * List alerts with SLA escalation data (deadlines, breach flags).
   * Uses application-provided now for deterministic breach computation.
   */
  async listEscalations(
    organizationId: string,
    filters: {
      brandId?: string;
      locationId?: string;
      zoneId?: string;
      severity?: string;
      status?: 'OPEN' | 'ACKNOWLEDGED';
      onlyBreached?: boolean;
    },
    pagination: { page: number; limit: number },
    now: Date,
  ): Promise<{
    items: Array<{
      alertEventId: string;
      severity: string | null;
      status: string;
      createdAt: Date;
      acknowledgedAt: Date | null;
      resolvedAt: Date | null;
      sourceType: string;
      sourceId: string;
      scope: {
        brandId: string | null;
        locationId: string | null;
        zoneId: string | null;
      };
      sla: {
        acknowledgeWithinMinutes: number;
        resolveWithinMinutes: number;
        acknowledgeBy: Date;
        resolveBy: Date;
        acknowledgeBreached: boolean;
        resolveBreached: boolean;
      };
    }>;
    total: number;
  }> {
    const baseConditions: Prisma.Sql[] = [
      Prisma.sql`ae.organization_id = ${organizationId}`,
      Prisma.sql`ae.status IN ('OPEN', 'ACKNOWLEDGED')`,
    ];
    if (filters.brandId != null) {
      baseConditions.push(Prisma.sql`ae.brand_id = ${filters.brandId}`);
    }
    if (filters.locationId != null) {
      baseConditions.push(Prisma.sql`ae.location_id = ${filters.locationId}`);
    }
    if (filters.zoneId != null) {
      baseConditions.push(Prisma.sql`ae.zone_id = ${filters.zoneId}`);
    }
    if (filters.severity != null) {
      baseConditions.push(Prisma.sql`ae.severity = ${filters.severity}`);
    }
    if (filters.status != null) {
      baseConditions.push(Prisma.sql`ae.status = ${filters.status}`);
    }
    const whereClause = Prisma.join(baseConditions, ' AND ');

    const offset = (pagination.page - 1) * pagination.limit;

    const breachCondition =
      filters.onlyBreached === true
        ? Prisma.sql`AND (ack_breached OR res_breached)`
        : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        severity: string | null;
        status: string;
        created_at: Date;
        acknowledged_at: Date | null;
        resolved_at: Date | null;
        source_type: string;
        source_id: string;
        brand_id: string | null;
        location_id: string | null;
        zone_id: string | null;
        ack_within: number;
        res_within: number;
        acknowledge_by: Date;
        resolve_by: Date;
        ack_breached: boolean;
        res_breached: boolean;
      }>
    >(Prisma.sql`
      WITH base AS (
        SELECT
          ae.id,
          ae.severity,
          ae.status,
          ae.created_at,
          ae.acknowledged_at,
          ae.resolved_at,
          ae.source_type,
          ae.source_id,
          ae.brand_id,
          ae.location_id,
          ae.zone_id,
          ae.acknowledge_within_minutes AS ack_within,
          ae.resolve_within_minutes AS res_within,
          ae.created_at + (ae.acknowledge_within_minutes || ' minutes')::interval AS acknowledge_by,
          ae.created_at + (ae.resolve_within_minutes || ' minutes')::interval AS resolve_by,
          (ae.acknowledged_at IS NULL AND ae.created_at + (ae.acknowledge_within_minutes || ' minutes')::interval < ${now}) AS ack_breached,
          (ae.resolved_at IS NULL AND ae.created_at + (ae.resolve_within_minutes || ' minutes')::interval < ${now}) AS res_breached
        FROM alert_events ae
        WHERE ${whereClause}
      )
      SELECT * FROM base
      WHERE 1=1 ${breachCondition}
      ORDER BY
        res_breached DESC,
        ack_breached DESC,
        CASE severity
          WHEN 'CRITICAL' THEN 4
          WHEN 'HIGH' THEN 3
          WHEN 'MEDIUM' THEN 2
          WHEN 'LOW' THEN 1
          ELSE 0
        END DESC,
        created_at ASC
      LIMIT ${pagination.limit} OFFSET ${offset}
    `);

    const countRows = await this.prisma.$queryRaw<
      Array<{ count: bigint }>
    >(Prisma.sql`
      WITH base AS (
        SELECT
          ae.id,
          (ae.acknowledged_at IS NULL AND ae.created_at + (ae.acknowledge_within_minutes || ' minutes')::interval < ${now}) AS ack_breached,
          (ae.resolved_at IS NULL AND ae.created_at + (ae.resolve_within_minutes || ' minutes')::interval < ${now}) AS res_breached
        FROM alert_events ae
        WHERE ${whereClause}
      )
      SELECT COUNT(*)::bigint AS count FROM base
      WHERE 1=1 ${breachCondition}
    `);

    const total = Number(countRows[0]?.count ?? 0);

    const items = rows.map((r) => ({
      alertEventId: r.id,
      severity: r.severity,
      status: r.status,
      createdAt: r.created_at,
      acknowledgedAt: r.acknowledged_at,
      resolvedAt: r.resolved_at,
      sourceType: r.source_type,
      sourceId: r.source_id,
      scope: {
        brandId: r.brand_id,
        locationId: r.location_id,
        zoneId: r.zone_id,
      },
      sla: {
        acknowledgeWithinMinutes: r.ack_within,
        resolveWithinMinutes: r.res_within,
        acknowledgeBy: r.acknowledge_by,
        resolveBy: r.resolve_by,
        acknowledgeBreached: r.ack_breached,
        resolveBreached: r.res_breached,
      },
    }));

    return { items, total };
  }

  /**
   * Get escalation summary: total active alerts, breach counts, severity breakdown.
   * Uses application-provided now for deterministic breach computation.
   */
  async getEscalationsSummary(
    organizationId: string,
    filters: {
      brandId?: string;
      locationId?: string;
      zoneId?: string;
      severity?: string;
      status?: 'OPEN' | 'ACKNOWLEDGED';
    },
    now: Date,
  ): Promise<{
    totalActiveAlerts: number;
    acknowledgeBreached: number;
    resolveBreached: number;
    bySeverity: Record<
      string,
      { total: number; acknowledgeBreached: number; resolveBreached: number }
    >;
  }> {
    const baseConditions: Prisma.Sql[] = [
      Prisma.sql`ae.organization_id = ${organizationId}`,
      Prisma.sql`ae.status IN ('OPEN', 'ACKNOWLEDGED')`,
    ];
    if (filters.brandId != null) {
      baseConditions.push(Prisma.sql`ae.brand_id = ${filters.brandId}`);
    }
    if (filters.locationId != null) {
      baseConditions.push(Prisma.sql`ae.location_id = ${filters.locationId}`);
    }
    if (filters.zoneId != null) {
      baseConditions.push(Prisma.sql`ae.zone_id = ${filters.zoneId}`);
    }
    if (filters.severity != null) {
      baseConditions.push(Prisma.sql`ae.severity = ${filters.severity}`);
    }
    if (filters.status != null) {
      baseConditions.push(Prisma.sql`ae.status = ${filters.status}`);
    }
    const whereClause = Prisma.join(baseConditions, ' AND ');

    const rows = await this.prisma.$queryRaw<
      Array<{
        severity_bucket: string;
        total: bigint;
        acknowledge_breached: bigint;
        resolve_breached: bigint;
      }>
    >(Prisma.sql`
      WITH base AS (
        SELECT
          ae.severity,
          (ae.acknowledged_at IS NULL AND ae.created_at + (ae.acknowledge_within_minutes || ' minutes')::interval < ${now}) AS ack_breached,
          (ae.resolved_at IS NULL AND ae.created_at + (ae.resolve_within_minutes || ' minutes')::interval < ${now}) AS res_breached
        FROM alert_events ae
        WHERE ${whereClause}
      )
      SELECT
        CASE
          WHEN UPPER(TRIM(COALESCE(severity, ''))) = 'CRITICAL' THEN 'critical'
          WHEN UPPER(TRIM(COALESCE(severity, ''))) = 'HIGH' THEN 'high'
          WHEN UPPER(TRIM(COALESCE(severity, ''))) = 'MEDIUM' THEN 'medium'
          WHEN UPPER(TRIM(COALESCE(severity, ''))) = 'LOW' THEN 'low'
          ELSE 'unknown'
        END AS severity_bucket,
        COUNT(*)::bigint AS total,
        COUNT(*) FILTER (WHERE ack_breached)::bigint AS acknowledge_breached,
        COUNT(*) FILTER (WHERE res_breached)::bigint AS resolve_breached
      FROM base
      GROUP BY 1
    `);

    const severityBuckets = ['critical', 'high', 'medium', 'low', 'unknown'] as const;
    const bySeverity: Record<
      string,
      { total: number; acknowledgeBreached: number; resolveBreached: number }
    > = {};
    for (const bucket of severityBuckets) {
      bySeverity[bucket] = {
        total: 0,
        acknowledgeBreached: 0,
        resolveBreached: 0,
      };
    }

    let totalActiveAlerts = 0;
    let acknowledgeBreached = 0;
    let resolveBreached = 0;

    for (const r of rows) {
      const bucket = r.severity_bucket?.toLowerCase() ?? 'unknown';
      const total = Number(r.total);
      const ackBr = Number(r.acknowledge_breached);
      const resBr = Number(r.resolve_breached);

      totalActiveAlerts += total;
      acknowledgeBreached += ackBr;
      resolveBreached += resBr;

      const key = severityBuckets.includes(bucket as (typeof severityBuckets)[number])
        ? bucket
        : 'unknown';
      bySeverity[key] = {
        total: (bySeverity[key]?.total ?? 0) + total,
        acknowledgeBreached: (bySeverity[key]?.acknowledgeBreached ?? 0) + ackBr,
        resolveBreached: (bySeverity[key]?.resolveBreached ?? 0) + resBr,
      };
    }

    return {
      totalActiveAlerts,
      acknowledgeBreached,
      resolveBreached,
      bySeverity,
    };
  }

  /**
   * Get escalation summary grouped by location.
   * Uses application-provided now for deterministic breach computation.
   * Ordered by resolveBreached DESC, acknowledgeBreached DESC, totalActiveAlerts DESC, locationId ASC NULLS LAST.
   */
  async getEscalationsSummaryByLocation(
    organizationId: string,
    filters: {
      brandId?: string;
      locationId?: string;
      zoneId?: string;
      severity?: string;
      status?: 'OPEN' | 'ACKNOWLEDGED';
    },
    now: Date,
  ): Promise<{
    items: Array<{
      locationId: string | null;
      totalActiveAlerts: number;
      acknowledgeBreached: number;
      resolveBreached: number;
      bySeverity: Record<
        string,
        { total: number; acknowledgeBreached: number; resolveBreached: number }
      >;
    }>;
  }> {
    const baseConditions: Prisma.Sql[] = [
      Prisma.sql`ae.organization_id = ${organizationId}`,
      Prisma.sql`ae.status IN ('OPEN', 'ACKNOWLEDGED')`,
    ];
    if (filters.brandId != null) {
      baseConditions.push(Prisma.sql`ae.brand_id = ${filters.brandId}`);
    }
    if (filters.locationId != null) {
      baseConditions.push(Prisma.sql`ae.location_id = ${filters.locationId}`);
    }
    if (filters.zoneId != null) {
      baseConditions.push(Prisma.sql`ae.zone_id = ${filters.zoneId}`);
    }
    if (filters.severity != null) {
      baseConditions.push(Prisma.sql`ae.severity = ${filters.severity}`);
    }
    if (filters.status != null) {
      baseConditions.push(Prisma.sql`ae.status = ${filters.status}`);
    }
    const whereClause = Prisma.join(baseConditions, ' AND ');

    const rows = await this.prisma.$queryRaw<
      Array<{
        location_id: string | null;
        severity_bucket: string;
        total: bigint;
        acknowledge_breached: bigint;
        resolve_breached: bigint;
      }>
    >(Prisma.sql`
      WITH base AS (
        SELECT
          ae.location_id,
          ae.severity,
          (ae.acknowledged_at IS NULL AND ae.created_at + (ae.acknowledge_within_minutes || ' minutes')::interval < ${now}) AS ack_breached,
          (ae.resolved_at IS NULL AND ae.created_at + (ae.resolve_within_minutes || ' minutes')::interval < ${now}) AS res_breached
        FROM alert_events ae
        WHERE ${whereClause}
      )
      SELECT
        location_id,
        CASE
          WHEN UPPER(TRIM(COALESCE(severity, ''))) = 'CRITICAL' THEN 'critical'
          WHEN UPPER(TRIM(COALESCE(severity, ''))) = 'HIGH' THEN 'high'
          WHEN UPPER(TRIM(COALESCE(severity, ''))) = 'MEDIUM' THEN 'medium'
          WHEN UPPER(TRIM(COALESCE(severity, ''))) = 'LOW' THEN 'low'
          ELSE 'unknown'
        END AS severity_bucket,
        COUNT(*)::bigint AS total,
        COUNT(*) FILTER (WHERE ack_breached)::bigint AS acknowledge_breached,
        COUNT(*) FILTER (WHERE res_breached)::bigint AS resolve_breached
      FROM base
      GROUP BY location_id, 2
    `);

    const severityBuckets = ['critical', 'high', 'medium', 'low', 'unknown'] as const;
    const createZeroBySeverity = () => {
      const r: Record<
        string,
        { total: number; acknowledgeBreached: number; resolveBreached: number }
      > = {};
      for (const bucket of severityBuckets) {
        r[bucket] = { total: 0, acknowledgeBreached: 0, resolveBreached: 0 };
      }
      return r;
    };

    const byLocation = new Map<
      string,
      {
        totalActiveAlerts: number;
        acknowledgeBreached: number;
        resolveBreached: number;
        bySeverity: Record<
          string,
          { total: number; acknowledgeBreached: number; resolveBreached: number }
        >;
      }
    >();

    for (const r of rows) {
      const locKey = r.location_id ?? '__null__';
      if (!byLocation.has(locKey)) {
        byLocation.set(locKey, {
          totalActiveAlerts: 0,
          acknowledgeBreached: 0,
          resolveBreached: 0,
          bySeverity: createZeroBySeverity(),
        });
      }
      const loc = byLocation.get(locKey)!;
      const bucket = r.severity_bucket?.toLowerCase() ?? 'unknown';
      const key = severityBuckets.includes(bucket as (typeof severityBuckets)[number])
        ? bucket
        : 'unknown';
      const total = Number(r.total);
      const ackBr = Number(r.acknowledge_breached);
      const resBr = Number(r.resolve_breached);

      loc.totalActiveAlerts += total;
      loc.acknowledgeBreached += ackBr;
      loc.resolveBreached += resBr;
      loc.bySeverity[key] = {
        total: (loc.bySeverity[key]?.total ?? 0) + total,
        acknowledgeBreached: (loc.bySeverity[key]?.acknowledgeBreached ?? 0) + ackBr,
        resolveBreached: (loc.bySeverity[key]?.resolveBreached ?? 0) + resBr,
      };
    }

    const items = Array.from(byLocation.entries()).map(([locKey, loc]) => ({
      locationId: locKey === '__null__' ? null : locKey,
      totalActiveAlerts: loc.totalActiveAlerts,
      acknowledgeBreached: loc.acknowledgeBreached,
      resolveBreached: loc.resolveBreached,
      bySeverity: loc.bySeverity,
    }));

    items.sort((a, b) => {
      if (b.resolveBreached !== a.resolveBreached) return b.resolveBreached - a.resolveBreached;
      if (b.acknowledgeBreached !== a.acknowledgeBreached)
        return b.acknowledgeBreached - a.acknowledgeBreached;
      if (b.totalActiveAlerts !== a.totalActiveAlerts)
        return b.totalActiveAlerts - a.totalActiveAlerts;
      if (a.locationId === null && b.locationId === null) return 0;
      if (a.locationId === null) return 1;
      if (b.locationId === null) return -1;
      return a.locationId.localeCompare(b.locationId);
    });

    return { items };
  }

  /**
   * Get escalation trends: time-series counts of active alerts and breach flags by bucket.
   * Buckets by alert createdAt. Uses application-provided now for deterministic breach computation.
   */
  async getEscalationsTrends(
    organizationId: string,
    filters: {
      brandId?: string;
      locationId?: string;
      zoneId?: string;
      severity?: string;
      status?: 'OPEN' | 'ACKNOWLEDGED';
      from?: string;
      to?: string;
    },
    interval: 'day' | 'week' | 'month',
    now: Date,
  ): Promise<
    Array<{
      date: string;
      totalActiveAlerts: number;
      acknowledgeBreached: number;
      resolveBreached: number;
    }>
  > {
    const safeInterval = ['day', 'week', 'month'].includes(interval)
      ? interval
      : 'day';

    const baseConditions: Prisma.Sql[] = [
      Prisma.sql`ae.organization_id = ${organizationId}`,
      Prisma.sql`ae.status IN ('OPEN', 'ACKNOWLEDGED')`,
    ];
    if (filters.brandId != null) {
      baseConditions.push(Prisma.sql`ae.brand_id = ${filters.brandId}`);
    }
    if (filters.locationId != null) {
      baseConditions.push(Prisma.sql`ae.location_id = ${filters.locationId}`);
    }
    if (filters.zoneId != null) {
      baseConditions.push(Prisma.sql`ae.zone_id = ${filters.zoneId}`);
    }
    if (filters.severity != null) {
      baseConditions.push(Prisma.sql`ae.severity = ${filters.severity}`);
    }
    if (filters.status != null) {
      baseConditions.push(Prisma.sql`ae.status = ${filters.status}`);
    }
    if (filters.from != null) {
      baseConditions.push(Prisma.sql`ae.created_at >= ${new Date(filters.from)}`);
    }
    if (filters.to != null) {
      baseConditions.push(Prisma.sql`ae.created_at <= ${new Date(filters.to)}`);
    }
    const whereClause = Prisma.join(baseConditions, ' AND ');

    const rows = await this.prisma.$queryRaw<
      Array<{
        bucket: Date;
        total_active_alerts: bigint;
        acknowledge_breached: bigint;
        resolve_breached: bigint;
      }>
    >(Prisma.sql`
      WITH base AS (
        SELECT
          DATE_TRUNC(${safeInterval}, ae.created_at)::date AS bucket,
          (ae.acknowledged_at IS NULL AND ae.created_at + (ae.acknowledge_within_minutes || ' minutes')::interval < ${now}) AS ack_breached,
          (ae.resolved_at IS NULL AND ae.created_at + (ae.resolve_within_minutes || ' minutes')::interval < ${now}) AS res_breached
        FROM alert_events ae
        WHERE ${whereClause}
      )
      SELECT
        base.bucket,
        COUNT(*)::bigint AS total_active_alerts,
        COUNT(*) FILTER (WHERE base.ack_breached)::bigint AS acknowledge_breached,
        COUNT(*) FILTER (WHERE base.res_breached)::bigint AS resolve_breached
      FROM base
      GROUP BY base.bucket
      ORDER BY base.bucket ASC
    `);

    return rows.map((r) => ({
      date:
        r.bucket instanceof Date
          ? r.bucket.toISOString().slice(0, 10)
          : String(r.bucket).slice(0, 10),
      totalActiveAlerts: Number(r.total_active_alerts ?? 0),
      acknowledgeBreached: Number(r.acknowledge_breached ?? 0),
      resolveBreached: Number(r.resolve_breached ?? 0),
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
