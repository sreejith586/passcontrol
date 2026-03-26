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
import { FilterBar, FilterSelect, FilterInput } from '@/shared/layout/FilterBar';
import { Card } from '@/shared/ui/Card';
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

const ASSIGNEE_OPTIONS = [
  { value: 'anyone', label: 'Anyone' },
  { value: 'me', label: 'Assigned to me' },
  { value: 'unassigned', label: 'Unassigned only' },
] as const;

type AssigneeMode = (typeof ASSIGNEE_OPTIONS)[number]['value'];

interface AlertFilters {
  status?: string;
  severity?: string;
  sourceType?: string;
  from?: string;
  to?: string;
  assigneeMode: AssigneeMode;
  assignedUserId?: string;
}

function filtersToParams(f: AlertFilters): Partial<ListAlertsParams> {
  return {
    status: f.status && ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'].includes(f.status) ? (f.status as ListAlertsParams['status']) : undefined,
    severity: f.severity || undefined,
    sourceType: f.sourceType || undefined,
    from: f.from || undefined,
    to: f.to || undefined,
    assignedToMe: f.assigneeMode === 'me',
    unassignedOnly: f.assigneeMode === 'unassigned',
    assignedUserId: f.assigneeMode === 'anyone' && f.assignedUserId ? f.assignedUserId : undefined,
  };
}

function paramsToFilters(p: ListAlertsParams): AlertFilters {
  let assigneeMode: AssigneeMode = 'anyone';
  if (p.unassignedOnly) assigneeMode = 'unassigned';
  else if (p.assignedToMe) assigneeMode = 'me';
  return {
    status: p.status ?? '',
    severity: p.severity ?? '',
    sourceType: p.sourceType ?? '',
    from: p.from ?? '',
    to: p.to ?? '',
    assigneeMode,
    assignedUserId: p.assignedUserId ?? '',
  };
}

const DEFAULT_FILTERS: AlertFilters = {
  status: '',
  severity: '',
  sourceType: '',
  from: '',
  to: '',
  assigneeMode: 'anyone',
  assignedUserId: '',
};

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
  const [draftFilters, setDraftFilters] = useState<AlertFilters>(() =>
    paramsToFilters(params)
  );
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
  });

  useEffect(() => {
    setDraftFilters(paramsToFilters(parseParams(searchParams)));
  }, [searchParams]);

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

  function handleApply() {
    const applied = filtersToParams(draftFilters);
    const next = new URLSearchParams(searchParams);
    next.set('page', '1');
    const filterKeys = ['status', 'severity', 'sourceType', 'from', 'to', 'assignedToMe', 'unassignedOnly', 'assignedUserId'];
    filterKeys.forEach((k) => next.delete(k));
    if (applied.status) next.set('status', applied.status);
    if (applied.severity) next.set('severity', applied.severity);
    if (applied.sourceType) next.set('sourceType', applied.sourceType);
    if (applied.from) next.set('from', applied.from);
    if (applied.to) next.set('to', applied.to);
    if (applied.assignedToMe) next.set('assignedToMe', 'true');
    if (applied.unassignedOnly) next.set('unassignedOnly', 'true');
    if (applied.assignedUserId) next.set('assignedUserId', applied.assignedUserId);
    setSearchParams(next);
  }

  function handleReset() {
    setDraftFilters(DEFAULT_FILTERS);
    const next = new URLSearchParams(searchParams);
    next.set('page', '1');
    ['status', 'severity', 'sourceType', 'from', 'to', 'assignedToMe', 'unassignedOnly', 'assignedUserId'].forEach((k) =>
      next.delete(k)
    );
    setSearchParams(next);
  }

  function handleSort(sortBy: string, order: 'asc' | 'desc') {
    const suffix = order === 'asc' ? '_asc' : '_desc';
    const sortValue = `${sortBy}${suffix}` as (typeof VALID_SORT)[number];
    setParam('sort', sortValue);
  }

  const sortState = (() => {
    const s = params.sort ?? 'triggered_at_desc';
    const order: 'asc' | 'desc' = s.endsWith('_asc') ? 'asc' : 'desc';
    if (s.startsWith('triggered_at_')) return { sortBy: 'triggered_at' as const, order };
    if (s.startsWith('status_')) return { sortBy: 'status' as const, order };
    if (s.startsWith('severity_')) return { sortBy: 'severity' as const, order };
    if (s.startsWith('assigned_')) return { sortBy: 'assigned' as const, order };
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

      <Card className="p-4">
        <FilterBar className="flex-wrap items-end gap-4">
          <div className="w-full lg:w-auto">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Status
            </span>
            <FilterSelect
              value={draftFilters.status ?? ''}
              onChange={(v) =>
                setDraftFilters((f) => ({ ...f, status: v || '' }))
              }
              options={STATUS_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              aria-label="Filter by status"
            />
          </div>
          <div className="w-full lg:w-auto">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Severity
            </span>
            <FilterSelect
              value={draftFilters.severity ?? ''}
              onChange={(v) =>
                setDraftFilters((f) => ({ ...f, severity: v || '' }))
              }
              options={SEVERITY_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              aria-label="Filter by severity"
            />
          </div>
          <div className="w-full lg:w-auto">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Source type
            </span>
            <FilterSelect
              value={draftFilters.sourceType ?? ''}
              onChange={(v) =>
                setDraftFilters((f) => ({ ...f, sourceType: v || '' }))
              }
              options={SOURCE_TYPE_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              aria-label="Filter by source type"
            />
          </div>
          <div className="w-full lg:w-auto">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Assignee
            </span>
            <FilterSelect
              value={draftFilters.assigneeMode}
              onChange={(v) =>
                setDraftFilters((f) => ({
                  ...f,
                  assigneeMode: v as AssigneeMode,
                  assignedUserId: v !== 'anyone' ? '' : f.assignedUserId,
                }))
              }
              options={ASSIGNEE_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              aria-label="Filter by assignee"
            />
          </div>
          {draftFilters.assigneeMode === 'anyone' && (
            <div className="w-full lg:w-auto">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                Assigned to
              </span>
              <FilterSelect
                value={draftFilters.assignedUserId ?? ''}
                onChange={(v) =>
                  setDraftFilters((f) => ({ ...f, assignedUserId: v || '' }))
                }
                options={[
                  { value: '', label: 'Any assignee' },
                  ...(usersData?.items ?? []).map((u) => ({
                    value: u.id,
                    label: u.name,
                  })),
                ]}
                aria-label="Filter by assigned user"
              />
            </div>
          )}
          <div className="w-full lg:w-auto">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              From date
            </span>
            <FilterInput
              type="date"
              value={draftFilters.from ?? ''}
              onChange={(v) =>
                setDraftFilters((f) => ({ ...f, from: v || '' }))
              }
              aria-label="From date"
            />
          </div>
          <div className="w-full lg:w-auto">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              To date
            </span>
            <FilterInput
              type="date"
              value={draftFilters.to ?? ''}
              onChange={(v) =>
                setDraftFilters((f) => ({ ...f, to: v || '' }))
              }
              aria-label="To date"
            />
          </div>
          <div className="w-full lg:w-auto">
            <span className="mb-1 block text-xs font-medium text-muted-foreground invisible">
              Actions
            </span>
            <div className="flex h-9 items-center gap-2">
              <Button variant="primary" size="sm" onClick={handleApply}>
                Apply
              </Button>
              <Button variant="secondary" size="sm" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </div>
        </FilterBar>
      </Card>

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
