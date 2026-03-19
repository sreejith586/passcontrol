import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listAlerts } from './api';
import { queryKeys } from './query-keys';
import type { AlertEvent, ListAlertsParams } from './types';
import { DataTable, DataTablePagination } from '@/shared/ui';
import { PageHeader } from '@/shared/layout/PageHeader';
import { ErrorState } from '@/shared/layout/ErrorState';
import { FilterBar, FilterSelect, FilterCheckbox } from '@/shared/layout/FilterBar';
import { StatusBadge } from './components/StatusBadge';
import { SeverityBadge } from './components/SeverityBadge';
import { AssigneeBadge } from './components/AssigneeBadge';
import { formatDateTime } from '@/lib/date';
import { getSourceTypeLabel } from '@/lib/labels';
import { Button } from '@/shared/ui/Button';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { value: 'RESOLVED', label: 'Resolved' },
] as const;

function parseParams(searchParams: URLSearchParams): ListAlertsParams {
  const page = searchParams.get('page');
  const limit = searchParams.get('limit');
  const status = searchParams.get('status');
  const assignedToMe = searchParams.get('assignedToMe');
  const unassignedOnly = searchParams.get('unassignedOnly');
  return {
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? parseInt(limit, 10) : 25,
    status: status && ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'].includes(status)
      ? (status as ListAlertsParams['status'])
      : undefined,
    assignedToMe: assignedToMe === 'true',
    unassignedOnly: unassignedOnly === 'true',
  };
}

export function AlertListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const params = parseParams(searchParams);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.alerts.list(params),
    queryFn: () => listAlerts(params),
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
      render: (row: AlertEvent) => <StatusBadge status={row.status} />,
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (row: AlertEvent) => <SeverityBadge severity={row.severity} />,
    },
    {
      key: 'sourceType',
      header: 'Source',
      render: (row: AlertEvent) => getSourceTypeLabel(row.sourceType),
    },
    {
      key: 'assignedTo',
      header: 'Assigned',
      render: (row: AlertEvent) => (
        <AssigneeBadge
          assignedToUserId={row.assignedToUserId}
          assignedToUser={row.assignedToUser}
        />
      ),
    },
    {
      key: 'triggeredAt',
      header: 'Triggered',
      render: (row: AlertEvent) => formatDateTime(row.triggeredAt),
    },
  ];

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Alerts" description="Manage and triage operational alerts" />
        <ErrorState
          title="Failed to load alerts"
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
        title="Alerts"
        description="Manage and triage operational alerts"
      />
      <FilterBar>
        <FilterSelect
          value={params.status ?? ''}
          onChange={(v) => setParam('status', v)}
          options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          aria-label="Filter by status"
        />
        <FilterCheckbox
          checked={params.assignedToMe ?? false}
          onChange={(v) => setParam('assignedToMe', v)}
          label="Assigned to me"
        />
        <FilterCheckbox
          checked={params.unassignedOnly ?? false}
          onChange={(v) => setParam('unassignedOnly', v)}
          label="Unassigned only"
        />
      </FilterBar>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        emptyMessage="No alerts found"
        emptyDescription="Alerts will appear here when checklist items fail."
        getRowId={(row) => row.id}
        onRowClick={(row) => navigate(`/alerts/${row.id}`)}
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
