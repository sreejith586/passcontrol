import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { listRoles, listUsers } from '@/features/users/api';
import { queryKeys } from '@/features/users/query-keys';
import type { Role } from '@/features/users/api';
import { PageHeader } from '@/shared/layout/PageHeader';
import { Breadcrumbs } from '@/shared/layout/Breadcrumbs';
import { ErrorState } from '@/shared/layout/ErrorState';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Skeleton } from '@/shared/ui/Skeleton';
import { getRoleMetadata } from './role-metadata';
import {
  groupPermissionsByCategory,
  getPermissionLabel,
  CATEGORY_ORDER,
  PERMISSION_GROUPS,
} from './permission-groups';

/** Sort roles by privilege level for display. */
const ROLE_DISPLAY_ORDER = [
  'super_admin',
  'org_admin',
  'area_manager',
  'restaurant_manager',
  'kitchen_supervisor',
  'shift_lead',
  'operator',
  'auditor',
  'viewer',
];

function sortRoles(roles: Role[]): Role[] {
  const orderMap = Object.fromEntries(
    ROLE_DISPLAY_ORDER.map((k, i) => [k, i])
  );
  return [...roles].sort((a, b) => {
    const ai = orderMap[a.key] ?? 999;
    const bi = orderMap[b.key] ?? 999;
    return ai - bi;
  });
}

function RoleDetailsPanel({
  role,
  userCount,
}: {
  role: Role;
  userCount: number | undefined;
}) {
  const metadata = getRoleMetadata(role.key);
  const grouped = groupPermissionsByCategory(role.permissions);
  const isHighAccess = role.key === 'super_admin';

  return (
    <div className="flex flex-col">
      <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">
            {metadata.displayName}
          </h2>
          {isHighAccess && (
            <Badge variant="warning" className="text-xs">
              High access
            </Badge>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>{metadata.scopeLabel}</span>
          <span aria-hidden>·</span>
          <span>{metadata.intendedUserType}</span>
          {userCount !== undefined && (
            <>
              <span aria-hidden>·</span>
              <span>
                {userCount} {userCount === 1 ? 'user' : 'users'}
              </span>
            </>
          )}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {metadata.description}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <h3 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Capabilities
        </h3>
        <div className="space-y-6">
          {CATEGORY_ORDER.filter((cat) => grouped[cat]?.length).map((cat) => (
            <div key={cat}>
              <h4 className="mb-2 text-sm font-medium text-foreground">
                {PERMISSION_GROUPS[cat]?.label ?? cat}
              </h4>
              <ul className="space-y-1.5">
                {grouped[cat].map((perm) => (
                  <li
                    key={perm}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600"
                      aria-hidden
                    >
                      <Check className="h-3 w-3" strokeWidth={2.5} />
                    </span>
                    <span>{getPermissionLabel(perm)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {grouped['Other']?.length ? (
            <div>
              <h4 className="mb-2 text-sm font-medium text-foreground">
                Other
              </h4>
              <ul className="space-y-1.5">
                {grouped['Other'].map((perm) => (
                  <li
                    key={perm}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600"
                      aria-hidden
                    >
                      <Check className="h-3 w-3" strokeWidth={2.5} />
                    </span>
                    <span>{perm}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RoleListSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <Skeleton key={i} className="h-11 w-full" />
      ))}
    </div>
  );
}

function RoleDetailsSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-64" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-1 h-4 w-3/4" />
      </div>
      <div className="space-y-6 px-6 py-4">
        <Skeleton className="h-4 w-24" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    </div>
  );
}

function useRoleUserCounts(roles: Role[] | undefined): Record<string, number> {
  const { data: usersData } = useQuery({
    queryKey: queryKeys.users.list({ page: 1, limit: 500 }),
    queryFn: () => listUsers({ page: 1, limit: 500 }),
    enabled: !!roles?.length,
  });

  return useMemo(() => {
    if (!roles?.length || !usersData?.items) return {};
    const counts: Record<string, number> = {};
    for (const role of roles) {
      counts[role.id] = 0;
    }
    for (const user of usersData.items) {
      for (const r of user.roles ?? []) {
        const role = roles.find((ro) => ro.id === r.id);
        if (role) {
          counts[role.id] = (counts[role.id] ?? 0) + 1;
        }
      }
    }
    return counts;
  }, [roles, usersData?.items]);
}

export function RolesPage() {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const { data: roles, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.roles.all,
    queryFn: listRoles,
  });

  const sortedRoles = roles ? sortRoles(roles) : [];
  const roleUserCounts = useRoleUserCounts(sortedRoles);
  const selected =
    sortedRoles.find((r) => r.id === selectedRoleId) ?? sortedRoles[0] ?? null;

  if (isError) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[{ label: 'Settings', href: '/settings' }, { label: 'Roles' }]}
        />
        <PageHeader
          title="Roles"
          description="Organization roles and their permissions"
        />
        <ErrorState
          title="Failed to load roles"
          description={
            error instanceof Error ? error.message : 'Something went wrong'
          }
          action={
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[{ label: 'Settings', href: '/settings' }, { label: 'Roles' }]}
      />
      <PageHeader
        title="Roles"
        description="Organization roles and their capabilities"
      />
      {sortedRoles.length === 0 && !isLoading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No roles configured for this organization.
        </p>
      ) : (
        <div className="flex min-h-[480px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <aside className="w-64 shrink-0 border-r border-slate-200 bg-slate-50/30">
            {isLoading ? (
              <RoleListSkeleton />
            ) : (
              <nav className="p-2" aria-label="Role list">
                {sortedRoles.map((role) => {
                  const metadata = getRoleMetadata(role.key);
                  const isSelected = selected?.id === role.id;
                  const count = roleUserCounts[role.id];
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRoleId(role.id)}
                      className={`flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2.5 text-left transition-colors ${
                        isSelected
                          ? 'bg-primary/10 font-medium text-primary'
                          : 'text-foreground hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-sm">{metadata.displayName}</span>
                      <span className="text-xs text-muted-foreground">
                        {metadata.scopeLabel}
                        {count !== undefined && ` · ${count} users`}
                      </span>
                    </button>
                  );
                })}
              </nav>
            )}
          </aside>
          <main className="min-w-0 flex-1">
            {isLoading ? (
              <RoleDetailsSkeleton />
            ) : selected ? (
              <RoleDetailsPanel
                role={selected}
                userCount={roleUserCounts[selected.id]}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center py-12 text-sm text-muted-foreground">
                Select a role to view details
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
