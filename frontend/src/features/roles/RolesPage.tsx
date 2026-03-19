import { useQuery } from '@tanstack/react-query';
import { listRoles } from '@/features/users/api';
import { queryKeys } from '@/features/users/query-keys';
import { PageHeader } from '@/shared/layout/PageHeader';
import { Breadcrumbs } from '@/shared/layout/Breadcrumbs';
import { ErrorState } from '@/shared/layout/ErrorState';
import { Button } from '@/shared/ui/Button';
import { Skeleton } from '@/shared/ui/Skeleton';

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
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Settings', href: '/settings' }, { label: 'Roles' }]} />
      <PageHeader
        title="Roles"
        description="Organization roles and their permissions"
      />
      <div className="space-y-4">
        {roles.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No roles configured for this organization.
          </p>
        ) : (
          roles.map((role) => (
            <div
              key={role.id}
              className="rounded-lg border border-border bg-muted/20 p-4"
            >
              <div className="mb-2 flex items-baseline gap-2">
                <h3 className="font-medium text-foreground">{role.name}</h3>
                <span className="text-muted-foreground text-sm">{role.key}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {role.permissions.map((p) => (
                  <span
                    key={p}
                    className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
