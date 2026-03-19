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
import { Skeleton } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/layout/ErrorState';
import { EmptyState } from '@/shared/layout/EmptyState';
import { cn } from '@/lib/cn';
import { SeverityBadge } from '@/features/alerts/components/SeverityBadge';
import { StatusBadge } from '@/features/alerts/components/StatusBadge';
import { getSourceTypeLabel } from '@/lib/labels';
import { Button } from '@/shared/ui/Button';

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
        'rounded-lg border p-4 transition-colors',
        variant === 'destructive' && 'border-destructive/50 bg-destructive/5',
        variant === 'warning' && 'border-amber-500/50 bg-amber-500/5',
        variant === 'default' && 'border-border bg-muted/30'
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
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

  const hasError =
    (hasChecklistView && checklistMetrics.isError) ||
    (hasAlertView && (escalationSummary.isError || prioritized.isError));
  const errorQuery = checklistMetrics.isError
    ? checklistMetrics
    : escalationSummary.isError
      ? escalationSummary
      : prioritized;

  if (!hasChecklistView && !hasAlertView) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" />
        <EmptyState
          title="No access"
          description="You don't have permission to view dashboard metrics."
        />
      </div>
    );
  }

  if (hasError && errorQuery) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" />
        <ErrorState
          title="Failed to load dashboard"
          description={
            errorQuery.error instanceof Error
              ? errorQuery.error.message
              : 'Something went wrong'
          }
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => errorQuery.refetch()}
            >
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Operational overview" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
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

      {hasAlertView && prioritized.data && (
        <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-foreground">Top priorities</h2>
            <Link
              to="/escalations"
              className="text-sm text-primary hover:underline"
            >
              View all →
            </Link>
          </div>
          {prioritized.data.items.length > 0 ? (
            <>
              <div className="overflow-hidden rounded-md border border-border bg-background">
                <ul className="divide-y divide-border">
                  {prioritized.data.items.slice(0, 10).map((item) => (
                    <li key={item.alertEventId}>
                      <Link
                        to={`/alerts/${item.alertEventId}`}
                        className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/50"
                      >
                        <span className="flex shrink-0 items-center gap-2 truncate text-sm">
                          <SeverityBadge severity={item.severity} />
                          <StatusBadge
                            status={item.status as 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'}
                          />
                          <span className="truncate">{getSourceTypeLabel(item.sourceType)}</span>
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
            </>
          ) : (
            <EmptyState
              title="No urgent escalations"
              description="All active alerts are within SLA."
              action={
                <Link to="/escalations">
                  <Button variant="secondary" size="sm">
                    View escalations
                  </Button>
                </Link>
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
