import type { Prisma } from '@prisma/client';
import { DEFAULT_ORGANIZATION_ROLES } from './default-org-role-definitions';

export interface BootstrapDefaultOrganizationRolesResult {
  orgAdminRoleId: string;
}

/**
 * Creates the default org-scoped role set for a new organization (templates, schedules, runs,
 * alerts, structure, users as defined per role). Idempotent per organization only in the sense
 * that callers must invoke once at creation time — does not upsert existing roles.
 */
export async function bootstrapDefaultOrganizationRoles(
  tx: Prisma.TransactionClient,
  organizationId: string,
): Promise<BootstrapDefaultOrganizationRolesResult> {
  const allPermissions = await tx.permission.findMany({
    select: { id: true, key: true },
  });
  const permissionIdByKey = new Map(
    allPermissions.map((p) => [p.key, p.id] as const),
  );

  let orgAdminRoleId: string | null = null;

  for (const def of DEFAULT_ORGANIZATION_ROLES) {
    const role = await tx.role.create({
      data: {
        organizationId,
        key: def.key,
        name: def.name,
        scope: 'ORGANIZATION',
        isSystem: false,
      },
    });

    if (def.key === 'org_admin') {
      orgAdminRoleId = role.id;
    }

    const keys =
      def.permissionKeys === 'all'
        ? allPermissions.map((p) => p.key)
        : [...def.permissionKeys];

    const rows: { roleId: string; permissionId: string }[] = [];
    for (const key of keys) {
      const permissionId = permissionIdByKey.get(key);
      if (permissionId) {
        rows.push({ roleId: role.id, permissionId });
      }
    }

    if (rows.length > 0) {
      await tx.rolePermission.createMany({
        data: rows,
        skipDuplicates: true,
      });
    }
  }

  if (!orgAdminRoleId) {
    throw new Error('bootstrapDefaultOrganizationRoles: org_admin role was not created');
  }

  return { orgAdminRoleId };
}
