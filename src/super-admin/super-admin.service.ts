import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../infra/prisma/prisma.service';

export interface SuperAdminTenantRow {
  id: string;
  name: string;
  createdAt: string;
  isDemo: boolean;
  userCount: number;
  checklistRunCount: number;
  lastActivityAt: string;
}

type TenantQueryRow = {
  id: string;
  name: string;
  created_at: Date;
  tenant_type: string;
  user_count: bigint;
  checklist_run_count: bigint;
  last_activity_at: Date;
};

@Injectable()
export class SuperAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listTenants(): Promise<SuperAdminTenantRow[]> {
    const rows = await this.prisma.$queryRaw<TenantQueryRow[]>(Prisma.sql`
      SELECT
        o.id,
        o.name,
        o.created_at,
        o.tenant_type::text AS tenant_type,
        COALESCE(uca.cnt, 0) AS user_count,
        COALESCE(rc.cnt, 0) AS checklist_run_count,
        GREATEST(
          o.updated_at,
          o.created_at,
          COALESCE(rc.max_updated, o.updated_at)
        ) AS last_activity_at
      FROM organizations o
      LEFT JOIN (
        SELECT organization_id, COUNT(DISTINCT user_id) AS cnt
        FROM user_role_assignments
        GROUP BY organization_id
      ) uca ON uca.organization_id = o.id
      LEFT JOIN (
        SELECT organization_id, COUNT(*) AS cnt, MAX(updated_at) AS max_updated
        FROM checklist_runs
        GROUP BY organization_id
      ) rc ON rc.organization_id = o.id
      WHERE o.deleted_at IS NULL
      ORDER BY o.name ASC
    `);

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: r.created_at.toISOString(),
      isDemo: inferIsDemo(r.tenant_type, r.name),
      userCount: Number(r.user_count),
      checklistRunCount: Number(r.checklist_run_count),
      lastActivityAt: r.last_activity_at.toISOString(),
    }));
  }
}

function inferIsDemo(tenantType: string, name: string): boolean {
  if (tenantType === 'DEMO') return true;
  const n = name.trim().toLowerCase();
  return n.includes('demo');
}
