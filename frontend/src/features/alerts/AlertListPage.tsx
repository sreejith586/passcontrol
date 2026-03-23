import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listAlerts,
  bulkAcknowledgeAlerts,
  bulkResolveAlerts,
} from './api';
import { queryKeys } from './query-keys';
import type { AlertEvent, ListAlertsParams } from './types';
import { DataTable, DataTablePagination } from '@/shared/ui';
import { SortableColumnHeader } from '@/shared/ui/DataTable/SortableColumnHeader';
import { PageHeader } from '@/shared/layout/PageHeader';
import { ErrorState } from '@/shared/layout/ErrorState';
import {
  FilterBar,
  FilterSelect,
  FilterCheckbox,
  FilterInput,
} from '@/shared/layout/FilterBar';
import { StatusBadge } from './components/StatusBadge';
import { SeverityBadge } from './components/SeverityBadge';
import { AssigneeBadge } from './components/AssigneeBadge';
import { BulkResolveModal } from './components/BulkResolveModal';
import { formatDateTimeContextual, formatRelative } from '@/lib/date';
import { formatAlertSourceDisplay } from '@/lib/labels';
import { Button } from '@/shared/ui/Button';
import { PermissionGate } from '@/core/permissions/PermissionGate';
import { toast } from '@/shared/feedback/useToast';
import { listUsers } from '@/features/users/api';
import { queryKeys as usersQueryKeys } from '@/features/users/query-keys';
import { ApiError } from '@/core/api/errors';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { value: 'RESOLVED', label: 'Resolved' },
] as const;

const SEVERITY_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
] as const;

const SOURCE_TYPE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'CHECKLIST_RUN_ITEM', label: 'Checklist item' },
  { value: 'TEMPERATURE_READING', label: 'Temperature reading' },
  { value: 'OTHER', label: 'Other' },
] as const;

const VALID_SORT = [
  'triggered_at_asc',
  'triggered_at_desc',
  'created_at_desc',
  'status_asc',
  'status_desc',
  'severity_asc',
  'severity_desc',
  'assigned_asc',
  'assigned_desc',
] as const;

function parseParams(searchParams: URLSearchParams): ListAlertsParams {
  const page = searchParams.get('page');
  const limit = searchParams.get('limit');
  const sortParam = searchParams.get('sort');
  const status = searchParams.get('status');
  const assignedToMe = searchParams.get('assignedToMe');
  const unassignedOnly = searchParams.get('unassignedOnly');
  const severity = searchParams.get('severity');
  const sourceType = searchParams.get('sourceType');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const assignedUserId = searchParams.get('assignedUserId');
  return {
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? parseInt(limit, 10) : 25,
    sort:
      sortParam && VALID_SORT.includes(sortParam as (typeof VALID_SORT)[number])
        ? (sortParam as ListAlertsParams['sort'])
        : 'triggered_at_desc',
    status:
      status && ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'].includes(status)
        ? (status as ListAlertsParams['status'])
        : undefined,
    assignedToMe: assignedToMe === 'true',
    unassignedOnly: unassignedOnly === 'true',
    severity: severity || undefined,
    sourceType: sourceType || undefined,
    from: from || undefined,
    to: to || undefined,
    assignedUserId: assignedUserId || undefined,
  };
}

