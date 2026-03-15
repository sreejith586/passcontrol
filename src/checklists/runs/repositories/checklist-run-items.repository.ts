import { Injectable } from '@nestjs/common';
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
}

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
      Prisma.sql`cri.organization_id = ${organizationId}`,
      Prisma.sql`cri.result = 'FAIL'`,
    ];

    if (filters.brandId != null) {
      conditions.push(Prisma.sql`cr.brand_id = ${filters.brandId}`);
    }
    if (filters.locationId != null) {
      conditions.push(Prisma.sql`cr.location_id = ${filters.locationId}`);
    }
    if (filters.zoneId != null) {
      conditions.push(Prisma.sql`cr.zone_id = ${filters.zoneId}`);
    }
    if (filters.checklistTemplateId != null) {
      conditions.push(
        Prisma.sql`cr.checklist_template_id = ${filters.checklistTemplateId}`,
      );
    }
    if (filters.severity != null) {
      conditions.push(Prisma.sql`cri.severity_snapshot = ${filters.severity}`);
    }

    if (filters.from != null) {
      const fromDate = new Date(filters.from);
      conditions.push(
        Prisma.sql`COALESCE(cr.due_at, cr.created_at) >= ${fromDate}`,
      );
    }
    if (filters.to != null) {
      const toDate = new Date(filters.to);
      conditions.push(
        Prisma.sql`COALESCE(cr.due_at, cr.created_at) <= ${toDate}`,
      );
    }

    return conditions;
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
