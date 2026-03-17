import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class AlertSlaPolicyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(organizationId: string, id: string) {
    return this.prisma.alertSlaPolicy.findFirst({
      where: { id, organizationId },
    });
  }

  /**
   * List policies with business-order severity (CRITICAL > HIGH > MEDIUM > LOW).
   * Uses raw SQL for CASE-based severity ordering.
   */
  async findMany(
    organizationId: string,
    filters: {
      brandId?: string;
      locationId?: string;
      severity?: string;
      isActive?: boolean;
    },
    pagination: { page: number; limit: number },
  ) {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`organization_id = ${organizationId}`,
    ];
    if (filters.brandId != null) {
      conditions.push(Prisma.sql`brand_id = ${filters.brandId}`);
    }
    if (filters.locationId != null) {
      conditions.push(Prisma.sql`location_id = ${filters.locationId}`);
    }
    if (filters.severity != null) {
      conditions.push(Prisma.sql`severity = ${filters.severity}`);
    }
    if (filters.isActive != null) {
      conditions.push(Prisma.sql`is_active = ${filters.isActive}`);
    }
    const whereClause = Prisma.join(conditions, ' AND ');
    const offset = (pagination.page - 1) * pagination.limit;

    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        organization_id: string;
        brand_id: string | null;
        location_id: string | null;
        zone_id: string | null;
        severity: string;
        acknowledge_within_minutes: number;
        resolve_within_minutes: number;
        is_active: boolean;
        created_at: Date;
        updated_at: Date;
      }>
    >(Prisma.sql`
      SELECT id, organization_id, brand_id, location_id, zone_id,
             severity, acknowledge_within_minutes, resolve_within_minutes,
             is_active, created_at, updated_at
      FROM alert_sla_policies
      WHERE ${whereClause}
      ORDER BY
        is_active DESC,
        location_id DESC NULLS LAST,
        brand_id DESC NULLS LAST,
        CASE severity
          WHEN 'CRITICAL' THEN 4
          WHEN 'HIGH' THEN 3
          WHEN 'MEDIUM' THEN 2
          WHEN 'LOW' THEN 1
          ELSE 0
        END DESC,
        created_at DESC
      LIMIT ${pagination.limit} OFFSET ${offset}
    `);

    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organization_id,
      brandId: r.brand_id,
      locationId: r.location_id,
      zoneId: r.zone_id,
      severity: r.severity,
      acknowledgeWithinMinutes: r.acknowledge_within_minutes,
      resolveWithinMinutes: r.resolve_within_minutes,
      isActive: r.is_active,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async count(
    organizationId: string,
    filters: {
      brandId?: string;
      locationId?: string;
      severity?: string;
      isActive?: boolean;
    },
  ) {
    const where: Prisma.AlertSlaPolicyWhereInput = { organizationId };
    if (filters.brandId != null) where.brandId = filters.brandId;
    if (filters.locationId != null) where.locationId = filters.locationId;
    if (filters.severity != null) where.severity = filters.severity;
    if (filters.isActive != null) where.isActive = filters.isActive;

    return this.prisma.alertSlaPolicy.count({ where });
  }

  /**
   * Find another active policy with the same scope + severity.
   * Exclude policyId when checking for update conflicts.
   */
  async findConflictingActivePolicy(
    organizationId: string,
    scope: {
      severity: string;
      brandId: string | null;
      locationId: string | null;
      zoneId: string | null;
    },
    excludePolicyId?: string,
  ) {
    const where: Prisma.AlertSlaPolicyWhereInput = {
      organizationId,
      severity: scope.severity,
      brandId: scope.brandId,
      locationId: scope.locationId,
      zoneId: scope.zoneId,
      isActive: true,
    };
    if (excludePolicyId) {
      where.id = { not: excludePolicyId };
    }

    return this.prisma.alertSlaPolicy.findFirst({
      where,
      select: { id: true },
    });
  }

  async create(data: {
    organizationId: string;
    severity: string;
    brandId?: string | null;
    locationId?: string | null;
    zoneId?: string | null;
    acknowledgeWithinMinutes: number;
    resolveWithinMinutes: number;
    isActive: boolean;
  }) {
    return this.prisma.alertSlaPolicy.create({
      data: {
        ...data,
        brandId: data.brandId ?? null,
        locationId: data.locationId ?? null,
        zoneId: data.zoneId ?? null,
      },
    });
  }

  async update(
    organizationId: string,
    id: string,
    data: {
      severity?: string;
      brandId?: string | null;
      locationId?: string | null;
      zoneId?: string | null;
      acknowledgeWithinMinutes?: number;
      resolveWithinMinutes?: number;
      isActive?: boolean;
    },
  ) {
    await this.prisma.alertSlaPolicy.updateMany({
      where: { id, organizationId },
      data,
    });
    return this.findById(organizationId, id);
  }
}
