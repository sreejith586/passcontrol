import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listTemplates } from './api';
import type { ChecklistTemplate } from './api';
import { queryKeys } from './query-keys';
import { DataTable } from '@/shared/ui';
import { PageHeader } from '@/shared/layout/PageHeader';
import { ErrorState } from '@/shared/layout/ErrorState';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { formatDateTime } from '@/lib/date';
import { PermissionGate } from '@/core/permissions/PermissionGate';

function getStatusVariant(status: string) {
  if (status === 'PUBLISHED') return 'success';
  if (status === 'ARCHIVED') return 'outline';
  return 'warning';
}

export function ChecklistTemplatesListPage() {
  const navigate = useNavigate();

  const { data: templates, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.list(),
    queryFn: () => listTemplates({ page: 1, limit: 100 }),
  });

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row: ChecklistTemplate) => (
        <span className="font-semibold text-slate-900">{row.name}</span>
      ),
    },
    {
      key: 'key',
      header: 'Key',
      render: (row: ChecklistTemplate) => (
        <span className="font-mono text-sm text-slate-600">{row.templateKey}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: ChecklistTemplate) => (
        <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
      ),
    },
    {
      key: 'sections',
      header: 'Sections',
      render: (row: ChecklistTemplate) => (
        <span className="tabular-nums">{row.sections?.length ?? 0}</span>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      render: (row: ChecklistTemplate) => {
        const count =
          row.sections?.reduce((sum, s) => sum + (s.items?.length ?? 0), 0) ?? 0;
        return <span className="tabular-nums">{count}</span>;
      },
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      render: (row: ChecklistTemplate) => (
        <span className="text-slate-600">{formatDateTime(row.updatedAt)}</span>
      ),
    },
  ];

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Checklist Templates"
          description="Create and manage checklist templates"
        />
        <ErrorState
          title="Failed to load templates"
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
      <PageHeader
        title="Checklist Templates"
        description="Create and manage checklist templates"
        actions={
          <PermissionGate permission="checklist.template.create">
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/checklist-templates/new')}
            >
              + Create Template
            </Button>
          </PermissionGate>
        }
      />
      <DataTable
        columns={columns}
        data={templates ?? []}
        loading={isLoading}
        emptyMessage="No templates yet"
        emptyDescription="Create your first checklist template to get started."
        emptyAction={
          <PermissionGate permission="checklist.template.create">
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/checklist-templates/new')}
            >
              + Create Template
            </Button>
          </PermissionGate>
        }
        getRowId={(row) => row.id}
        onRowClick={(row) => navigate(`/checklist-templates/${row.id}`)}
      />
    </div>
  );
}
