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

  const columns = [
    {
      key: 'template',
      header: 'Checklist',
      render: (row: ChecklistRun) => (
        <span className="font-medium">{row.templateNameSnapshot}</span>
      ),
    },
    {
      key: 'due',
      header: 'Due',
      render: (row: ChecklistRun) =>
        row.dueAt ? formatDateTime(row.dueAt) : '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: ChecklistRun) => <RunStatusBadge status={row.status} />,
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (row: ChecklistRun) => {
        const p = computeProgress(row);
        return p ? <span className="text-muted-foreground">{p}</span> : '—';
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
      <div className="flex gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setTab('today')}
          className={cn(
            'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
            tab === 'today'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setTab('overdue')}
          className={cn(
            'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
            tab === 'overdue'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Overdue
        </button>
        <button
          type="button"
          onClick={() => setTab('failed')}
          className={cn(
            'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
            tab === 'failed'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Failed
        </button>
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
