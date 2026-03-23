import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listSchedules,
  activateSchedule,
  deactivateSchedule,
  generateRunFromSchedule,
} from './api';
import type { ChecklistSchedule } from './api';
import { queryKeys } from './query-keys';
import { getPresetLabelForRrule } from './rrule-presets';
import { DataTable } from '@/shared/ui';
import { SortableColumnHeader } from '@/shared/ui/DataTable/SortableColumnHeader';
import { PageHeader } from '@/shared/layout/PageHeader';
import { ErrorState } from '@/shared/layout/ErrorState';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { formatDateTime } from '@/lib/date';
import { PermissionGate } from '@/core/permissions/PermissionGate';
import { toast } from '@/shared/feedback/useToast';

type SortKey = 'name' | 'template' | 'status' | 'nextRunAt' | 'updatedAt';

export function ChecklistSchedulesListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<{ sortBy: SortKey; order: 'asc' | 'desc' }>({
    sortBy: 'name',
    order: 'asc',
  });

  const { data: schedules, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.list(),
    queryFn: () => listSchedules({ page: 1, limit: 100 }),
  });

  const activateMutation = useMutation({
    mutationFn: activateSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
      toast.success('Schedule activated');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to activate');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
      toast.success('Schedule deactivated');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to deactivate');
    },
  });

  const generateMutation = useMutation({
    mutationFn: (scheduleId: string) => generateRunFromSchedule(scheduleId),
    onSuccess: (run) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['checklist-runs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Run created');
      navigate(`/checklist-runs/${run.id}`);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Failed to generate run';
      toast.error(msg);
    },
  });

  const sortedSchedules = useMemo(() => {
    const list = schedules ?? [];
    return [...list].sort((a, b) => {
      const mul = sort.order === 'asc' ? 1 : -1;
      if (sort.sortBy === 'name') return mul * a.name.localeCompare(b.name);
      if (sort.sortBy === 'template') {
        const na = a.checklistTemplate?.name ?? '';
        const nb = b.checklistTemplate?.name ?? '';
        return mul * na.localeCompare(nb);
      }
      if (sort.sortBy === 'status') {
        const aa = a.isActive ? 1 : 0;
        const ab = b.isActive ? 1 : 0;
        return mul * (aa - ab);
      }
      if (sort.sortBy === 'nextRunAt') {
        const ta = a.nextRunAt ? new Date(a.nextRunAt).getTime() : 0;
        const tb = b.nextRunAt ? new Date(b.nextRunAt).getTime() : 0;
        return mul * (ta - tb);
      }
      return mul * (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
    });
  }, [schedules, sort]);

  const columns = [
    {
      key: 'name',
      header: (
        <SortableColumnHeader
          label="Name"
          sortKey="name"
          currentSort={sort}
          onSort={(sortBy, order) => setSort({ sortBy: sortBy as SortKey, order })}
        />
      ),
      render: (row: ChecklistSchedule) => (
        <span className="font-semibold text-slate-900">{row.name}</span>
      ),
    },
    {
      key: 'template',
      header: (
        <SortableColumnHeader
          label="Template"
          sortKey="template"
          currentSort={sort}
          onSort={(sortBy, order) => setSort({ sortBy: sortBy as SortKey, order })}
        />
      ),
      render: (row: ChecklistSchedule) => (
        <span className="text-slate-700">
          {row.checklistTemplate?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'recurrence',
      header: 'Recurrence',
      render: (row: ChecklistSchedule) => (
        <span className="text-slate-600">
          {getPresetLabelForRrule(row.rrule)}
        </span>
      ),
    },
    {
      key: 'timezone',
      header: 'Timezone',
      render: (row: ChecklistSchedule) => (
        <span className="font-mono text-sm text-slate-600">{row.timezone}</span>
      ),
    },
    {
      key: 'status',
      header: (
        <SortableColumnHeader
          label="Status"
          sortKey="status"
          currentSort={sort}
          onSort={(sortBy, order) => setSort({ sortBy: sortBy as SortKey, order })}
        />
      ),
      render: (row: ChecklistSchedule) => (
        <Badge variant={row.isActive ? 'success' : 'outline'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (row: ChecklistSchedule) => (
        <span className="text-slate-600">
          {row.ownerUser?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'nextRun',
      header: (
        <SortableColumnHeader
          label="Next run"
          sortKey="nextRunAt"
          currentSort={sort}
          onSort={(sortBy, order) => setSort({ sortBy: sortBy as SortKey, order })}
        />
      ),
      render: (row: ChecklistSchedule) => (
        <span className="text-slate-600">
          {row.nextRunAt ? formatDateTime(row.nextRunAt) : '—'}
        </span>
      ),
    },
    {
      key: 'updated',
      header: (
        <SortableColumnHeader
          label="Updated"
          sortKey="updatedAt"
          currentSort={sort}
          onSort={(sortBy, order) => setSort({ sortBy: sortBy as SortKey, order })}
        />
      ),
      render: (row: ChecklistSchedule) => (
        <span className="text-slate-600">{formatDateTime(row.updatedAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: ChecklistSchedule) => (
        <div
          className="flex flex-wrap gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <PermissionGate permission="checklist.schedule.update">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/checklist-schedules/${row.id}`)}
            >
              Edit
            </Button>
          </PermissionGate>
          <PermissionGate permission="checklist.schedule.activate">
            {row.isActive ? (
              <PermissionGate permission="checklist.schedule.deactivate">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deactivateMutation.mutate(row.id)}
                  disabled={deactivateMutation.isPending}
                >
                  Deactivate
                </Button>
              </PermissionGate>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => activateMutation.mutate(row.id)}
                disabled={activateMutation.isPending}
              >
                Activate
              </Button>
            )}
          </PermissionGate>
          <PermissionGate permission="checklist.run.generate">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => generateMutation.mutate(row.id)}
              disabled={generateMutation.isPending || !row.isActive}
              title={!row.isActive ? 'Activate schedule first' : 'Generate run for today'}
            >
              Generate run
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ];

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Checklist Schedules"
          description="Create and manage schedules for checklist runs"
        />
        <ErrorState
          title="Failed to load schedules"
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
        title="Checklist Schedules"
        description="Create and manage schedules for checklist runs"
        actions={
          <PermissionGate permission="checklist.schedule.create">
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/checklist-schedules/new')}
            >
              + Create Schedule
            </Button>
          </PermissionGate>
        }
      />
      <DataTable
        columns={columns}
        data={sortedSchedules}
        loading={isLoading}
        emptyMessage="No schedules yet"
        emptyDescription="Create a schedule to generate runs from published templates."
        emptyAction={
          <PermissionGate permission="checklist.schedule.create">
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/checklist-schedules/new')}
            >
              + Create Schedule
            </Button>
          </PermissionGate>
        }
        getRowId={(row) => row.id}
        onRowClick={(row) => navigate(`/checklist-schedules/${row.id}`)}
      />
    </div>
  );
}
