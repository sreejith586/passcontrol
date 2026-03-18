import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  getChecklistMetrics,
  getEscalationSummary,
  getPrioritizedEscalations,
} from './api';
import { queryKeys } from './query-keys';
import { PageHeader } from '@/shared/layout/PageHeader';
import { usePermission } from '@/core/permissions/use-permission';
import { Spinner } from '@/shared/ui/Spinner';
import { cn } from '@/lib/cn';

function MetricCard({
  label,
  value,
  variant = 'default',
}: {
  label: string;
  value: number;
  variant?: 'default' | 'warning' | 'destructive';
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        variant === 'destructive' && 'border-destructive/50 bg-destructive/5',
        variant === 'warning' && 'border-amber-500/50 bg-amber-500/5',
        variant === 'default' && 'border-border bg-muted/30'
      )}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function DashboardPage() {
  const hasChecklistView = usePermission('checklist.run.view');
  const hasAlertView = usePermission('alert.view');

  const checklistMetrics = useQuery({
    queryKey: queryKeys.dashboard.checklistMetrics(),
    queryFn: () => getChecklistMetrics(),
    enabled: hasChecklistView,
  });

  const escalationSummary = useQuery({
    queryKey: queryKeys.dashboard.escalationSummary(),
    queryFn: () => getEscalationSummary(),
    enabled: hasAlertView,
  });

  const prioritized = useQuery({
    queryKey: queryKeys.dashboard.prioritizedEscalations,
    queryFn: () => getPrioritizedEscalations(10),
    enabled: hasAlertView,
  });

  const isLoading =
    (hasChecklistView && checklistMetrics.isLoading) ||
    (hasAlertView && (escalationSummary.isLoading || prioritized.isLoading));

  if (!hasChecklistView && !hasAlertView) {
    return (
      <div className="space-y-4">
        <PageHeader title="Dashboard" />
        <p className="text-muted-foreground">
          You don&apos;t have permission to view dashboard metrics.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Operational overview"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {hasChecklistView && checklistMetrics.data && (
          <>
            <MetricCard
              label="Runs today"
              value={checklistMetrics.data.todayRuns}
            />
            <MetricCard
              label="Overdue runs"
              value={checklistMetrics.data.overdueRuns}
              variant={
                checklistMetrics.data.overdueRuns > 0 ? 'warning' : 'default'
              }
            />
            <MetricCard
              label="Failed runs"
              value={checklistMetrics.data.failedRuns}
              variant={
                checklistMetrics.data.failedRuns > 0 ? 'destructive' : 'default'
              }
            />
            <MetricCard
              label="Open alerts"
              value={checklistMetrics.data.openAlerts}
            />
            <MetricCard
              label="Acknowledged alerts"
              value={checklistMetrics.data.acknowledgedAlerts}
            />
            <MetricCard
              label="Resolved today"
              value={checklistMetrics.data.resolvedAlertsToday}
            />
          </>
        )}
        {hasAlertView && escalationSummary.data && (
          <>
            <MetricCard
              label="Active escalations"
              value={escalationSummary.data.totalActiveAlerts}
            />
            <MetricCard
              label="Ack breached"
              value={escalationSummary.data.acknowledgeBreached}
              variant={
                escalationSummary.data.acknowledgeBreached > 0
                  ? 'destructive'
                  : 'default'
              }
            />
            <MetricCard
              label="Resolve breached"
              value={escalationSummary.data.resolveBreached}
              variant={
                escalationSummary.data.resolveBreached > 0
                  ? 'destructive'
                  : 'default'
              }
            />
          </>
        )}
      </div>

      {hasAlertView && prioritized.data && prioritized.data.items.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-medium text-foreground">
            Top priorities
          </h2>
          <div className="rounded-lg border border-border">
            <ul className="divide-y divide-border">
              {prioritized.data.items.slice(0, 10).map((item) => (
                <li key={item.alertEventId}>
                  <Link
                    to={`/alerts/${item.alertEventId}`}
                    className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/50"
                  >
                    <span className="truncate text-sm">
                      {item.severity ?? '—'} • {item.sourceType}
                    </span>
                    <span className="flex shrink-0 gap-1 text-xs">
                      {item.sla.acknowledgeBreached && (
                        <span className="text-destructive">Ack breached</span>
                      )}
                      {item.sla.resolveBreached && (
                        <span className="text-destructive">Resolve breached</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <Link
            to="/escalations"
            className="text-sm text-primary hover:underline"
          >
            View all escalations →
          </Link>
        </div>
      )}
    </div>
  );
}
