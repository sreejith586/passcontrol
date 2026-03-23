import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listZones } from './api';
import type { Zone } from './api';
import { queryKeys } from './query-keys';
import { ZoneModal } from './components/ZoneModal';
import { DataTable } from '@/shared/ui';
import { SortableColumnHeader } from '@/shared/ui/DataTable/SortableColumnHeader';
import { PageHeader } from '@/shared/layout/PageHeader';
import { ErrorState } from '@/shared/layout/ErrorState';
import { Button } from '@/shared/ui/Button';
import { formatDateTime } from '@/lib/date';
import { PermissionGate } from '@/core/permissions/PermissionGate';
import { usePermissions } from '@/core/permissions/use-permission';

type SortKey = 'name' | 'location' | 'updatedAt';

export function ZonesListPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [sort, setSort] = useState<{ sortBy: SortKey; order: 'asc' | 'desc' }>({
    sortBy: 'name',
    order: 'asc',
  });
  const canManage = usePermissions('zone.manage');

  const { data: zones, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.list(),
    queryFn: () => listZones(),
  });

  const openCreate = () => {
    setEditingZone(null);
    setModalOpen(true);
  };

  const openEdit = (z: Zone) => {
    setEditingZone(z);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingZone(null);
  };

  const sortedZones = useMemo(() => {
    const list = zones ?? [];
    return [...list].sort((a, b) => {
      const mul = sort.order === 'asc' ? 1 : -1;
      if (sort.sortBy === 'name') return mul * a.name.localeCompare(b.name);
      if (sort.sortBy === 'location') {
        const na = a.location?.name ?? '';
        const nb = b.location?.name ?? '';
        return mul * na.localeCompare(nb);
      }
      return mul * (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
    });
  }, [zones, sort]);

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
      render: (row: Zone) => (
        <span className="font-semibold text-slate-900">{row.name}</span>
      ),
    },
    {
      key: 'location',
      header: (
        <SortableColumnHeader
          label="Location"
          sortKey="location"
          currentSort={sort}
          onSort={(sortBy, order) => setSort({ sortBy: sortBy as SortKey, order })}
        />
      ),
      render: (row: Zone) => (
        <span className="text-slate-700">
          {row.location?.name ?? '—'}
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
      render: (row: Zone) => (
        <span className="text-slate-600">{formatDateTime(row.updatedAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: Zone) => (
        <div onClick={(e) => e.stopPropagation()}>
          <PermissionGate permission="zone.manage">
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
          title="Zones"
          description="Manage operational areas within locations"
        />
        <ErrorState
          title="Failed to load zones"
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
        title="Zones"
        description="Manage operational areas within locations"
        actions={
          <PermissionGate permission="zone.manage">
            <Button variant="primary" size="sm" onClick={openCreate}>
              + Create Zone
            </Button>
          </PermissionGate>
        }
      />
      <DataTable
        columns={columns}
        data={sortedZones}
        loading={isLoading}
        emptyMessage="No zones yet"
        emptyDescription="Zones represent operational areas within a location (e.g. Prep, Cold Storage). Create one to organize checklist runs."
        emptyAction={
          <PermissionGate permission="zone.manage">
            <Button variant="primary" size="sm" onClick={openCreate}>
              + Create Zone
            </Button>
          </PermissionGate>
        }
        getRowId={(row) => row.id}
        onRowClick={canManage ? (row) => openEdit(row) : undefined}
      />
      <ZoneModal
        open={modalOpen}
        onClose={closeModal}
        zone={editingZone}
      />
    </div>
  );
}
