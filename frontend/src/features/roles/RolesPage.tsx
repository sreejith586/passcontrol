import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { listRoles } from '@/features/users/api';
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

function RoleRow({ role }: { role: Role }) {
  const [expanded, setExpanded] = useState(false);
  const metadata = getRoleMetadata(role.key);
  const grouped = groupPermissionsByCategory(role.permissions);
  const capabilityCategories = Object.keys(grouped).filter((c) => c !== 'Other');

  return (
    <>
      <tr
        className="cursor-pointer border-b border-border transition-colors hover:bg-muted/30"
        onClick={() => setExpanded((e) => !e)}
      >
        <td className="w-10 py-3 pl-4">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((e) => !e);
            }}
            className="text-muted-foreground hover:text-foreground"
            aria-expanded={expanded}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </td>
        <td className="py-3">
          <span className="font-medium text-foreground">
            {metadata.displayName}
          </span>
        </td>
        <td className="py-3">
          <Badge variant="outline" className="text-xs">
            {metadata.scopeLabel}
          </Badge>
        </td>
        <td className="py-3 text-sm text-muted-foreground">
          {metadata.intendedUserType}
        </td>
        <td className="py-3">
          <div className="flex flex-wrap gap-1">
            {capabilityCategories.map((cat) => (
              <Badge key={cat} variant="default" className="text-xs">
                {PERMISSION_GROUPS[cat]?.label ?? cat}
              </Badge>
            ))}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="bg-muted/10 p-0">
            <div className="border-t border-border px-4 py-4">
              <p className="mb-3 text-sm text-muted-foreground">
                {metadata.description}
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {CATEGORY_ORDER.filter((cat) => grouped[cat]?.length).map(
                  (cat) => (
                    <div key={cat}>
                      <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {PERMISSION_GROUPS[cat]?.label ?? cat}
                      </h4>
                      <ul className="space-y-1">
                        {grouped[cat].map((p) => (
                          <li
                            key={p}
                            className="text-sm text-foreground"
                          >
                            {getPermissionLabel(p)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                )}
                {grouped['Other']?.length ? (
                  <div>
                    <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Other
                    </h4>
                    <ul className="space-y-1">
                      {grouped['Other'].map((p) => (
                        <li key={p} className="text-sm text-foreground">
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function RolesPage() {
  const { data: roles, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.roles.all,
    queryFn: listRoles,
  });

  if (isError) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'Settings', href: '/settings' }, { label: 'Roles' }]} />
        <PageHeader title="Roles" description="Organization roles and their permissions" />
        <ErrorState
          title="Failed to load roles"
          description={error instanceof Error ? error.message : 'Something went wrong'}
          action={
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  if (isLoading || !roles) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'Settings', href: '/settings' }, { label: 'Roles' }]} />
        <PageHeader title="Roles" description="Organization roles and their permissions" />
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="w-10 px-4 py-3 text-left" />
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Scope</th>
                <th className="px-4 py-3 text-left font-medium">Intended for</th>
                <th className="px-4 py-3 text-left font-medium">Capabilities</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b border-border">
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-4" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-40" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const sortedRoles = sortRoles(roles);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Settings', href: '/settings' }, { label: 'Roles' }]} />
      <PageHeader
        title="Roles"
        description="Organization roles and their capabilities"
      />
      {sortedRoles.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          No roles configured for this organization.
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="w-10 px-4 py-3 text-left" aria-label="Expand" />
                <th className="px-4 py-3 text-left font-medium text-foreground">
                  Role
                </th>
                <th className="px-4 py-3 text-left font-medium text-foreground">
                  Scope
                </th>
                <th className="px-4 py-3 text-left font-medium text-foreground">
                  Intended for
                </th>
                <th className="px-4 py-3 text-left font-medium text-foreground">
                  Capabilities
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRoles.map((role) => (
                <RoleRow key={role.id} role={role} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
