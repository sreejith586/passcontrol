import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listLocations } from './api';
import type { Location } from './api';
import { queryKeys } from './query-keys';
import { LocationModal } from './components/LocationModal';
import { DataTable } from '@/shared/ui';
import { SortableColumnHeader } from '@/shared/ui/DataTable/SortableColumnHeader';
import { PageHeader } from '@/shared/layout/PageHeader';
import { ErrorState } from '@/shared/layout/ErrorState';
import { Button } from '@/shared/ui/Button';
import { formatDateTime } from '@/lib/date';
import { PermissionGate } from '@/core/permissions/PermissionGate';
import { usePermissions } from '@/core/permissions/use-permission';

type SortKey = 'name' | 'brand' | 'timezone' | 'updatedAt';

export function LocationsListPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [sort, setSort] = useState<{ sortBy: SortKey; order: 'asc' | 'desc' }>({
    sortBy: 'name',
    order: 'asc',
  });
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

  const sortedLocations = useMemo(() => {
    const list = locations ?? [];
    return [...list].sort((a, b) => {
      const mul = sort.order === 'asc' ? 1 : -1;
      if (sort.sortBy === 'name') return mul * a.name.localeCompare(b.name);
      if (sort.sortBy === 'brand') {
        const na = a.brand?.name ?? '';
        const nb = b.brand?.name ?? '';
        return mul * na.localeCompare(nb);
      }
      if (sort.sortBy === 'timezone') return mul * (a.timezone ?? '').localeCompare(b.timezone ?? '');
      return mul * (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
    });
  }, [locations, sort]);

  const columns = [
    {
      key: 'name',
      header: (
        <SortableColumnHeader
          label="Name"
          sortKey="name"
          currentSort={sort}
          onSort={(sortBy, order) => setSort({ sortBy: sortBy as SortKey, order })}
        />
      ),
      render: (row: Location) => (
        <span className="font-semibold text-slate-900">{row.name}</span>
      ),
    },
    {
      key: 'brand',
      header: (
        <SortableColumnHeader
          label="Brand"
          sortKey="brand"
          currentSort={sort}
          onSort={(sortBy, order) => setSort({ sortBy: sortBy as SortKey, order })}
        />
      ),
      render: (row: Location) => (
        <span className="text-slate-700">
          {row.brand?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'timezone',
      header: (
        <SortableColumnHeader
          label="Timezone"
          sortKey="timezone"
          currentSort={sort}
          onSort={(sortBy, order) => setSort({ sortBy: sortBy as SortKey, order })}
        />
      ),
      render: (row: Location) => (
        <span className="font-mono text-sm text-slate-600">
          {row.timezone}
        </span>
      ),
    },
    {
      key: 'updated',
      header: (
        <SortableColumnHeader
          label="Updated"
          sortKey="updatedAt"
          currentSort={sort}
          onSort={(sortBy, order) => setSort({ sortBy: sortBy as SortKey, order })}
        />
      ),
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
        data={sortedLocations}
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
