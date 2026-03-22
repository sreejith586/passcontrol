import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTodayRuns, getOverdueRuns, getFailedRuns } from './api';
import { queryKeys } from './query-keys';
import type { ChecklistRun } from './types';
import {
  computeRunMetrics,
  formatProgress,
  formatRequiredScope,
} from './run-metrics';
import { DataTable, DataTablePagination } from '@/shared/ui';
import { quickSetup } from '@/features/onboarding/api';
import { PermissionGate } from '@/core/permissions/PermissionGate';
import { toast } from '@/shared/feedback/useToast';
import { PageHeader } from '@/shared/layout/PageHeader';
import { ErrorState } from '@/shared/layout/ErrorState';
import { RunStatusBadge } from './components/RunStatusBadge';
import { formatDateTime } from '@/lib/date';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/lib/cn';

type Tab = 'today' | 'overdue' | 'failed';

export function ChecklistRunsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: Tab =
    tabParam === 'today' || tabParam === 'overdue' || tabParam === 'failed'
      ? tabParam
      : 'today';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '25', 10);

  const todayQuery = useQuery({
    queryKey: queryKeys.today({ page, limit }),
    queryFn: () => getTodayRuns({ page, limit }),
    enabled: tab === 'today',
  });

  const overdueQuery = useQuery({
    queryKey: queryKeys.overdue({ page, limit }),
    queryFn: () => getOverdueRuns({ page, limit }),
    enabled: tab === 'overdue',
  });

  const failedQuery = useQuery({
    queryKey: queryKeys.failed({ page, limit }),
    queryFn: () => getFailedRuns({ page, limit }),
    enabled: tab === 'failed',
  });

  const activeQuery =
    tab === 'today'
      ? todayQuery
      : tab === 'overdue'
        ? overdueQuery
        : failedQuery;
  const data = activeQuery.data;

  const quickSetupMutation = useMutation({
    mutationFn: quickSetup,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-runs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate(`/checklist-runs/${result.runId}`);
      toast.success('Your first checklist run is ready');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Setup failed');
    },
  });
  const isLoading = activeQuery.isLoading;
  const isError = activeQuery.isError;
  const error = activeQuery.error;

  function setTab(t: Tab) {
    const next = new URLSearchParams(searchParams);
    next.set('tab', t);
    next.set('page', '1');
    setSearchParams(next);
  }

  function setPage(p: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(p));
    setSearchParams(next);
  }

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      PENDING: 'Not started',
      IN_PROGRESS: 'In progress',
      COMPLETED: 'Completed',
    };
    return map[status] ?? status;
  };

  const getRowClassName = (row: ChecklistRun) => {
    const m = computeRunMetrics(row);
    const isOverdue =
      row.dueAt && new Date(row.dueAt) < new Date() && row.status !== 'COMPLETED';
    const isBlocked = m.missingEvidenceCount > 0 || m.missingCommentCount > 0;
    const hasProblems = m.failedCount > 0 || m.incompleteRequiredCount > 0;
    const isClean =
      row.status === 'COMPLETED' &&
      !isBlocked &&
      !hasProblems &&
      !isOverdue;

    if (isBlocked) return 'border-l-[6px] border-l-red-600 bg-red-50/30';
    if (m.failedCount > 0) return 'border-l-[6px] border-l-red-600 bg-red-50/30';
    if (m.incompleteRequiredCount > 0 || isOverdue)
      return 'border-l-[6px] border-l-amber-500 bg-amber-50/30';
    if (isClean) return 'border-l-[6px] border-l-slate-200 bg-slate-50/20';
    return 'border-l-[6px] border-l-slate-200';
  };

  const columns = [
    {
      key: 'template',
      header: 'Checklist',
      render: (row: ChecklistRun) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-slate-900">
            {row.templateNameSnapshot}
          </span>
          <span className="text-xs text-slate-500">
            Run #{row.runNumber}
          </span>
        </div>
      ),
    },
    {
      key: 'due',
      header: 'Due',
      render: (row: ChecklistRun) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-slate-900">
            {row.dueAt ? formatDateTime(row.dueAt) : '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: ChecklistRun) => (
        <div className="flex flex-col gap-1">
          <RunStatusBadge status={row.status} />
          <span className="text-xs text-slate-500">
            {statusLabel(row.status)}
          </span>
        </div>
      ),
    },
    {
      key: 'assignedTo',
      header: 'Assigned To',
      render: (row: ChecklistRun) => (
        <span className="text-slate-600">
          {row.assignedToUser?.name ?? 'Unassigned'}
        </span>
      ),
    },
    {
      key: 'performedBy',
      header: 'Performed By',
      render: (row: ChecklistRun) => (
        <span className="text-slate-600">
          {row.performedByUser?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'progress',
      header: 'Execution',
      render: (row: ChecklistRun) => {
        const m = computeRunMetrics(row);
        const progress = formatProgress(m);
        const hasBlockers =
          m.missingEvidenceCount > 0 || m.missingCommentCount > 0;
        const hasProblems =
          m.failedCount > 0 || m.incompleteRequiredCount > 0;
        const showPills = hasBlockers || hasProblems;

        return (
          <div className="flex flex-col gap-1">
            <span className="font-medium text-slate-900">
              {progress ? `${progress} completed` : '—'}
            </span>
            {showPills && (
              <div className="flex flex-wrap gap-1.5">
                {m.failedCount > 0 && (
                  <span
                    className={cn(
                      'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium',
                      'bg-amber-100 text-amber-800'
                    )}
                  >
                    {m.failedCount} failed
                  </span>
                )}
                {m.incompleteRequiredCount > 0 && (
                  <span
                    className={cn(
                      'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium',
                      'bg-amber-100 text-amber-800'
                    )}
                  >
                    {m.incompleteRequiredCount} req. missing
                  </span>
                )}
                {m.missingEvidenceCount > 0 && (
                  <span
                    className={cn(
                      'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium',
                      'bg-red-100 text-red-800'
                    )}
                  >
                    {m.missingEvidenceCount} missing evidence
                  </span>
                )}
                {m.missingCommentCount > 0 && (
                  <span
                    className={cn(
                      'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium',
                      'bg-red-100 text-red-800'
                    )}
                  >
                    {m.missingCommentCount} missing comment
                  </span>
                )}
                {m.attachmentCount > 0 && (
                  <span className="text-xs text-slate-500">
                    {m.attachmentCount} attachment
                    {m.attachmentCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'scope',
      header: 'Required scope',
      render: (row: ChecklistRun) => {
        const m = computeRunMetrics(row);
        return (
          <span className="text-sm text-slate-600">
            {formatRequiredScope(m)}
          </span>
        );
      },
    },
  ];

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Checklist Runs"
          description="Execute and submit checklist runs"
        />
        <ErrorState
          title="Failed to load runs"
          description={error instanceof Error ? error.message : 'Something went wrong'}
          action={
            <Button variant="secondary" size="sm" onClick={() => activeQuery.refetch()}>
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
        title="Checklist Runs"
        description="Execute and submit checklist runs"
      />
      <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm w-fit">
        {(['today', 'overdue', 'failed'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors',
              tab === t
                ? 'bg-sky-100 text-sky-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            )}
          >
            {t === 'today' ? 'Today' : t === 'overdue' ? 'Overdue' : 'Failed'}
          </button>
        ))}
      </div>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        emptyMessage="No checklist runs yet"
        emptyDescription="Create your first checklist and start your first run"
        emptyAction={
          <PermissionGate permission="checklist.template.create">
            <Button
              variant="primary"
              size="sm"
              onClick={() => quickSetupMutation.mutate()}
              disabled={quickSetupMutation.isPending}
            >
              {quickSetupMutation.isPending ? 'Setting up...' : 'Start setup'}
            </Button>
          </PermissionGate>
        }
        getRowId={(row) => row.id}
        onRowClick={(row) => navigate(`/checklist-runs/${row.id}`)}
        getRowClassName={getRowClassName}
      />
      {data && data.total > 0 && (
        <DataTablePagination
          page={data.page}
          limit={data.limit}
          total={data.total}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
