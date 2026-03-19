import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listUsers } from './api';
import { queryKeys } from './query-keys';
import type { UserForAssignment } from './api';
import { DataTable, DataTablePagination } from '@/shared/ui';
import { PageHeader } from '@/shared/layout/PageHeader';
import { Breadcrumbs } from '@/shared/layout/Breadcrumbs';
import { ErrorState } from '@/shared/layout/ErrorState';
import { Button } from '@/shared/ui/Button';
import { AddUserModal } from './components/AddUserModal';
import { PermissionGate } from '@/core/permissions/PermissionGate';

function parseParams(searchParams: URLSearchParams) {
  const page = searchParams.get('page');
  const limit = searchParams.get('limit');
  return {
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? parseInt(limit, 10) : 25,
  };
}

export function UsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const params = parseParams(searchParams);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => listUsers(params),
  });

  function setParam(key: string, value: string | number) {
    const next = new URLSearchParams(searchParams);
    next.set(key, String(value));
    setSearchParams(next);
  }

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row: UserForAssignment) => row.name,
    },
    {
      key: 'email',
      header: 'Email',
      render: (row: UserForAssignment) => row.email,
    },
    {
      key: 'roles',
      header: 'Roles',
      render: (row: UserForAssignment) =>
        row.roles?.length
          ? row.roles.map((r) => r.name).join(', ')
          : '—',
    },
  ];

  if (isError) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'Settings', href: '/settings' }, { label: 'Users' }]} />
        <PageHeader title="Users" description="Organization members and their roles" />
        <ErrorState
          title="Failed to load users"
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

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: 'Settings', href: '/settings' }, { label: 'Users' }]} />
      <PageHeader
        title="Users"
        description="Organization members and their roles"
        actions={
          <PermissionGate permission="user.invite">
            <Button variant="primary" size="sm" onClick={() => setAddModalOpen(true)}>
              Add user
            </Button>
          </PermissionGate>
        }
      />
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        emptyMessage="No users"
        emptyDescription="Add users to give them access to this organization."
        getRowId={(row) => row.id}
      />
      {data && data.total > 0 && (
        <DataTablePagination
          page={data.page}
          limit={data.limit}
          total={data.total}
          onPageChange={(page) => setParam('page', page)}
        />
      )}
      <AddUserModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={() => {
          setAddModalOpen(false);
          refetch();
        }}
      />
    </div>
  );
}
