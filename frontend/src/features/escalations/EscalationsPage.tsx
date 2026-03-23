import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Eye, UserPlus } from 'lucide-react';
import { listEscalations } from './api';
import { queryKeys } from './query-keys';
import { formatAge } from './format-age';
import type { EscalationsListParams, EscalationItem } from './types';
import { DataTable, DataTablePagination } from '@/shared/ui';
import { SortableColumnHeader } from '@/shared/ui/DataTable/SortableColumnHeader';
import { PageHeader } from '@/shared/layout/PageHeader';
import { ErrorState } from '@/shared/layout/ErrorState';
import { FilterBar, FilterSelect, FilterInput } from '@/shared/layout/FilterBar';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { formatDateTime } from '@/lib/date';
import { getSourceTypeLabel } from '@/lib/labels';
import { SeverityBadge } from '@/features/alerts/components/SeverityBadge';
import { StatusBadge } from '@/features/alerts/components/StatusBadge';
import { listUsers } from '@/features/users/api';
import { queryKeys as usersQueryKeys } from '@/features/users/query-keys';
import { cn } from '@/lib/cn';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
] as const;

const ESCALATION_VALID_SORT = [
  'created_at_asc',
  'created_at_desc',
  'status_asc',
  'status_desc',
  'severity_asc',
  'severity_desc',
  'assigned_asc',
  'assigned_desc',
] as const;

const SEVERITY_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
] as const;

const ASSIGNEE_OPTIONS = [
  { value: 'anyone', label: 'Anyone' },
  { value: 'me', label: 'Assigned to me' },
  { value: 'unassigned', label: 'Unassigned only' },
] as const;

const BREACH_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'breached', label: 'Breached only' },
] as const;

type AssigneeMode = (typeof ASSIGNEE_OPTIONS)[number]['value'];
type BreachMode = (typeof BREACH_OPTIONS)[number]['value'];

interface EscalationFilters {
  status: string;
  severity: string;
  breach: BreachMode;
  assigneeMode: AssigneeMode;
  assignedUserId: string;
  search: string;
}

function filtersToParams(f: EscalationFilters): Partial<EscalationsListParams> {
  return {
    status:
      f.status && ['OPEN', 'ACKNOWLEDGED'].includes(f.status)
        ? (f.status as 'OPEN' | 'ACKNOWLEDGED')
        : undefined,
    severity: f.severity || undefined,
    onlyBreached: f.breach === 'breached',
    assignedToMe: f.assigneeMode === 'me',
    unassignedOnly: f.assigneeMode === 'unassigned',
    assignedUserId:
      f.assigneeMode === 'anyone' && f.assignedUserId ? f.assignedUserId : undefined,
  };
}

function paramsToFilters(p: EscalationsListParams): EscalationFilters {
  let assigneeMode: AssigneeMode = 'anyone';
  if (p.unassignedOnly) assigneeMode = 'unassigned';
  else if (p.assignedToMe) assigneeMode = 'me';
  return {
    status: p.status ?? '',
    severity: p.severity ?? '',
    breach: p.onlyBreached ? 'breached' : 'all',
    assigneeMode,
    assignedUserId: p.assignedUserId ?? '',
    search: '',
  };
}

const DEFAULT_ESCALATION_FILTERS: EscalationFilters = {
  status: '',
  severity: '',
  breach: 'all',
  assigneeMode: 'anyone',
  assignedUserId: '',
  search: '',
};

