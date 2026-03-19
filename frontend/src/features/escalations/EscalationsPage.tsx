import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listEscalations } from './api';
import { queryKeys } from './query-keys';
import type { EscalationsListParams, EscalationItem } from './types';
import { DataTable, DataTablePagination } from '@/shared/ui';
import { PageHeader } from '@/shared/layout/PageHeader';
import { ErrorState } from '@/shared/layout/ErrorState';
import { FilterBar, FilterSelect, FilterCheckbox } from '@/shared/layout/FilterBar';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { formatDateTime } from '@/lib/date';
import { getSourceTypeLabel } from '@/lib/labels';
import { SeverityBadge } from '@/features/alerts/components/SeverityBadge';
import { StatusBadge } from '@/features/alerts/components/StatusBadge';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
] as const;

function parseParams(searchParams: URLSearchParams): EscalationsListParams {
  const page = searchParams.get('page');
  const limit = searchParams.get('limit');
  const status = searchParams.get('status');
  const onlyBreached = searchParams.get('onlyBreached');
  return {
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? parseInt(limit, 10) : 25,
    status:
      status && ['OPEN', 'ACKNOWLEDGED'].includes(status)
        ? (status as 'OPEN' | 'ACKNOWLEDGED')
        : undefined,
    onlyBreached: onlyBreached === 'true',
  };
}

export function EscalationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const params = parseParams(searchParams);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.escalations.list(params),
    queryFn: () => listEscalations(params),
  });

  function setParam(key: string, value: string | number | boolean) {
    const next = new URLSearchParams(searchParams);
    if (value === '' || value === false) {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
    next.set('page', '1');
    setSearchParams(next);
  }

  const columns = [
    {
      key: 'status',
      header: 'Status',
      render: (row: EscalationItem) => (
        <StatusBadge status={row.status as 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'} />
      ),
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (row: EscalationItem) => <SeverityBadge severity={row.severity} />,
    },
    {
      key: 'breach',
      header: 'SLA',
      render: (row: EscalationItem) => (
        <span className="flex gap-1">
          {row.sla.acknowledgeBreached && (
            <Badge variant="destructive" className="text-xs">
              Ack breached
            </Badge>
          )}
          {row.sla.resolveBreached && (
            <Badge variant="destructive" className="text-xs">
              Resolve breached
            </Badge>
          )}
          {!row.sla.acknowledgeBreached && !row.sla.resolveBreached && (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </span>
      ),
    },
    {
      key: 'sourceType',
      header: 'Source',
      render: (row: EscalationItem) => getSourceTypeLabel(row.sourceType),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row: EscalationItem) => formatDateTime(row.createdAt),
    },
  ];

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Escalations" description="Active alerts with SLA breach status" />
        <ErrorState
          title="Failed to load escalations"
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
        title="Escalations"
        description="Active alerts with SLA breach status"
      />
      <FilterBar>
        <FilterSelect
          value={params.status ?? ''}
          onChange={(v) => setParam('status', v)}
          options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          aria-label="Filter by status"
        />
        <FilterCheckbox
          checked={params.onlyBreached ?? false}
          onChange={(v) => setParam('onlyBreached', v)}
          label="Breached only"
        />
      </FilterBar>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        emptyMessage="No escalations found"
        emptyDescription="Active alerts with SLA status will appear here."
        getRowId={(row) => row.alertEventId}
        onRowClick={(row) => navigate(`/alerts/${row.alertEventId}`)}
      />
      {data && data.total > 0 && (
        <DataTablePagination
          page={data.page}
          limit={data.limit}
          total={data.total}
          onPageChange={(page) => setParam('page', page)}
        />
      )}
    </div>
  );
}
