import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { listSuperAdminTenants } from './api';
import type { SuperAdminTenant } from './api';
import { PageHeader } from '@/shared/layout/PageHeader';
import { DataTable, type DataTableColumn } from '@/shared/ui';
import { ErrorState } from '@/shared/layout/ErrorState';
import { Button } from '@/shared/ui/Button';
import { formatDateTime } from '@/lib/date';

export function SuperAdminDashboardPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['super-admin', 'tenants'] as const,
    queryFn: listSuperAdminTenants,
  });

  const columns = useMemo<DataTableColumn<SuperAdminTenant>[]>(
    () => [
      {
        key: 'name',
        header: 'Organization Name',
        render: (row) => <span className="font-medium text-foreground">{row.name}</span>,
      },
      {
        key: 'type',
        header: 'Type',
        render: (row) => (row.isDemo ? 'Demo' : 'Customer'),
      },
      {
        key: 'createdAt',
        header: 'Created At',
        render: (row) => formatDateTime(row.createdAt),
      },
      {
        key: 'userCount',
        header: 'Users',
        render: (row) => String(row.userCount),
      },
      {
        key: 'checklistRunCount',
        header: 'Runs',
        render: (row) => String(row.checklistRunCount),
      },
      {
        key: 'lastActivityAt',
        header: 'Last Activity',
        render: (row) => formatDateTime(row.lastActivityAt),
      },
    ],
    []
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Super Admin Dashboard"
        description="Read-only view of all organizations."
      />
      {isError ? (
        <ErrorState
          title="Could not load tenants"
          description={error instanceof Error ? error.message : undefined}
          action={
            <Button type="button" variant="secondary" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          loading={isLoading}
          getRowId={(row) => row.id}
          emptyMessage="No organizations"
        />
      )}
    </div>
  );
}
