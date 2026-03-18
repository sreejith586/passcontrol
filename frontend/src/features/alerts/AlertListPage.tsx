import type React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listAlerts } from './api';
import { queryKeys } from './query-keys';
import type { AlertEvent, ListAlertsParams } from './types';
import { DataTable, DataTablePagination } from '@/shared/ui';
import { PageHeader } from '@/shared/layout/PageHeader';
import { StatusBadge } from './components/StatusBadge';
import { SeverityBadge } from './components/SeverityBadge';
import { formatDateTime } from '@/lib/date';
import { Button } from '@/shared/ui/Button';
import { PermissionGate } from '@/core/permissions/PermissionGate';

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

  const { data, isLoading } = useQuery({
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
      render: (row: AlertEvent) => row.sourceType,
    },
    {
      key: 'assignedToUserId',
      header: 'Assigned',
      render: (row: AlertEvent) =>
        row.assignedToUserId ? (
          <span className="block max-w-[120px] truncate" title={row.assignedToUserId}>
            {row.assignedToUserId.slice(0, 8)}…
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'triggeredAt',
      header: 'Triggered',
      render: (row: AlertEvent) => formatDateTime(row.triggeredAt),
    },
    {
      key: 'actions',
      header: '',
      render: (row: AlertEvent) => (
        <PermissionGate permission="alert.view">
          <Link to={`/alerts/${row.id}`}>
            <Button variant="ghost" size="sm">
              View
            </Button>
          </Link>
        </PermissionGate>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Alerts"
        description="Manage and triage operational alerts"
      />
      <div className="flex flex-wrap gap-2">
        <select
          value={params.status ?? ''}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setParam('status', e.target.value)}
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
            checked={params.assignedToMe ?? false}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParam('assignedToMe', e.target.checked)}
            className="rounded border-border"
          />
          Assigned to me
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={params.unassignedOnly ?? false}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParam('unassignedOnly', e.target.checked)}
            className="rounded border-border"
          />
          Unassigned only
        </label>
      </div>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        emptyMessage="No alerts found"
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
