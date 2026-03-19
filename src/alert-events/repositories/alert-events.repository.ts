import { Injectable } from '@nestjs/common';
import { Prisma, AlertStatus } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

export type PrismaTransactionClient = Prisma.TransactionClient;

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

  async create(
    data: {
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
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = (tx ?? this.prisma) as Prisma.TransactionClient;
    return client.alertEvent.create({
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

  async findById(
    organizationId: string,
    id: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = (tx ?? this.prisma) as Prisma.TransactionClient;
    return client.alertEvent.findFirst({
      where: { id, organizationId },
      include: {
        assignedToUser: {
          select: { id: true, name: true },
        },
      },
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
      assignedToUserId?: string | null;
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
    if (filters.assignedToUserId !== undefined) {
      if (filters.assignedToUserId === null) {
        where.assignedToUserId = null;
      } else {
        where.assignedToUserId = filters.assignedToUserId;
      }
    }
    if (filters.from || filters.to) {
      where.triggeredAt = {};
      if (filters.from) (where.triggeredAt as Prisma.DateTimeFilter).gte = new Date(filters.from);
      if (filters.to) {
        const toDate = new Date(filters.to);
        // Date-only YYYY-MM-DD: treat as through end of day UTC (use lt next day)
        if (filters.to.length <= 10) {
          toDate.setUTCDate(toDate.getUTCDate() + 1);
          (where.triggeredAt as Prisma.DateTimeFilter).lt = toDate;
        } else {
          (where.triggeredAt as Prisma.DateTimeFilter).lte = toDate;
        }
      }
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
        include: {
          assignedToUser: {
            select: { id: true, name: true },
          },
        },
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
      assignedToUserId?: string | null;
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
      Prisma.sql`ae.organization_id = (${organizationId})::uuid`,
      Prisma.sql`ae.status IN ('OPEN', 'ACKNOWLEDGED')`,
    ];
    if (filters.brandId != null) {
      baseConditions.push(Prisma.sql`ae.brand_id = (${filters.brandId})::uuid`);
    }
    if (filters.locationId != null) {
      baseConditions.push(Prisma.sql`ae.location_id = (${filters.locationId})::uuid`);
    }
    if (filters.zoneId != null) {
      baseConditions.push(Prisma.sql`ae.zone_id = (${filters.zoneId})::uuid`);
    }
    if (filters.severity != null) {
      baseConditions.push(Prisma.sql`ae.severity = ${filters.severity}`);
    }
    if (filters.status != null) {
      baseConditions.push(Prisma.sql`ae.status = ${filters.status}`);
    }
    if (filters.assignedToUserId !== undefined) {
      if (filters.assignedToUserId === null) {
        baseConditions.push(Prisma.sql`ae.assigned_to_user_id IS NULL`);
      } else {
        baseConditions.push(Prisma.sql`ae.assigned_to_user_id = (${filters.assignedToUserId})::uuid`);
      }
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
   * List prioritized escalations: most urgent active alerts first.
   * Uses application-provided now for breach and overdue computation.
   * Priority: resolve breached > acknowledge breached > active not breached.
   * Within group: severity (CRITICAL>HIGH>MEDIUM>LOW), then overdue duration or createdAt.
   */
  async listPrioritizedEscalations(
    organizationId: string,
    filters: {
      brandId?: string;
      locationId?: string;
      zoneId?: string;
      severity?: string;
      status?: 'OPEN' | 'ACKNOWLEDGED';
      assignedToUserId?: string | null;
    },
    limit: number,
    now: Date,
  ): Promise<
    Array<{
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
        acknowledgeOverdueMinutes: number;
        resolveOverdueMinutes: number;
      };
      priority: {
        rankGroup: 'RESOLVE_BREACHED' | 'ACKNOWLEDGE_BREACHED' | 'ACTIVE_NOT_BREACHED';
        scoreHint: number;
      };
    }>
  > {
    const baseConditions: Prisma.Sql[] = [
      Prisma.sql`ae.organization_id = (${organizationId})::uuid`,
      Prisma.sql`ae.status IN ('OPEN', 'ACKNOWLEDGED')`,
    ];
    if (filters.brandId != null) {
      baseConditions.push(Prisma.sql`ae.brand_id = (${filters.brandId})::uuid`);
    }
    if (filters.locationId != null) {
      baseConditions.push(Prisma.sql`ae.location_id = (${filters.locationId})::uuid`);
    }
    if (filters.zoneId != null) {
      baseConditions.push(Prisma.sql`ae.zone_id = (${filters.zoneId})::uuid`);
    }
    if (filters.severity != null) {
      baseConditions.push(Prisma.sql`ae.severity = ${filters.severity}`);
    }
    if (filters.status != null) {
      baseConditions.push(Prisma.sql`ae.status = ${filters.status}`);
    }
    if (filters.assignedToUserId !== undefined) {
      if (filters.assignedToUserId === null) {
        baseConditions.push(Prisma.sql`ae.assigned_to_user_id IS NULL`);
      } else {
        baseConditions.push(Prisma.sql`ae.assigned_to_user_id = (${filters.assignedToUserId})::uuid`);
      }
    }
    const whereClause = Prisma.join(baseConditions, ' AND ');

    const effectiveLimit = Math.min(Math.max(limit, 1), 100);

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
        ack_overdue_minutes: number;
        res_overdue_minutes: number;
        rank_group: string;
        score_hint: number;
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
          (ae.resolved_at IS NULL AND ae.created_at + (ae.resolve_within_minutes || ' minutes')::interval < ${now}) AS res_breached,
          CASE
            WHEN (ae.resolved_at IS NULL AND ae.created_at + (ae.resolve_within_minutes || ' minutes')::interval < ${now})
            THEN GREATEST(0, EXTRACT(EPOCH FROM (${now} - (ae.created_at + (ae.resolve_within_minutes || ' minutes')::interval))) / 60)::int
            ELSE 0
          END AS res_overdue_minutes,
          CASE
            WHEN (ae.acknowledged_at IS NULL AND ae.created_at + (ae.acknowledge_within_minutes || ' minutes')::interval < ${now})
            THEN GREATEST(0, EXTRACT(EPOCH FROM (${now} - (ae.created_at + (ae.acknowledge_within_minutes || ' minutes')::interval))) / 60)::int
            ELSE 0
          END AS ack_overdue_minutes,
          CASE
            WHEN (ae.resolved_at IS NULL AND ae.created_at + (ae.resolve_within_minutes || ' minutes')::interval < ${now}) THEN 1
            WHEN (ae.acknowledged_at IS NULL AND ae.created_at + (ae.acknowledge_within_minutes || ' minutes')::interval < ${now}) THEN 2
            ELSE 3
          END AS rank_group_num,
          CASE
            WHEN UPPER(TRIM(COALESCE(ae.severity, ''))) = 'CRITICAL' THEN 4
            WHEN UPPER(TRIM(COALESCE(ae.severity, ''))) = 'HIGH' THEN 3
            WHEN UPPER(TRIM(COALESCE(ae.severity, ''))) = 'MEDIUM' THEN 2
            WHEN UPPER(TRIM(COALESCE(ae.severity, ''))) = 'LOW' THEN 1
            ELSE 0
          END AS severity_rank
        FROM alert_events ae
        WHERE ${whereClause}
      )
      SELECT
        id,
        severity,
        status,
        created_at,
        acknowledged_at,
        resolved_at,
        source_type,
        source_id,
        brand_id,
        location_id,
        zone_id,
        ack_within,
        res_within,
        acknowledge_by,
        resolve_by,
        ack_breached,
        res_breached,
        ack_overdue_minutes,
        res_overdue_minutes,
        CASE rank_group_num
          WHEN 1 THEN 'RESOLVE_BREACHED'
          WHEN 2 THEN 'ACKNOWLEDGE_BREACHED'
          ELSE 'ACTIVE_NOT_BREACHED'
        END AS rank_group,
        CASE rank_group_num
          WHEN 1 THEN res_overdue_minutes
          WHEN 2 THEN ack_overdue_minutes
          ELSE 0
        END AS score_hint
      FROM base
      ORDER BY
        base.rank_group_num ASC,
        base.severity_rank DESC,
        CASE base.rank_group_num
          WHEN 1 THEN base.res_overdue_minutes
          ELSE 0
        END DESC,
        CASE base.rank_group_num
          WHEN 2 THEN base.ack_overdue_minutes
          ELSE 0
        END DESC,
        base.created_at ASC
      LIMIT ${effectiveLimit}
    `);

    const rankGroupMap = {
      RESOLVE_BREACHED: 'RESOLVE_BREACHED' as const,
      ACKNOWLEDGE_BREACHED: 'ACKNOWLEDGE_BREACHED' as const,
      ACTIVE_NOT_BREACHED: 'ACTIVE_NOT_BREACHED' as const,
    };

    return rows.map((r) => ({
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
        acknowledgeOverdueMinutes: r.ack_overdue_minutes,
        resolveOverdueMinutes: r.res_overdue_minutes,
      },
      priority: {
        rankGroup:
          rankGroupMap[r.rank_group as keyof typeof rankGroupMap] ??
          'ACTIVE_NOT_BREACHED',
        scoreHint: r.score_hint,
      },
    }));
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
      Prisma.sql`ae.organization_id = (${organizationId})::uuid`,
      Prisma.sql`ae.status IN ('OPEN', 'ACKNOWLEDGED')`,
    ];
    if (filters.brandId != null) {
      baseConditions.push(Prisma.sql`ae.brand_id = (${filters.brandId})::uuid`);
    }
    if (filters.locationId != null) {
      baseConditions.push(Prisma.sql`ae.location_id = (${filters.locationId})::uuid`);
    }
    if (filters.zoneId != null) {
      baseConditions.push(Prisma.sql`ae.zone_id = (${filters.zoneId})::uuid`);
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
   * Get SLA compliance summary for alerts created in a period.
   * Uses application-provided now for breach evaluation.
   * Acknowledge: withinSla = acknowledged on time; breached = acknowledged late OR unacknowledged past deadline.
   * Resolve: withinSla = resolved on time; breached = resolved late OR unresolved past deadline.
   * Alerts not yet past deadline (unacknowledged/unresolved) are not counted as evaluated.
   */
  async getSlaCompliance(
    organizationId: string,
    filters: {
      brandId?: string;
      locationId?: string;
      zoneId?: string;
      severity?: string;
      status?: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
      from?: string;
      to?: string;
    },
    now: Date,
  ): Promise<{
    totalAlerts: number;
    ackWithinSla: number;
    ackBreached: number;
    resWithinSla: number;
    resBreached: number;
  }> {
    const baseConditions: Prisma.Sql[] = [
      Prisma.sql`ae.organization_id = ${organizationId}`,
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
        total_alerts: bigint;
        ack_within_sla: bigint;
        ack_breached: bigint;
        res_within_sla: bigint;
        res_breached: bigint;
      }>
    >(Prisma.sql`
      WITH base AS (
        SELECT
          ae.acknowledged_at,
          ae.resolved_at,
          ae.created_at + (ae.acknowledge_within_minutes || ' minutes')::interval AS acknowledge_by,
          ae.created_at + (ae.resolve_within_minutes || ' minutes')::interval AS resolve_by
        FROM alert_events ae
        WHERE ${whereClause}
      )
      SELECT
        COUNT(*)::bigint AS total_alerts,
        COUNT(*) FILTER (WHERE b.acknowledged_at IS NOT NULL AND b.acknowledged_at <= b.acknowledge_by)::bigint AS ack_within_sla,
        COUNT(*) FILTER (WHERE (b.acknowledged_at IS NOT NULL AND b.acknowledged_at > b.acknowledge_by) OR (b.acknowledged_at IS NULL AND b.acknowledge_by < ${now}))::bigint AS ack_breached,
        COUNT(*) FILTER (WHERE b.resolved_at IS NOT NULL AND b.resolved_at <= b.resolve_by)::bigint AS res_within_sla,
        COUNT(*) FILTER (WHERE (b.resolved_at IS NOT NULL AND b.resolved_at > b.resolve_by) OR (b.resolved_at IS NULL AND b.resolve_by < ${now}))::bigint AS res_breached
      FROM base b
    `);

    const r = rows[0];
    return {
      totalAlerts: Number(r?.total_alerts ?? 0),
      ackWithinSla: Number(r?.ack_within_sla ?? 0),
      ackBreached: Number(r?.ack_breached ?? 0),
      resWithinSla: Number(r?.res_within_sla ?? 0),
      resBreached: Number(r?.res_breached ?? 0),
    };
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

  /**
   * SLA compliance summary for alerts triggered in a period.
   * Uses triggered_at for date range and SLA deadlines (triggered_at + minutes).
   */
  async getSlaComplianceSummary(
    organizationId: string,
    filters: { from?: string; to?: string },
    now: Date,
  ): Promise<{
    totalAlerts: number;
    acknowledgedWithinSla: number;
    acknowledgedBreached: number;
    resolvedWithinSla: number;
    resolvedBreached: number;
  }> {
    const baseConditions: Prisma.Sql[] = [
      Prisma.sql`ae.organization_id = (${organizationId})::uuid`,
    ];
    if (filters.from != null) {
      baseConditions.push(Prisma.sql`ae.triggered_at >= ${new Date(filters.from)}`);
    }
    if (filters.to != null) {
      baseConditions.push(Prisma.sql`ae.triggered_at <= ${new Date(filters.to)}`);
    }
    const whereClause = Prisma.join(baseConditions, ' AND ');

    const rows = await this.prisma.$queryRaw<
      Array<{
        total_alerts: bigint;
        ack_within_sla: bigint;
        ack_breached: bigint;
        res_within_sla: bigint;
        res_breached: bigint;
      }>
    >(Prisma.sql`
      WITH base AS (
        SELECT
          ae.acknowledged_at,
          ae.resolved_at,
          ae.triggered_at + (ae.acknowledge_within_minutes || ' minutes')::interval AS acknowledge_by,
          ae.triggered_at + (ae.resolve_within_minutes || ' minutes')::interval AS resolve_by
        FROM alert_events ae
        WHERE ${whereClause}
      )
      SELECT
        COUNT(*)::bigint AS total_alerts,
        COUNT(*) FILTER (WHERE b.acknowledged_at IS NOT NULL AND b.acknowledged_at <= b.acknowledge_by)::bigint AS ack_within_sla,
        COUNT(*) FILTER (WHERE (b.acknowledged_at IS NOT NULL AND b.acknowledged_at > b.acknowledge_by) OR (b.acknowledged_at IS NULL AND b.acknowledge_by < ${now}))::bigint AS ack_breached,
        COUNT(*) FILTER (WHERE b.resolved_at IS NOT NULL AND b.resolved_at <= b.resolve_by)::bigint AS res_within_sla,
        COUNT(*) FILTER (WHERE (b.resolved_at IS NOT NULL AND b.resolved_at > b.resolve_by) OR (b.resolved_at IS NULL AND b.resolve_by < ${now}))::bigint AS res_breached
      FROM base b
    `);

    const r = rows[0];
    return {
      totalAlerts: Number(r?.total_alerts ?? 0),
      acknowledgedWithinSla: Number(r?.ack_within_sla ?? 0),
      acknowledgedBreached: Number(r?.ack_breached ?? 0),
      resolvedWithinSla: Number(r?.res_within_sla ?? 0),
      resolvedBreached: Number(r?.res_breached ?? 0),
    };
  }

  /**
   * Escalation trend: daily buckets of triggered alerts with total and breached counts.
   * Breached = acknowledge or resolve deadline passed.
   */
  async getEscalationTrend(
    organizationId: string,
    days: number,
    now: Date,
  ): Promise<
    Array<{
      date: string;
      totalAlerts: number;
      breachedAlerts: number;
    }>
  > {
    const fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - days);
    fromDate.setHours(0, 0, 0, 0);

    const rows = await this.prisma.$queryRaw<
      Array<{
        bucket: Date;
        total_alerts: bigint;
        breached_alerts: bigint;
      }>
    >(Prisma.sql`
      WITH base AS (
        SELECT
          DATE_TRUNC('day', ae.triggered_at)::date AS bucket,
          (ae.acknowledged_at IS NULL AND ae.triggered_at + (ae.acknowledge_within_minutes || ' minutes')::interval < ${now})
            OR (ae.resolved_at IS NULL AND ae.triggered_at + (ae.resolve_within_minutes || ' minutes')::interval < ${now}) AS breached
        FROM alert_events ae
        WHERE ae.organization_id = (${organizationId})::uuid
          AND ae.triggered_at >= ${fromDate}
      )
      SELECT
        base.bucket,
        COUNT(*)::bigint AS total_alerts,
        COUNT(*) FILTER (WHERE base.breached)::bigint AS breached_alerts
      FROM base
      GROUP BY base.bucket
      ORDER BY base.bucket ASC
    `);

    return rows.map((r) => ({
      date:
        r.bucket instanceof Date
          ? r.bucket.toISOString().slice(0, 10)
          : String(r.bucket).slice(0, 10),
      totalAlerts: Number(r.total_alerts ?? 0),
      breachedAlerts: Number(r.breached_alerts ?? 0),
    }));
  }

  /**
   * Top problem sources by alert count.
   */
  async getTopProblemSources(
    organizationId: string,
    limit: number,
  ): Promise<
    Array<{
      sourceType: string;
      sourceId: string;
      count: number;
    }>
  > {
    const rows = await this.prisma.$queryRaw<
      Array<{ source_type: string; source_id: string; cnt: bigint }>
    >(Prisma.sql`
      SELECT
        ae.source_type,
        ae.source_id,
        COUNT(*)::bigint AS cnt
      FROM alert_events ae
      WHERE ae.organization_id = (${organizationId})::uuid
      GROUP BY ae.source_type, ae.source_id
      ORDER BY cnt DESC
      LIMIT ${limit}
    `);

    return rows.map((r) => ({
      sourceType: r.source_type,
      sourceId: r.source_id,
      count: Number(r.cnt ?? 0),
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
      assignedToUserId?: string | null;
      assignedAt?: Date | null;
      assignedByUserId?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = (tx ?? this.prisma) as Prisma.TransactionClient;
    await client.alertEvent.updateMany({
      where: { id, organizationId },
      data,
    });
    return this.findById(organizationId, id, tx);
  }

  async assign(
    organizationId: string,
    id: string,
    assignedToUserId: string,
    assignedByUserId: string | null,
    tx?: Prisma.TransactionClient,
  ) {
    const client = (tx ?? this.prisma) as Prisma.TransactionClient;
    const now = new Date();
    await client.alertEvent.updateMany({
      where: { id, organizationId },
      data: {
        assignedToUserId,
        assignedAt: now,
        assignedByUserId,
      },
    });
    return this.findById(organizationId, id, tx);
  }

  async unassign(
    organizationId: string,
    id: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = (tx ?? this.prisma) as Prisma.TransactionClient;
    await client.alertEvent.updateMany({
      where: { id, organizationId },
      data: {
        assignedToUserId: null,
        assignedAt: null,
        assignedByUserId: null,
      },
    });
    return this.findById(organizationId, id, tx);
  }
}
