import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listBrands } from './api';
import type { Brand } from './api';
import { queryKeys } from './query-keys';
import { BrandModal } from './components/BrandModal';
import { DataTable } from '@/shared/ui';
import { PageHeader } from '@/shared/layout/PageHeader';
import { ErrorState } from '@/shared/layout/ErrorState';
import { Button } from '@/shared/ui/Button';
import { formatDateTime } from '@/lib/date';
import { PermissionGate } from '@/core/permissions/PermissionGate';
import { usePermissions } from '@/core/permissions/use-permission';

export function BrandsListPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const canManage = usePermissions('brand.manage');

  const { data: brands, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.list(),
    queryFn: listBrands,
  });

  const openCreate = () => {
    setEditingBrand(null);
    setModalOpen(true);
  };

  const openEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingBrand(null);
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row: Brand) => (
        <span className="font-semibold text-slate-900">{row.name}</span>
      ),
    },
    {
      key: 'updated',
      header: 'Updated',
      render: (row: Brand) => (
        <span className="text-slate-600">{formatDateTime(row.updatedAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: Brand) => (
        <div onClick={(e) => e.stopPropagation()}>
          <PermissionGate permission="brand.manage">
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
          title="Brands"
          description="Manage brands that group your operating locations"
        />
        <ErrorState
          title="Failed to load brands"
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
        title="Brands"
        description="Manage brands that group your operating locations"
        actions={
          <PermissionGate permission="brand.manage">
            <Button variant="primary" size="sm" onClick={openCreate}>
              + Create Brand
            </Button>
          </PermissionGate>
        }
      />
      <DataTable
        columns={columns}
        data={brands ?? []}
        loading={isLoading}
        emptyMessage="No brands yet"
        emptyDescription="Brands group your operating locations. Create one to get started."
        emptyAction={
          <PermissionGate permission="brand.manage">
            <Button variant="primary" size="sm" onClick={openCreate}>
              + Create Brand
            </Button>
          </PermissionGate>
        }
        getRowId={(row) => row.id}
        onRowClick={canManage ? (row) => openEdit(row) : undefined}
      />
      <BrandModal
        open={modalOpen}
        onClose={closeModal}
        brand={editingBrand}
      />
    </div>
  );
}
