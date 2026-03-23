import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listUsers, updateUserStatus, reinviteUser } from './api';
import { queryKeys } from './query-keys';
import type { UserForAssignment } from './api';
import { DataTable, DataTablePagination } from '@/shared/ui';
import { PageHeader } from '@/shared/layout/PageHeader';
import { Breadcrumbs } from '@/shared/layout/Breadcrumbs';
import { ErrorState } from '@/shared/layout/ErrorState';
import { Button } from '@/shared/ui/Button';
import { AddUserModal } from './components/AddUserModal';
import { EditRolesModal } from './components/EditRolesModal';
import { ConfirmActionModal } from '@/shared/ui/ActionModal/ConfirmActionModal';
import { PermissionGate } from '@/core/permissions/PermissionGate';
import { Badge } from '@/shared/ui/Badge';
import { toast } from '@/shared/feedback/useToast';

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
  const [editUser, setEditUser] = useState<UserForAssignment | null>(null);
  const [statusUser, setStatusUser] = useState<{
    user: UserForAssignment;
    targetActive: boolean;
  } | null>(null);
  const params = parseParams(searchParams);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => listUsers(params),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      userId,
      isActive,
    }: {
      userId: string;
      isActive: boolean;
    }) => updateUserStatus(userId, isActive),
    onSuccess: (_data, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success(isActive ? 'User activated' : 'User deactivated');
      setStatusUser(null);
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update user status'
      );
    },
  });

  const reinviteMutation = useMutation({
    mutationFn: (userId: string) => reinviteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success('Invitation re-sent');
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to re-send invitation'
      );
    },
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
        row.roles?.length ? (
          <div className="flex flex-wrap gap-1">
            {row.roles.map((r) => (
              <Badge key={r.id} variant="outline" className="text-xs">
                {r.name}
              </Badge>
            ))}
          </div>
        ) : (
          '—'
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: UserForAssignment) =>
        row.isActive !== false ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="destructive">Inactive</Badge>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: UserForAssignment) => (
        <PermissionGate permission="user.manage">
          <div className="flex flex-wrap items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setEditUser(row);
              }}
            >
              Edit roles
            </Button>
            {row.hasPassword === false && row.isActive === false && (
              <PermissionGate permission="user.invite">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={reinviteMutation.isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    reinviteMutation.mutate(row.id);
                  }}
                >
                  Re-invite
                </Button>
              </PermissionGate>
            )}
            {row.isActive !== false ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setStatusUser({ user: row, targetActive: false });
                }}
              >
                Deactivate
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setStatusUser({ user: row, targetActive: true });
                }}
              >
                Activate
              </Button>
            )}
          </div>
        </PermissionGate>
      ),
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
      <EditRolesModal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        user={editUser}
        onSuccess={() => refetch()}
      />
      <ConfirmActionModal
        open={!!statusUser}
        onClose={() => setStatusUser(null)}
        title={statusUser?.targetActive ? 'Activate user' : 'Deactivate user'}
        description={
          statusUser?.targetActive
            ? `Activate ${statusUser.user.name}? They will be able to access their account again.`
            : `Deactivate ${statusUser?.user.name}? They will no longer be able to sign in to their account.`
        }
        confirmLabel={statusUser?.targetActive ? 'Activate user' : 'Deactivate user'}
        variant={statusUser?.targetActive ? 'primary' : 'danger'}
        loading={statusMutation.isPending}
        onConfirm={() => {
          if (statusUser) {
            statusMutation.mutate({
              userId: statusUser.user.id,
              isActive: statusUser.targetActive,
            });
          }
        }}
      />
    </div>
  );
}
