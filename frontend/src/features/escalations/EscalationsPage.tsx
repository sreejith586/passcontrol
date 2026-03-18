import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listEscalations } from './api';
import { queryKeys } from './query-keys';
import type { EscalationsListParams, EscalationItem } from './types';
import { DataTable, DataTablePagination } from '@/shared/ui';
import { PageHeader } from '@/shared/layout/PageHeader';
import { Badge } from '@/shared/ui/Badge';
import { formatDateTime } from '@/lib/date';
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

  const { data, isLoading } = useQuery({
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
      render: (row: EscalationItem) => row.sourceType,
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row: EscalationItem) => formatDateTime(row.createdAt),
    },
    {
      key: 'actions',
      header: '',
      render: (row: EscalationItem) => (
        <Link to={`/alerts/${row.alertEventId}`}>
          <span className="text-primary hover:underline text-sm">View</span>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Escalations"
        description="Active alerts with SLA breach status"
      />
      <div className="flex flex-wrap gap-2">
        <select
          value={params.status ?? ''}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setParam('status', e.target.value)
          }
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={params.onlyBreached ?? false}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setParam('onlyBreached', e.target.checked)
            }
            className="rounded border-border"
          />
          Breached only
        </label>
      </div>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        emptyMessage="No escalations found"
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
