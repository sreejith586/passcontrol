import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTodayRuns, getOverdueRuns, getFailedRuns } from './api';
import { queryKeys } from './query-keys';
import type { ChecklistRun } from './types';
import { DataTable, DataTablePagination } from '@/shared/ui';
import { PageHeader } from '@/shared/layout/PageHeader';
import { ErrorState } from '@/shared/layout/ErrorState';
import { RunStatusBadge } from './components/RunStatusBadge';
import { formatDateTime } from '@/lib/date';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/lib/cn';

type Tab = 'today' | 'overdue' | 'failed';

function computeProgress(run: ChecklistRun): string | null {
  if (!run.sectionSnapshots?.length) return null;
  let total = 0;
  let answered = 0;
  for (const section of run.sectionSnapshots) {
    for (const item of section.itemSnapshots) {
      total++;
      if (item.respondedAt) answered++;
    }
  }
  if (total === 0) return null;
  return `${answered}/${total}`;
}

function computeFailedCount(run: ChecklistRun): number {
  if (!run.sectionSnapshots?.length) return 0;
  let count = 0;
  for (const section of run.sectionSnapshots) {
    for (const item of section.itemSnapshots) {
      if (item.result === 'FAIL') count++;
    }
  }
  return count;
}

function computeAttachmentCount(run: ChecklistRun): number {
  if (!run.sectionSnapshots?.length) return 0;
  let count = 0;
  for (const section of run.sectionSnapshots) {
    for (const item of section.itemSnapshots) {
      count += item._count?.attachments ?? 0;
    }
  }
  return count;
}

export function ChecklistRunsListPage() {
  const navigate = useNavigate();
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
      key: 'progress',
      header: 'Execution',
      render: (row: ChecklistRun) => {
        const progress = computeProgress(row);
        const failed = computeFailedCount(row);
        const attachments = computeAttachmentCount(row);
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-slate-900">
              {progress ?? '—'}
            </span>
            <div className="flex flex-wrap gap-x-2 text-xs text-slate-500">
              {failed > 0 && (
                <span className="text-amber-600 font-medium">{failed} failed</span>
              )}
              {attachments > 0 && (
                <span>{attachments} attachment{attachments !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
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
        emptyMessage={
          tab === 'today'
            ? 'No runs for today'
            : tab === 'overdue'
              ? 'No overdue runs'
              : 'No runs with failed items'
        }
        emptyDescription={
          tab === 'today'
            ? 'Checklist runs for today will appear here.'
            : tab === 'overdue'
              ? 'All runs are on schedule.'
              : 'Runs with failed items will appear here.'
        }
        getRowId={(row) => row.id}
        onRowClick={(row) => navigate(`/checklist-runs/${row.id}`)}
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
