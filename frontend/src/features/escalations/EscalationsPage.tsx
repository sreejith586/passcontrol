import { useState } from 'react';
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
import { listUsers } from '@/features/users/api';
import { queryKeys as usersQueryKeys } from '@/features/users/query-keys';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
] as const;

const SEVERITY_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
] as const;

function parseParams(searchParams: URLSearchParams): EscalationsListParams {
  const page = searchParams.get('page');
  const limit = searchParams.get('limit');
  const status = searchParams.get('status');
  const onlyBreached = searchParams.get('onlyBreached');
  const severity = searchParams.get('severity');
  const unassignedOnly = searchParams.get('unassignedOnly') === 'true';
  const assignedToMe = searchParams.get('assignedToMe') === 'true';
  const assignedUserId = searchParams.get('assignedUserId') || undefined;

  // Precedence: unassignedOnly > assignedToMe > assignedUserId
  let effectiveUnassignedOnly: boolean | undefined;
  let effectiveAssignedToMe: boolean | undefined;
  let effectiveAssignedUserId: string | undefined;
  if (unassignedOnly) {
    effectiveUnassignedOnly = true;
  } else if (assignedToMe) {
    effectiveAssignedToMe = true;
  } else if (assignedUserId) {
    effectiveAssignedUserId = assignedUserId;
  }

  return {
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? parseInt(limit, 10) : 25,
    status:
      status && ['OPEN', 'ACKNOWLEDGED'].includes(status)
        ? (status as 'OPEN' | 'ACKNOWLEDGED')
        : undefined,
    onlyBreached: onlyBreached === 'true',
    severity: severity || undefined,
    unassignedOnly: effectiveUnassignedOnly,
    assignedToMe: effectiveAssignedToMe,
    assignedUserId: effectiveAssignedUserId,
  };
}

export function EscalationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const params = parseParams(searchParams);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.escalations.list(params),
    queryFn: () => listEscalations(params),
  });

  const { data: usersData } = useQuery({
    queryKey: usersQueryKeys.users.list({ page: 1, limit: 100 }),
    queryFn: () => listUsers({ page: 1, limit: 100 }),
    enabled: advancedFiltersOpen,
  });

  function setParam(key: string, value: string | number | boolean) {
    const next = new URLSearchParams(searchParams);
    if (value === '' || value === false) {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
    if (key !== 'page') next.set('page', '1');
    setSearchParams(next);
  }

  function setAssignmentFilter(
    mode: 'assignedToMe' | 'unassignedOnly' | 'assignedUserId',
    value: boolean | string
  ) {
    const next = new URLSearchParams(searchParams);
    next.delete('assignedToMe');
    next.delete('unassignedOnly');
    next.delete('assignedUserId');
    if (mode === 'assignedToMe' && value === true) next.set('assignedToMe', 'true');
    else if (mode === 'unassignedOnly' && value === true) next.set('unassignedOnly', 'true');
    else if (mode === 'assignedUserId' && value) next.set('assignedUserId', String(value));
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
      <div className="space-y-3">
        <FilterBar>
          <FilterSelect
            value={params.status ?? ''}
            onChange={(v) => setParam('status', v)}
            options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            aria-label="Filter by status"
          />
          <FilterCheckbox
            checked={params.assignedToMe ?? false}
            onChange={(v) => setAssignmentFilter('assignedToMe', v)}
            label="Assigned to me"
          />
          <FilterCheckbox
            checked={params.unassignedOnly ?? false}
            onChange={(v) => setAssignmentFilter('unassignedOnly', v)}
            label="Unassigned only"
          />
          <FilterCheckbox
            checked={params.onlyBreached ?? false}
            onChange={(v) => setParam('onlyBreached', v)}
            label="Breached only"
          />
          <button
            type="button"
            onClick={() => setAdvancedFiltersOpen(!advancedFiltersOpen)}
            className="text-sm text-primary hover:underline"
          >
            {advancedFiltersOpen ? 'Fewer filters' : 'More filters'}
          </button>
        </FilterBar>

        {advancedFiltersOpen && (
          <FilterBar>
            <FilterSelect
              value={params.severity ?? ''}
              onChange={(v) => setParam('severity', v)}
              options={SEVERITY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              aria-label="Filter by severity"
            />
            <FilterSelect
              value={params.assignedUserId ?? ''}
              onChange={(v) => setAssignmentFilter('assignedUserId', v)}
              options={[
                { value: '', label: 'Any assignee' },
                ...(usersData?.items ?? []).map((u) => ({
                  value: u.id,
                  label: u.name,
                })),
              ]}
              aria-label="Filter by assigned user"
            />
          </FilterBar>
        )}
      </div>
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