export function AlertListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const params = parseParams(searchParams);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkResolveOpen, setBulkResolveOpen] = useState(false);
  const [bulkResolveError, setBulkResolveError] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.alerts.list(params),
    queryFn: () => listAlerts(params),
  });

  const { data: usersData } = useQuery({
    queryKey: usersQueryKeys.users.list({ page: 1, limit: 100 }),
    queryFn: () => listUsers({ page: 1, limit: 100 }),
    enabled: advancedFiltersOpen,
  });

  const items = data?.items ?? [];

  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchParams]);

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

  function handleSort(sortBy: string, order: 'asc' | 'desc') {
    const suffix = order === 'asc' ? '_asc' : '_desc';
    const sortValue = `${sortBy}${suffix}` as (typeof VALID_SORT)[number];
    setParam('sort', sortValue);
  }

  const sortState = (() => {
    const s = params.sort ?? 'triggered_at_desc';
    if (s.startsWith('triggered_at_')) return { sortBy: 'triggered_at' as const, order: (s.endsWith('_asc') ? 'asc' : 'desc') as const };
    if (s.startsWith('status_')) return { sortBy: 'status' as const, order: (s.endsWith('_asc') ? 'asc' : 'desc') as const };
    if (s.startsWith('severity_')) return { sortBy: 'severity' as const, order: (s.endsWith('_asc') ? 'asc' : 'desc') as const };
    if (s.startsWith('assigned_')) return { sortBy: 'assigned' as const, order: (s.endsWith('_asc') ? 'asc' : 'desc') as const };
    return { sortBy: 'created_at' as const, order: 'desc' as const };
  })();

  function handleSelectionChange(ids: string[]) {
    setSelectedIds(new Set(ids));
  }

  const selectedItems = items.filter((r) => selectedIds.has(r.id));
  const openSelected = selectedItems.filter((r) => r.status === 'OPEN');
  const resolveEligibleSelected = selectedItems.filter(
    (r) => r.status === 'OPEN' || r.status === 'ACKNOWLEDGED'
  );

  const bulkAcknowledgeMutation = useMutation({
    mutationFn: () =>
      bulkAcknowledgeAlerts(openSelected.map((r) => r.id)),
    onSuccess: (result) => {
      const msg =
        result.failed > 0
          ? `Acknowledged ${result.succeeded} of ${result.processed}. ${result.failed} failed.`
          : `Acknowledged ${result.succeeded} alert(s).`;
      toast.success(msg);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
      queryClient.invalidateQueries({ queryKey: ['escalations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError ? err.message : 'Failed to acknowledge alerts';
      toast.error(msg);
    },
  });

  const bulkResolveMutation = useMutation({
    mutationFn: (note: string) =>
      bulkResolveAlerts(
        resolveEligibleSelected.map((r) => r.id),
        note || undefined
      ),
    onSuccess: (result) => {
      setBulkResolveOpen(false);
      setBulkResolveError(null);
      const msg =
        result.failed > 0
          ? `Resolved ${result.succeeded} of ${result.processed}. ${result.failed} failed.`
          : `Resolved ${result.succeeded} alert(s).`;
      toast.success(msg);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
      queryClient.invalidateQueries({ queryKey: ['escalations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError ? err.message : 'Failed to resolve alerts';
      if (
        msg.toLowerCase().includes('note') ||
        msg.toLowerCase().includes('required')
      ) {
        setBulkResolveError(msg);
      } else {
        toast.error(msg);
        setBulkResolveOpen(false);
      }
    },
  });

  const rowClassName = (row: AlertEvent) => {
    const severityMap: Record<string, string> = {
      CRITICAL: 'border-l-[6px] border-l-red-600',
      HIGH: 'border-l-[6px] border-l-amber-500',
      MEDIUM: 'border-l-[6px] border-l-amber-400',
      LOW: 'border-l-[6px] border-l-slate-400',
    };
    const base = severityMap[row.severity ?? ''] ?? 'border-l-[6px] border-l-slate-300';
    const openBg = row.status === 'OPEN' ? 'bg-red-50/40' : '';
    return `${base} ${openBg}`;
  };

  const columns = [
    {
      key: 'status',
      header: (
        <SortableColumnHeader
          label="Status"
          sortKey="status"
          currentSort={sortState}
          onSort={handleSort}
        />
      ),
      render: (row: AlertEvent) => (
        <div className="flex flex-col gap-0.5">
          <StatusBadge status={row.status} />
        </div>
      ),
    },
    {
      key: 'severity',
      header: (
        <SortableColumnHeader
          label="Severity"
          sortKey="severity"
          currentSort={sortState}
          onSort={handleSort}
        />
      ),
      render: (row: AlertEvent) => (
        <div className="flex flex-col gap-0.5">
          <SeverityBadge severity={row.severity} />
        </div>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (row: AlertEvent) => {
        const { primary, secondary } = formatAlertSourceDisplay(row);
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-slate-900">{primary}</span>
            {secondary && (
              <span className="text-xs text-slate-500">{secondary}</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'assignedTo',
      header: (
        <SortableColumnHeader
          label="Assigned"
          sortKey="assigned"
          currentSort={sortState}
          onSort={handleSort}
        />
      ),
      render: (row: AlertEvent) => (
        <div className="flex flex-col gap-0.5">
          <AssigneeBadge
            assignedToUserId={row.assignedToUserId}
            assignedToUser={row.assignedToUser}
          />
        </div>
      ),
    },
    {
      key: 'triggeredAt',
      header: (
        <SortableColumnHeader
          label="Triggered"
          sortKey="triggered_at"
          currentSort={sortState}
          onSort={handleSort}
        />
      ),
      render: (row: AlertEvent) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-slate-900">
            {formatRelative(row.triggeredAt)}
          </span>
          <span className="text-xs text-slate-400">
            {formatDateTimeContextual(row.triggeredAt)}
          </span>
        </div>
      ),
    },
  ];

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Alerts"
          description="Manage and triage operational alerts"
        />
        <ErrorState
          title="Failed to load alerts"
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
        title="Alerts"
        description="Manage and triage operational alerts"
      />

      <div className="space-y-3">
        <FilterBar>
          <FilterSelect
            value={params.status ?? ''}
            onChange={(v) => setParam('status', v)}
            options={STATUS_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
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
              options={SEVERITY_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              aria-label="Filter by severity"
            />
            <FilterSelect
              value={params.sourceType ?? ''}
              onChange={(v) => setParam('sourceType', v)}
              options={SOURCE_TYPE_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              aria-label="Filter by source type"
            />
            <FilterInput
              type="date"
              value={params.from ?? ''}
              onChange={(v) => setParam('from', v)}
              aria-label="From date"
            />
            <FilterInput
              type="date"
              value={params.to ?? ''}
              onChange={(v) => setParam('to', v)}
              aria-label="To date"
            />
            <FilterSelect
              value={params.assignedUserId ?? ''}
              onChange={(v) => setParam('assignedUserId', v)}
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

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <span className="text-sm font-medium text-foreground">
            {selectedIds.size} selected
          </span>
          <PermissionGate permission="alert.acknowledge">
            <Button
              variant="primary"
              size="sm"
              onClick={() => bulkAcknowledgeMutation.mutate()}
              disabled={
                openSelected.length === 0 || bulkAcknowledgeMutation.isPending
              }
            >
              {bulkAcknowledgeMutation.isPending
                ? 'Acknowledging...'
                : `Acknowledge ${openSelected.length} (Open only)`}
            </Button>
          </PermissionGate>
          <PermissionGate permission="alert.resolve">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setBulkResolveError(null);
                setBulkResolveOpen(true);
              }}
              disabled={
                resolveEligibleSelected.length === 0 || bulkResolveMutation.isPending
              }
            >
              Resolve {resolveEligibleSelected.length}
            </Button>
          </PermissionGate>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear selection
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        emptyMessage="No alerts yet"
        emptyDescription="Alerts are created when checklist items fail"
        emptyAction={
          <Link to="/checklist-runs">
            <Button variant="secondary" size="sm">
              Go to checklist runs
            </Button>
          </Link>
        }
        getRowId={(row) => row.id}
        onRowClick={(row) => navigate(`/alerts/${row.id}`)}
        getRowClassName={rowClassName}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={handleSelectionChange}
      />

      {data && data.total > 0 && (
        <DataTablePagination
          page={data.page}
          limit={data.limit}
          total={data.total}
          onPageChange={(page) => setParam('page', page)}
        />
      )}

      <BulkResolveModal
        open={bulkResolveOpen}
        onClose={() => {
          setBulkResolveOpen(false);
          setBulkResolveError(null);
        }}
        onConfirm={(note) => bulkResolveMutation.mutate(note)}
        loading={bulkResolveMutation.isPending}
        error={bulkResolveError ?? undefined}
        eligibleCount={resolveEligibleSelected.length}
      />
    </div>
  );
}