function parseParams(searchParams: URLSearchParams): EscalationsListParams {
  const page = searchParams.get('page');
  const limit = searchParams.get('limit');
  const sortParam = searchParams.get('sort');
  const status = searchParams.get('status');
  const onlyBreached = searchParams.get('onlyBreached');
  const severity = searchParams.get('severity');
  const unassignedOnly = searchParams.get('unassignedOnly') === 'true';
  const assignedToMe = searchParams.get('assignedToMe') === 'true';
  const assignedUserId = searchParams.get('assignedUserId') || undefined;

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

  const sort =
    sortParam && ESCALATION_VALID_SORT.includes(sortParam as (typeof ESCALATION_VALID_SORT)[number])
      ? (sortParam as (typeof ESCALATION_VALID_SORT)[number])
      : undefined;

  return {
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? parseInt(limit, 10) : 25,
    sort,
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

function matchesSearch(row: EscalationItem, search: string): boolean {
  if (!search.trim()) return true;
  const q = search.trim().toLowerCase();
  const checklistName = (row.checklistName ?? '').toLowerCase();
  const itemLabel = (row.itemLabel ?? '').toLowerCase();
  const assignedName = (row.assignedToUser?.name ?? '').toLowerCase();
  const sourceLabel = getSourceTypeLabel(row.sourceType).toLowerCase();
  const sourceId = (row.sourceId ?? '').toLowerCase();
  return (
    checklistName.includes(q) ||
    itemLabel.includes(q) ||
    assignedName.includes(q) ||
    sourceLabel.includes(q) ||
    sourceId.includes(q)
  );
}

export function EscalationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const params = parseParams(searchParams);
  const [draftFilters, setDraftFilters] = useState<EscalationFilters>(() =>
    paramsToFilters(params)
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.escalations.list(params),
    queryFn: () => listEscalations(params),
  });

  const { data: usersData } = useQuery({
    queryKey: usersQueryKeys.users.list({ page: 1, limit: 100 }),
    queryFn: () => listUsers({ page: 1, limit: 100 }),
  });

  const items = data?.items ?? [];
  const filteredItems = useMemo(
    () => items.filter((row) => matchesSearch(row, draftFilters.search)),
    [items, draftFilters.search]
  );

  useEffect(() => {
    setDraftFilters((prev) => ({
      ...paramsToFilters(parseParams(searchParams)),
      search: prev.search,
    }));
  }, [searchParams]);

  const summary = useMemo(() => {
    const open = items.filter((r) => r.status === 'OPEN' || r.status === 'ACKNOWLEDGED');
    const criticalOpen = open.filter((r) => r.severity === 'CRITICAL');
    const slaBreached = items.filter(
      (r) => r.sla.acknowledgeBreached || r.sla.resolveBreached
    );
    const unassigned = items.filter(
      (r) => !r.assignedToUser?.id && !r.assignedToUser?.name
    );
    return {
      openCount: open.length,
      criticalOpenCount: criticalOpen.length,
      slaBreachedCount: slaBreached.length,
      unassignedCount: unassigned.length,
    };
  }, [items]);

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
    const filterKeys = [
      'status',
      'severity',
      'onlyBreached',
      'assignedToMe',
      'unassignedOnly',
      'assignedUserId',
    ];
    filterKeys.forEach((k) => next.delete(k));
    if (applied.status) next.set('status', applied.status);
    if (applied.severity) next.set('severity', applied.severity);
    if (applied.onlyBreached) next.set('onlyBreached', 'true');
    if (applied.assignedToMe) next.set('assignedToMe', 'true');
    if (applied.unassignedOnly) next.set('unassignedOnly', 'true');
    if (applied.assignedUserId) next.set('assignedUserId', applied.assignedUserId);
    setSearchParams(next);
  }

  function handleReset() {
    setDraftFilters(DEFAULT_ESCALATION_FILTERS);
    const next = new URLSearchParams(searchParams);
    next.set('page', '1');
    [
      'status',
      'severity',
      'onlyBreached',
      'assignedToMe',
      'unassignedOnly',
      'assignedUserId',
    ].forEach((k) => next.delete(k));
    setSearchParams(next);
  }

  function handleSort(sortBy: string, order: 'asc' | 'desc') {
    const suffix = order === 'asc' ? '_asc' : '_desc';
    const sortValue = `${sortBy}${suffix}` as (typeof ESCALATION_VALID_SORT)[number];
    setParam('sort', sortValue);
  }

  const sortState =
    params.sort != null
      ? (() => {
          const s = params.sort!;
          if (s.startsWith('created_at_'))
            return { sortBy: 'created_at' as const, order: (s.endsWith('_asc') ? 'asc' : 'desc') as const };
          if (s.startsWith('status_'))
            return { sortBy: 'status' as const, order: (s.endsWith('_asc') ? 'asc' : 'desc') as const };
          if (s.startsWith('severity_'))
            return { sortBy: 'severity' as const, order: (s.endsWith('_asc') ? 'asc' : 'desc') as const };
          if (s.startsWith('assigned_'))
            return { sortBy: 'assigned' as const, order: (s.endsWith('_asc') ? 'asc' : 'desc') as const };
          return undefined;
        })()
      : undefined;

  const getRowClassName = (row: EscalationItem) => {
    const hasResolveBreach = row.sla.resolveBreached;
    const base = 'border-l-4';
    if (hasResolveBreach) {
      return cn(base, 'border-l-red-500/70 bg-red-50/20');
    }
    if (row.severity === 'CRITICAL') {
      return cn(base, 'border-l-red-600/50');
    }
    if (row.severity === 'HIGH') {
      return cn(base, 'border-l-amber-500/50');
    }
    return cn(base, 'border-l-slate-200');
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
      render: (row: EscalationItem) => (
        <StatusBadge status={row.status as 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'} />
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
      render: (row: EscalationItem) => <SeverityBadge severity={row.severity} />,
    },
    {
      key: 'sla',
      header: 'SLA',
      render: (row: EscalationItem) => (
        <span className="flex flex-wrap gap-1">
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
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </span>
      ),
    },
    {
      key: 'checklistItem',
      header: 'Checklist / Item',
      render: (row: EscalationItem) => {
        const checklist = row.checklistName?.trim();
        const item = row.itemLabel?.trim();
        if (checklist || item) {
          return (
            <div className="flex flex-col gap-0.5">
              {checklist && (
                <span className="font-semibold text-foreground">{checklist}</span>
              )}
              {item && (
                <span className="text-xs text-muted-foreground">{item}</span>
              )}
            </div>
          );
        }
        return (
          <span className="text-foreground">
            {getSourceTypeLabel(row.sourceType)}
          </span>
        );
      },
    },
    {
      key: 'assignedTo',
      header: (
        <SortableColumnHeader
          label="Assigned To"
          sortKey="assigned"
          currentSort={sortState}
          onSort={handleSort}
        />
      ),
      render: (row: EscalationItem) => {
        const name = row.assignedToUser?.name;
        if (name) {
          return <span className="text-foreground">{name}</span>;
        }
        return (
          <span className="text-amber-600 text-sm font-medium">Unassigned</span>
        );
      },
    },
    {
      key: 'age',
      header: 'Age',
      render: (row: EscalationItem) => (
        <span className="tabular-nums text-muted-foreground">
          {formatAge(row.createdAt)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: (
        <SortableColumnHeader
          label="Created"
          sortKey="created_at"
          currentSort={sortState}
          onSort={handleSort}
        />
      ),
      render: (row: EscalationItem) => (
        <span className="text-muted-foreground text-xs">
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: EscalationItem) => (
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="secondary"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => navigate(`/alerts/${row.alertEventId}`)}
          >
            <Eye className="mr-1 h-3.5 w-3.5" />
            View
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => navigate(`/alerts/${row.alertEventId}`)}
            title="Assign on alert detail page"
          >
            <UserPlus className="mr-1 h-3.5 w-3.5" />
            Assign
          </Button>
        </div>
      ),
    },
  ];

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Escalations"
          description="Active alerts with SLA breach status"
        />
        <ErrorState
          title="Failed to load escalations"
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
        title="Escalations"
        description="Active alerts with SLA breach status"
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Open Escalations
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
            {summary.openCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Critical Open
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-red-600">
            {summary.criticalOpenCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            SLA Breached
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-amber-600">
            {summary.slaBreachedCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Unassigned
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
            {summary.unassignedCount}
          </p>
        </div>
      </div>

      <Card className="p-4">
        <FilterBar className="flex-wrap items-end gap-4">
          <div>
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Status
            </span>
            <FilterSelect
              value={draftFilters.status}
              onChange={(v) =>
                setDraftFilters((f) => ({ ...f, status: v || '' }))
              }
              options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              aria-label="Filter by status"
            />
          </div>
          <div>
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Severity
            </span>
            <FilterSelect
              value={draftFilters.severity}
              onChange={(v) =>
                setDraftFilters((f) => ({ ...f, severity: v || '' }))
              }
              options={SEVERITY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              aria-label="Filter by severity"
            />
          </div>
          <div>
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              SLA / Breach
            </span>
            <FilterSelect
              value={draftFilters.breach}
              onChange={(v) =>
                setDraftFilters((f) => ({
                  ...f,
                  breach: v as BreachMode,
                }))
              }
              options={BREACH_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              aria-label="Filter by breach state"
            />
          </div>
          <div>
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
              options={ASSIGNEE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              aria-label="Filter by assignee"
            />
          </div>
          {draftFilters.assigneeMode === 'anyone' && (
            <div>
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                Assigned to
              </span>
              <FilterSelect
                value={draftFilters.assignedUserId}
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
          <div>
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Search
            </span>
            <FilterInput
              type="text"
              value={draftFilters.search}
              onChange={(v) =>
                setDraftFilters((f) => ({ ...f, search: v || '' }))
              }
              placeholder="Checklist, item, assignee…"
              aria-label="Search escalations"
            />
          </div>
          <div>
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

      <DataTable
        columns={columns}
        data={filteredItems}
        loading={isLoading}
        emptyMessage="No escalations found"
        emptyDescription="Active alerts with SLA status will appear here."
        getRowId={(row) => row.alertEventId}
        onRowClick={(row) => navigate(`/alerts/${row.alertEventId}`)}
        getRowClassName={getRowClassName}
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
