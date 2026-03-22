import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AlertEventsRepository } from '../../../alert-events/repositories/alert-events.repository';

export interface FailedItemFilters {
  brandId?: string;
  locationId?: string;
  zoneId?: string;
  checklistTemplateId?: string;
  severity?: string;
  from?: string;
  to?: string;
  timezone?: string;
}

export type FailuresTrendsInterval = 'day' | 'week' | 'month';

const FAILURES_TRENDS_INTERVALS: FailuresTrendsInterval[] = [
  'day',
  'week',
  'month',
];

@Injectable()
export class ChecklistRunItemsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alertEventsRepo: AlertEventsRepository,
  ) {}

  /**
   * Find failed ChecklistRunItemSnapshot IDs in correct sort order using raw SQL.
   * Sort: severity (CRITICAL>HIGH>MEDIUM>LOW>null), effective run date desc, created_at desc, id desc.
   */
  async findFailedItemIds(
    organizationId: string,
    filters: FailedItemFilters,
    pagination: { page: number; limit: number },
  ): Promise<string[]> {
    const conditions = this.buildWhereConditions(organizationId, filters);
    const whereClause =
      conditions.length > 0 ? Prisma.join(conditions, ' AND ') : Prisma.empty;
    const offset = (pagination.page - 1) * pagination.limit;

    const rows = await this.prisma.$queryRaw<
      Array<{ id: string }>
    >(Prisma.sql`
      SELECT cri.id
      FROM checklist_run_item_snapshots cri
      INNER JOIN checklist_runs cr ON cr.id = cri.checklist_run_id
      WHERE ${whereClause}
      ORDER BY
        CASE cri.severity_snapshot
          WHEN 'CRITICAL' THEN 4
          WHEN 'HIGH' THEN 3
          WHEN 'MEDIUM' THEN 2
          WHEN 'LOW' THEN 1
          ELSE 0
        END DESC,
        COALESCE(cr.due_at, cr.created_at) DESC,
        cri.created_at DESC,
        cri.id DESC
      LIMIT ${pagination.limit} OFFSET ${offset}
    `);

    return rows.map((r) => r.id);
  }

  /**
   * Get dashboard summary for failed checklist run items.
   * Counts only the latest related alert per item for alert status buckets.
   */
  async getFailedItemsSummary(
    organizationId: string,
    filters: FailedItemFilters,
  ): Promise<{
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    unknown: number;
    affectedRuns: number;
    openAlerts: number;
    acknowledgedAlerts: number;
    resolvedAlerts: number;
  }> {
    const conditions = this.buildWhereConditions(organizationId, filters);
    const whereClause =
      conditions.length > 0 ? Prisma.join(conditions, ' AND ') : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      Array<{
        total: bigint;
        critical: bigint;
        high: bigint;
        medium: bigint;
        low: bigint;
        unknown: bigint;
        affected_runs: bigint;
        open_alerts: bigint;
        acknowledged_alerts: bigint;
        resolved_alerts: bigint;
      }>
    >(Prisma.sql`
      WITH filtered_failed_items AS (
        SELECT cri.id, cri.severity_snapshot, cri.checklist_run_id
        FROM checklist_run_item_snapshots cri
        INNER JOIN checklist_runs cr ON cr.id = cri.checklist_run_id
        WHERE ${whereClause}
      ),
      latest_alerts AS (
        SELECT DISTINCT ON (ae.source_id) ae.source_id, ae.status
        FROM alert_events ae
        WHERE ae.organization_id = CAST(${organizationId} AS uuid)
          AND ae.source_type = 'CHECKLIST_RUN_ITEM'
          AND ae.source_id::uuid IN (SELECT id FROM filtered_failed_items)
        ORDER BY ae.source_id, ae.created_at DESC, ae.id DESC
      )
      SELECT
        (SELECT COUNT(*) FROM filtered_failed_items)::bigint AS total,
        (SELECT COUNT(*) FROM filtered_failed_items WHERE severity_snapshot = 'CRITICAL')::bigint AS critical,
        (SELECT COUNT(*) FROM filtered_failed_items WHERE severity_snapshot = 'HIGH')::bigint AS high,
        (SELECT COUNT(*) FROM filtered_failed_items WHERE severity_snapshot = 'MEDIUM')::bigint AS medium,
        (SELECT COUNT(*) FROM filtered_failed_items WHERE severity_snapshot = 'LOW')::bigint AS low,
        (SELECT COUNT(*) FROM filtered_failed_items WHERE severity_snapshot IS NULL OR severity_snapshot NOT IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW'))::bigint AS unknown,
        (SELECT COUNT(DISTINCT checklist_run_id) FROM filtered_failed_items)::bigint AS affected_runs,
        (SELECT COUNT(*) FROM latest_alerts WHERE status = 'OPEN')::bigint AS open_alerts,
        (SELECT COUNT(*) FROM latest_alerts WHERE status = 'ACKNOWLEDGED')::bigint AS acknowledged_alerts,
        (SELECT COUNT(*) FROM latest_alerts WHERE status = 'RESOLVED')::bigint AS resolved_alerts
    `);

    const r = rows[0];
    return {
      total: Number(r?.total ?? 0),
      critical: Number(r?.critical ?? 0),
      high: Number(r?.high ?? 0),
      medium: Number(r?.medium ?? 0),
      low: Number(r?.low ?? 0),
      unknown: Number(r?.unknown ?? 0),
      affectedRuns: Number(r?.affected_runs ?? 0),
      openAlerts: Number(r?.open_alerts ?? 0),
      acknowledgedAlerts: Number(r?.acknowledged_alerts ?? 0),
      resolvedAlerts: Number(r?.resolved_alerts ?? 0),
    };
  }

  /**
   * Get failed items summary grouped by locationId.
   * Counts only the latest related alert per item for alert status buckets.
   * Returns rows ordered by: critical DESC, open alerts DESC, total DESC, locationId ASC.
   */
  async getFailedItemsSummaryByLocation(
    organizationId: string,
    filters: FailedItemFilters,
  ): Promise<
    Array<{
      locationId: string | null;
      total: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
      unknown: number;
      affectedRuns: number;
      openAlerts: number;
      acknowledgedAlerts: number;
      resolvedAlerts: number;
    }>
  > {
    const conditions = this.buildWhereConditions(organizationId, filters);
    const whereClause =
      conditions.length > 0 ? Prisma.join(conditions, ' AND ') : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      Array<{
        location_id: string | null;
        total: bigint;
        critical: bigint;
        high: bigint;
        medium: bigint;
        low: bigint;
        unknown: bigint;
        affected_runs: bigint;
        open_alerts: bigint;
        acknowledged_alerts: bigint;
        resolved_alerts: bigint;
      }>
    >(Prisma.sql`
      WITH filtered_failed_items AS (
        SELECT cri.id, cri.severity_snapshot, cri.checklist_run_id, cr.location_id
        FROM checklist_run_item_snapshots cri
        INNER JOIN checklist_runs cr ON cr.id = cri.checklist_run_id
        WHERE ${whereClause}
      ),
      latest_alerts AS (
        SELECT DISTINCT ON (ae.source_id) ae.source_id, ae.status
        FROM alert_events ae
        WHERE ae.organization_id = CAST(${organizationId} AS uuid)
          AND ae.source_type = 'CHECKLIST_RUN_ITEM'
          AND ae.source_id::uuid IN (SELECT id FROM filtered_failed_items)
        ORDER BY ae.source_id, ae.created_at DESC, ae.id DESC
      )
      SELECT
        ffi.location_id,
        COUNT(*)::bigint AS total,
        COUNT(*) FILTER (WHERE ffi.severity_snapshot = 'CRITICAL')::bigint AS critical,
        COUNT(*) FILTER (WHERE ffi.severity_snapshot = 'HIGH')::bigint AS high,
        COUNT(*) FILTER (WHERE ffi.severity_snapshot = 'MEDIUM')::bigint AS medium,
        COUNT(*) FILTER (WHERE ffi.severity_snapshot = 'LOW')::bigint AS low,
        COUNT(*) FILTER (WHERE ffi.severity_snapshot IS NULL OR ffi.severity_snapshot NOT IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW'))::bigint AS unknown,
        COUNT(DISTINCT ffi.checklist_run_id)::bigint AS affected_runs,
        COUNT(la.source_id) FILTER (WHERE la.status = 'OPEN')::bigint AS open_alerts,
        COUNT(la.source_id) FILTER (WHERE la.status = 'ACKNOWLEDGED')::bigint AS acknowledged_alerts,
        COUNT(la.source_id) FILTER (WHERE la.status = 'RESOLVED')::bigint AS resolved_alerts
      FROM filtered_failed_items ffi
      LEFT JOIN latest_alerts la ON la.source_id::uuid = ffi.id
      GROUP BY ffi.location_id
      ORDER BY
        COUNT(*) FILTER (WHERE ffi.severity_snapshot = 'CRITICAL') DESC,
        COUNT(la.source_id) FILTER (WHERE la.status = 'OPEN') DESC,
        COUNT(*) DESC,
        ffi.location_id ASC NULLS FIRST
    `);

    return rows.map((r) => ({
      locationId: r.location_id,
      total: Number(r.total ?? 0),
      critical: Number(r.critical ?? 0),
      high: Number(r.high ?? 0),
      medium: Number(r.medium ?? 0),
      low: Number(r.low ?? 0),
      unknown: Number(r.unknown ?? 0),
      affectedRuns: Number(r.affected_runs ?? 0),
      openAlerts: Number(r.open_alerts ?? 0),
      acknowledgedAlerts: Number(r.acknowledged_alerts ?? 0),
      resolvedAlerts: Number(r.resolved_alerts ?? 0),
    }));
  }

  /**
   * Get failed items summary grouped by checklist template.
   * Counts only the latest related alert per item for alert status buckets.
   * Returns rows ordered by: critical DESC, open alerts DESC, total DESC, templateName ASC.
   */
  async getFailedItemsSummaryByTemplate(
    organizationId: string,
    filters: FailedItemFilters,
  ): Promise<
    Array<{
      checklistTemplateId: string | null;
      templateName: string | null;
      total: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
      unknown: number;
      affectedRuns: number;
      openAlerts: number;
      acknowledgedAlerts: number;
      resolvedAlerts: number;
    }>
  > {
    const conditions = this.buildWhereConditions(organizationId, filters);
    const whereClause =
      conditions.length > 0 ? Prisma.join(conditions, ' AND ') : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      Array<{
        checklist_template_id: string | null;
        template_name_snapshot: string | null;
        total: bigint;
        critical: bigint;
        high: bigint;
        medium: bigint;
        low: bigint;
        unknown: bigint;
        affected_runs: bigint;
        open_alerts: bigint;
        acknowledged_alerts: bigint;
        resolved_alerts: bigint;
      }>
    >(Prisma.sql`
      WITH filtered_failed_items AS (
        SELECT cri.id, cri.severity_snapshot, cri.checklist_run_id, cr.checklist_template_id, cr.template_name_snapshot
        FROM checklist_run_item_snapshots cri
        INNER JOIN checklist_runs cr ON cr.id = cri.checklist_run_id
        WHERE ${whereClause}
      ),
      latest_alerts AS (
        SELECT DISTINCT ON (ae.source_id) ae.source_id, ae.status
        FROM alert_events ae
        WHERE ae.organization_id = CAST(${organizationId} AS uuid)
          AND ae.source_type = 'CHECKLIST_RUN_ITEM'
          AND ae.source_id::uuid IN (SELECT id FROM filtered_failed_items)
        ORDER BY ae.source_id, ae.created_at DESC, ae.id DESC
      )
      SELECT
        ffi.checklist_template_id,
        ffi.template_name_snapshot,
        COUNT(*)::bigint AS total,
        COUNT(*) FILTER (WHERE ffi.severity_snapshot = 'CRITICAL')::bigint AS critical,
        COUNT(*) FILTER (WHERE ffi.severity_snapshot = 'HIGH')::bigint AS high,
        COUNT(*) FILTER (WHERE ffi.severity_snapshot = 'MEDIUM')::bigint AS medium,
        COUNT(*) FILTER (WHERE ffi.severity_snapshot = 'LOW')::bigint AS low,
        COUNT(*) FILTER (WHERE ffi.severity_snapshot IS NULL OR ffi.severity_snapshot NOT IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW'))::bigint AS unknown,
        COUNT(DISTINCT ffi.checklist_run_id)::bigint AS affected_runs,
        COUNT(la.source_id) FILTER (WHERE la.status = 'OPEN')::bigint AS open_alerts,
        COUNT(la.source_id) FILTER (WHERE la.status = 'ACKNOWLEDGED')::bigint AS acknowledged_alerts,
        COUNT(la.source_id) FILTER (WHERE la.status = 'RESOLVED')::bigint AS resolved_alerts
      FROM filtered_failed_items ffi
      LEFT JOIN latest_alerts la ON la.source_id::uuid = ffi.id
      GROUP BY ffi.checklist_template_id, ffi.template_name_snapshot
      ORDER BY
        COUNT(*) FILTER (WHERE ffi.severity_snapshot = 'CRITICAL') DESC,
        COUNT(la.source_id) FILTER (WHERE la.status = 'OPEN') DESC,
        COUNT(*) DESC,
        ffi.template_name_snapshot ASC NULLS FIRST
    `);

    return rows.map((r) => ({
      checklistTemplateId: r.checklist_template_id,
      templateName: r.template_name_snapshot,
      total: Number(r.total ?? 0),
      critical: Number(r.critical ?? 0),
      high: Number(r.high ?? 0),
      medium: Number(r.medium ?? 0),
      low: Number(r.low ?? 0),
      unknown: Number(r.unknown ?? 0),
      affectedRuns: Number(r.affected_runs ?? 0),
      openAlerts: Number(r.open_alerts ?? 0),
      acknowledgedAlerts: Number(r.acknowledged_alerts ?? 0),
      resolvedAlerts: Number(r.resolved_alerts ?? 0),
    }));
  }

  /**
   * Get failed items trends over time, grouped by truncated effective date.
   * Uses effective date = COALESCE(due_at, created_at).
   * Returns only existing data points (no fill for missing dates).
   */
  async getFailedItemsTrends(
    organizationId: string,
    filters: FailedItemFilters,
    interval: FailuresTrendsInterval,
  ): Promise<
    Array<{
      date: string;
      total: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
      unknown: number;
    }>
  > {
    const safeInterval = FAILURES_TRENDS_INTERVALS.includes(interval)
      ? interval
      : 'day';
    const conditions = this.buildWhereConditions(organizationId, filters);
    const whereClause =
      conditions.length > 0 ? Prisma.join(conditions, ' AND ') : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      Array<{
        bucket: Date;
        total: bigint;
        critical: bigint;
        high: bigint;
        medium: bigint;
        low: bigint;
        unknown: bigint;
      }>
    >(Prisma.sql`
      SELECT
        DATE_TRUNC(${safeInterval}, COALESCE(cr.due_at, cr.created_at))::date AS bucket,
        COUNT(*)::bigint AS total,
        COUNT(*) FILTER (WHERE cri.severity_snapshot = 'CRITICAL')::bigint AS critical,
        COUNT(*) FILTER (WHERE cri.severity_snapshot = 'HIGH')::bigint AS high,
        COUNT(*) FILTER (WHERE cri.severity_snapshot = 'MEDIUM')::bigint AS medium,
        COUNT(*) FILTER (WHERE cri.severity_snapshot = 'LOW')::bigint AS low,
        COUNT(*) FILTER (WHERE cri.severity_snapshot IS NULL OR cri.severity_snapshot NOT IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW'))::bigint AS unknown
      FROM checklist_run_item_snapshots cri
      INNER JOIN checklist_runs cr ON cr.id = cri.checklist_run_id
      WHERE ${whereClause}
      GROUP BY DATE_TRUNC(${safeInterval}, COALESCE(cr.due_at, cr.created_at))
      ORDER BY bucket ASC
    `);

    return rows.map((r) => ({
      date: r.bucket instanceof Date ? r.bucket.toISOString().slice(0, 10) : String(r.bucket).slice(0, 10),
      total: Number(r.total ?? 0),
      critical: Number(r.critical ?? 0),
      high: Number(r.high ?? 0),
      medium: Number(r.medium ?? 0),
      low: Number(r.low ?? 0),
      unknown: Number(r.unknown ?? 0),
    }));
  }

  /**
   * Count failed ChecklistRunItemSnapshot rows matching filters.
   */
  async countFailedItems(
    organizationId: string,
    filters: FailedItemFilters,
  ): Promise<number> {
    const conditions = this.buildWhereConditions(organizationId, filters);
    const whereClause =
      conditions.length > 0 ? Prisma.join(conditions, ' AND ') : Prisma.empty;

    const result = await this.prisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`
        SELECT COUNT(*) as count
        FROM checklist_run_item_snapshots cri
        INNER JOIN checklist_runs cr ON cr.id = cri.checklist_run_id
        WHERE ${whereClause}
      `,
    );

    return Number(result[0]?.count ?? 0);
  }

  /**
   * Hydrate ChecklistRunItemSnapshot by IDs with selected fields and attachment count.
   * Returns items in the order of the provided ids array.
   */
  async findByIdsWithRunAndAttachmentCount(
    organizationId: string,
    ids: string[],
  ): Promise<
    Array<{
      id: string;
      checklistRunId: string;
      labelSnapshot: string;
      result: string | null;
      severitySnapshot: string;
      comment: string | null;
      _count: { attachments: number };
      checklistRun: {
        runNumber: number;
        templateNameSnapshot: string;
        dueAt: Date | null;
        brandId: string | null;
        locationId: string | null;
        zoneId: string | null;
      };
    }>
  > {
    if (ids.length === 0) return [];

    const items = await this.prisma.checklistRunItemSnapshot.findMany({
      where: { id: { in: ids }, organizationId },
      select: {
        id: true,
        checklistRunId: true,
        labelSnapshot: true,
        result: true,
        severitySnapshot: true,
        comment: true,
        _count: { select: { attachments: true } },
        checklistRun: {
          select: {
            runNumber: true,
            templateNameSnapshot: true,
            dueAt: true,
            brandId: true,
            locationId: true,
            zoneId: true,
          },
        },
      },
    });

    const byId = new Map(items.map((i) => [i.id, i]));
    return ids.map((id) => byId.get(id)!).filter(Boolean);
  }

  private buildWhereConditions(
    organizationId: string,
    filters: FailedItemFilters,
  ): Prisma.Sql[] {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`cri.organization_id = CAST(${organizationId} AS uuid)`,
      Prisma.sql`cri.result = 'FAIL'`,
    ];

    if (filters.brandId != null) {
      conditions.push(Prisma.sql`cr.brand_id = CAST(${filters.brandId} AS uuid)`);
    }
    if (filters.locationId != null) {
      conditions.push(Prisma.sql`cr.location_id = CAST(${filters.locationId} AS uuid)`);
    }
    if (filters.zoneId != null) {
      conditions.push(Prisma.sql`cr.zone_id = CAST(${filters.zoneId} AS uuid)`);
    }
    if (filters.checklistTemplateId != null) {
      conditions.push(
        Prisma.sql`cr.checklist_template_id = CAST(${filters.checklistTemplateId} AS uuid)`,
      );
    }
    if (filters.severity != null) {
      conditions.push(Prisma.sql`cri.severity_snapshot = ${filters.severity}`);
    }

    const zone = filters.timezone ?? 'UTC';
    if (filters.from != null) {
      const fromDt = DateTime.fromISO(filters.from, { zone });
      const fromDate = (fromDt.isValid ? fromDt : DateTime.now().setZone(zone))
        .startOf('day')
        .toUTC()
        .toJSDate();
      conditions.push(
        Prisma.sql`COALESCE(cr.due_at, cr.created_at) >= ${fromDate}`,
      );
    }
    if (filters.to != null) {
      const toDt = DateTime.fromISO(filters.to, { zone });
      const toDate = (toDt.isValid ? toDt : DateTime.now().setZone(zone))
        .endOf('day')
        .toUTC()
        .toJSDate();
      conditions.push(
        Prisma.sql`COALESCE(cr.due_at, cr.created_at) <= ${toDate}`,
      );
    }

    return conditions;
  }

  /**
   * Find item snapshots in date range for Checklist Item Status report.
   * One row per item, with section and run context. Paginated.
   */
  async findItemSnapshotsInDateRange(
    organizationId: string,
    filters: {
      start: Date;
      end: Date;
      brandId?: string;
      locationId?: string;
      zoneId?: string;
      checklistTemplateId?: string;
      assignedToUserId?: string;
      result?: 'PASS' | 'FAIL';
    },
    pagination: { page: number; limit: number },
  ): Promise<{
    items: Array<{
      id: string;
      checklistRunId: string;
      labelSnapshot: string;
      itemTypeSnapshot: string;
      result: string | null;
      comment: string | null;
      severitySnapshot: string;
      sortOrder: number;
      _count: { attachments: number };
      checklistRunSectionSnapshot: { titleSnapshot: string; sortOrder: number };
      checklistRun: {
        runNumber: number;
        templateNameSnapshot: string;
        dueAt: Date | null;
      };
    }>;
    total: number;
  }> {
    const runWhere: Prisma.ChecklistRunWhereInput = {
      organizationId,
      OR: [
        { dueAt: { gte: filters.start, lte: filters.end } },
        {
          dueAt: null,
          createdAt: { gte: filters.start, lte: filters.end },
        },
      ],
    };
    if (filters.brandId != null) runWhere.brandId = filters.brandId;
    if (filters.locationId != null) runWhere.locationId = filters.locationId;
    if (filters.zoneId != null) runWhere.zoneId = filters.zoneId;
    if (filters.checklistTemplateId != null)
      runWhere.checklistTemplateId = filters.checklistTemplateId;
    if (filters.assignedToUserId != null)
      runWhere.assignedToUserId = filters.assignedToUserId;

    const itemWhere: Prisma.ChecklistRunItemSnapshotWhereInput = {
      organizationId,
      checklistRun: runWhere,
    };
    if (filters.result != null) itemWhere.result = filters.result;

    const skip = (pagination.page - 1) * pagination.limit;
    const [items, total] = await Promise.all([
      this.prisma.checklistRunItemSnapshot.findMany({
        where: itemWhere,
        orderBy: [
          { checklistRun: { dueAt: 'desc' } },
          { checklistRunSectionSnapshot: { sortOrder: 'asc' } },
          { sortOrder: 'asc' } as const,
        ],
        skip,
        take: pagination.limit,
        select: {
          id: true,
          checklistRunId: true,
          labelSnapshot: true,
          itemTypeSnapshot: true,
          result: true,
          comment: true,
          severitySnapshot: true,
          sortOrder: true,
          _count: { select: { attachments: true } },
          checklistRunSectionSnapshot: {
            select: { titleSnapshot: true, sortOrder: true },
          },
          checklistRun: {
            select: {
              runNumber: true,
              templateNameSnapshot: true,
              dueAt: true,
            },
          },
        },
      }),
      this.prisma.checklistRunItemSnapshot.count({ where: itemWhere }),
    ]);

    return { items, total };
  }

  /**
   * Check if a ChecklistRunItemSnapshot exists within organization scope.
   * Returns minimal record or null. Used for tenant-safe existence checks.
   */
  async findById(organizationId: string, id: string) {
    return this.prisma.checklistRunItemSnapshot.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
  }

  /**
   * Find a single ChecklistRunItemSnapshot by id with full supervisor context.
   * Includes section snapshot, run, attachments (with file metadata), temperature readings, and related alert.
   */
  async findByIdWithContext(organizationId: string, id: string) {
    const item = await this.prisma.checklistRunItemSnapshot.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        checklistRunId: true,
        labelSnapshot: true,
        helpTextSnapshot: true,
        itemTypeSnapshot: true,
        result: true,
        comment: true,
        sortOrder: true,
        requiresEvidenceOnFailSnapshot: true,
        requiresCommentOnFailSnapshot: true,
        severitySnapshot: true,
        checklistRunSectionSnapshot: {
          select: {
            id: true,
            titleSnapshot: true,
            sortOrder: true,
          },
        },
        checklistRun: {
          select: {
            id: true,
            runNumber: true,
            status: true,
            templateNameSnapshot: true,
            dueAt: true,
            startedAt: true,
            completedAt: true,
            brandId: true,
            locationId: true,
            zoneId: true,
            performedByUserId: true,
          },
        },
        attachments: {
          select: {
            id: true,
            fileId: true,
            createdAt: true,
            file: {
              select: {
                fileName: true,
                mimeType: true,
              },
            },
          },
        },
      },
    });

    if (!item) return null;

    const [temperatureReadings, alertEvent] = await Promise.all([
      this.prisma.temperatureReading.findMany({
        where: {
          organizationId,
          checklistRunItemSnapshotId: id,
        },
        select: {
          id: true,
          readingValue: true,
          unit: true,
          recordedAt: true,
          isBreach: true,
          breachType: true,
          sourceType: true,
        },
        orderBy: { recordedAt: 'desc' },
      }),
      this.alertEventsRepo.findFirstBySource(
        organizationId,
        'CHECKLIST_RUN_ITEM',
        id,
      ),
    ]);

    return {
      ...item,
      temperatureReadings,
      alertEvent,
    };
  }
}
