import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listLocations } from './api';
import type { Location } from './api';
import { queryKeys } from './query-keys';
import { LocationModal } from './components/LocationModal';
import { DataTable } from '@/shared/ui';
import { PageHeader } from '@/shared/layout/PageHeader';
import { ErrorState } from '@/shared/layout/ErrorState';
import { Button } from '@/shared/ui/Button';
import { formatDateTime } from '@/lib/date';
import { PermissionGate } from '@/core/permissions/PermissionGate';
import { usePermissions } from '@/core/permissions/use-permission';

export function LocationsListPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const canManage = usePermissions('location.manage');

  const { data: locations, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.list(),
    queryFn: () => listLocations(),
  });

  const openCreate = () => {
    setEditingLocation(null);
    setModalOpen(true);
  };

  const openEdit = (loc: Location) => {
    setEditingLocation(loc);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingLocation(null);
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row: Location) => (
        <span className="font-semibold text-slate-900">{row.name}</span>
      ),
    },
    {
      key: 'brand',
      header: 'Brand',
      render: (row: Location) => (
        <span className="text-slate-700">
          {row.brand?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'timezone',
      header: 'Timezone',
      render: (row: Location) => (
        <span className="font-mono text-sm text-slate-600">
          {row.timezone}
        </span>
      ),
    },
    {
      key: 'updated',
      header: 'Updated',
      render: (row: Location) => (
        <span className="text-slate-600">{formatDateTime(row.updatedAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: Location) => (
        <div onClick={(e) => e.stopPropagation()}>
          <PermissionGate permission="location.manage">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEdit(row)}
            >
              Edit
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ];

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Locations"
          description="Manage branches and sites where operations happen"
        />
        <ErrorState
          title="Failed to load locations"
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
      <PageHeader
        title="Locations"
        description="Manage branches and sites where operations happen"
        actions={
          <PermissionGate permission="location.manage">
            <Button variant="primary" size="sm" onClick={openCreate}>
              + Create Location
            </Button>
          </PermissionGate>
        }
      />
      <DataTable
        columns={columns}
        data={locations ?? []}
        loading={isLoading}
        emptyMessage="No locations yet"
        emptyDescription="Locations represent your branches or sites. Create one to assign checklists and runs."
        emptyAction={
          <PermissionGate permission="location.manage">
            <Button variant="primary" size="sm" onClick={openCreate}>
              + Create Location
            </Button>
          </PermissionGate>
        }
        getRowId={(row) => row.id}
        onRowClick={canManage ? (row) => openEdit(row) : undefined}
      />
      <LocationModal
        open={modalOpen}
        onClose={closeModal}
        location={editingLocation}
      />
    </div>
  );
}
