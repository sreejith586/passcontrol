import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MoreVertical, UserPlus, Power, PowerOff, Mail } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
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
import {
  formatRoleTooltip,
  getPrimaryRoleMetadata,
} from '@/features/roles/role-metadata';

function parseParams(searchParams: URLSearchParams) {
  const page = searchParams.get('page');
  const limit = searchParams.get('limit');
  return {
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? parseInt(limit, 10) : 25,
  };
}

function getStatusBadge(row: UserForAssignment) {
  if (row.hasPassword === false) {
    return <Badge variant="warning">Pending setup</Badge>;
  }
  if (row.isActive !== false) {
    return <Badge variant="success">Active</Badge>;
  }
  return <Badge variant="destructive">Inactive</Badge>;
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

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const activeCount = items.filter((r) => r.isActive !== false).length;
  const inactiveCount = items.filter((r) => r.isActive === false).length;
  const pendingCount = items.filter((r) => r.hasPassword === false).length;

  const columns = [
    {
      key: 'user',
      header: 'User',
      render: (row: UserForAssignment) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{row.name}</span>
            {row.isCurrentUser && (
              <Badge variant="outline" className="text-xs">
                You
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{row.email}</span>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row: UserForAssignment) => {
        const pr = getPrimaryRoleMetadata(row.roles);
        const tooltip = pr
          ? formatRoleTooltip(pr.meta, pr.extraRoleCount)
          : undefined;
        return (
          <div
            className="flex max-w-[20rem] flex-col gap-0.5"
            title={tooltip}
          >
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-sm text-foreground">
                {pr ? pr.meta.displayName : '—'}
              </span>
              {row.roles?.some((r) => r.key === 'super_admin') && (
                <Badge variant="info" className="text-xs">
                  Super Admin
                </Badge>
              )}
              {pr && pr.extraRoleCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  +{pr.extraRoleCount}
                </span>
              )}
            </div>
            {pr && (
              <span className="line-clamp-1 text-xs text-muted-foreground">
                {pr.meta.description}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: UserForAssignment) => getStatusBadge(row),
    },
    {
      key: 'actions',
      header: '',
      render: (row: UserForAssignment) => (
        <PermissionGate permission="user.manage">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" aria-label="Actions" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content
              align="end"
              className="z-50 min-w-[11rem] overflow-hidden rounded-md border border-border bg-background p-1 shadow-md"
            >
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-muted"
                onSelect={(e) => {
                  e.preventDefault();
                  setEditUser(row);
                }}
              >
                <UserPlus className="h-4 w-4" />
                Edit roles
              </DropdownMenu.Item>
              {row.isActive !== false ? (
                <span
                  title={
                    row.isCurrentUser
                      ? 'You cannot deactivate your own account'
                      : row.isLastSuperAdmin
                        ? 'Assign another SuperAdmin before deactivating this user'
                        : undefined
                  }
                >
                  <DropdownMenu.Item
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none focus:bg-muted disabled:pointer-events-none disabled:opacity-50"
                    disabled={row.isCurrentUser || row.isLastSuperAdmin}
                    onSelect={(e) => {
                      e.preventDefault();
                      if (!row.isCurrentUser && !row.isLastSuperAdmin) {
                        setStatusUser({ user: row, targetActive: false });
                      }
                    }}
                  >
                    <PowerOff className="h-4 w-4" />
                    Deactivate
                  </DropdownMenu.Item>
                </span>
              ) : (
                <DropdownMenu.Item
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-muted"
                  onSelect={(e) => {
                    e.preventDefault();
                    setStatusUser({ user: row, targetActive: true });
                  }}
                >
                  <Power className="h-4 w-4" />
                  Activate
                </DropdownMenu.Item>
              )}
              {(row.canReinvite || row.reinviteBlockedReason === 'must_deactivate') && (
                <PermissionGate permission="user.invite">
                  <span
                    title={
                      row.reinviteBlockedReason === 'must_deactivate'
                        ? 'User must be deactivated before re-inviting'
                        : undefined
                    }
                  >
                    <DropdownMenu.Item
                      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-muted disabled:pointer-events-none disabled:opacity-50"
                      disabled={reinviteMutation.isPending || !row.canReinvite}
                      onSelect={(e) => {
                        e.preventDefault();
                        if (row.canReinvite) reinviteMutation.mutate(row.id);
                      }}
                    >
                      <Mail className="h-4 w-4" />
                      Re-invite
                    </DropdownMenu.Item>
                  </span>
                </PermissionGate>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
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
      {total > 0 && (
        <div className="flex flex-wrap items-center gap-6 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Total users</span>
            <span className="text-lg font-semibold text-foreground">{total}</span>
          </div>
          <div className="h-4 w-px bg-slate-200" aria-hidden />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Active</span>
            <span className="text-lg font-semibold text-emerald-700">{activeCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Inactive</span>
            <span className="text-lg font-semibold text-destructive">{inactiveCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Pending setup</span>
            <span className="text-lg font-semibold text-amber-700">{pendingCount}</span>
          </div>
          {data && data.total > data.limit && (
            <span className="text-xs text-muted-foreground">
              (Active, Inactive, Pending reflect current page)
            </span>
          )}
        </div>
      )}
      <DataTable
        columns={columns}
        data={items}
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
