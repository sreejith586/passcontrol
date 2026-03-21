import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import {
  getChecklistMetrics,
  getEscalationSummary,
  getPrioritizedEscalations,
  getSlaCompliance,
  getEscalationTrend,
  getTopProblemSources,
} from './api';
import { queryKeys } from './query-keys';
import { PageHeader } from '@/shared/layout/PageHeader';
import { usePermission } from '@/core/permissions/use-permission';
import { Skeleton } from '@/shared/ui/Skeleton';
import { EmptyState } from '@/shared/layout/EmptyState';
import { cn } from '@/lib/cn';
import { SeverityBadge } from '@/features/alerts/components/SeverityBadge';
import { StatusBadge } from '@/features/alerts/components/StatusBadge';
import { getSourceTypeLabel } from '@/lib/labels';
import { Button } from '@/shared/ui/Button';

const SLA_DAYS = 30;

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

  const slaRange = {
    from: format(subDays(new Date(), SLA_DAYS), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  };
  const slaCompliance = useQuery({
    queryKey: queryKeys.dashboard.slaCompliance(slaRange),
    queryFn: () => getSlaCompliance(slaRange),
    enabled: hasAlertView,
  });

  const escalationTrend = useQuery({
    queryKey: queryKeys.dashboard.escalationTrend(7),
    queryFn: () => getEscalationTrend(7),
    enabled: hasAlertView,
  });

  const topProblemSources = useQuery({
    queryKey: queryKeys.dashboard.topProblemSources(5),
    queryFn: () => getTopProblemSources(5),
    enabled: hasAlertView,
  });

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

  function SectionError({
    message,
    onRetry,
  }: {
    message: string;
    onRetry: () => void;
  }) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm font-medium text-destructive">Failed to load</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{message}</p>
        <Button variant="ghost" size="sm" className="mt-2" onClick={onRetry}>
          Try again
        </Button>
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
        {hasChecklistView &&
          (checklistMetrics.isLoading ? (
            <>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </>
          ) : checklistMetrics.isError ? (
            <SectionError
              message={
                checklistMetrics.error instanceof Error
                  ? checklistMetrics.error.message
                  : 'Something went wrong'
              }
              onRetry={() => checklistMetrics.refetch()}
            />
          ) : checklistMetrics.data ? (
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
          ) : null)}
        {hasAlertView &&
          (escalationSummary.isLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </>
          ) : escalationSummary.isError ? (
            <SectionError
              message={
                escalationSummary.error instanceof Error
                  ? escalationSummary.error.message
                  : 'Something went wrong'
              }
              onRetry={() => escalationSummary.refetch()}
            />
          ) : escalationSummary.data ? (
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
          ) : null)}
      </div>

      {hasAlertView && (
        <div className="grid gap-4 lg:grid-cols-3">
          {slaCompliance.isLoading ? (
            <Skeleton className="h-48 rounded-lg" />
          ) : slaCompliance.isError ? (
            <SectionError
              message={
                slaCompliance.error instanceof Error
                  ? slaCompliance.error.message
                  : 'Something went wrong'
              }
              onRetry={() => slaCompliance.refetch()}
            />
          ) : slaCompliance.data ? (
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
              <h2 className="text-sm font-medium text-foreground">
                SLA compliance (last 30 days)
              </h2>
              <p className="text-xs text-muted-foreground">
                Alerts triggered in this period
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <MetricCard label="Total alerts" value={slaCompliance.data.totalAlerts} />
                <MetricCard
                  label="Ack within SLA"
                  value={slaCompliance.data.acknowledgedWithinSla}
                  variant="default"
                />
                <MetricCard
                  label="Ack breached"
                  value={slaCompliance.data.acknowledgedBreached}
                  variant={
                    slaCompliance.data.acknowledgedBreached > 0
                      ? 'destructive'
                      : 'default'
                  }
                />
                <MetricCard
                  label="Resolved within SLA"
                  value={slaCompliance.data.resolvedWithinSla}
                  variant="default"
                />
                <MetricCard
                  label="Resolved breached"
                  value={slaCompliance.data.resolvedBreached}
                  variant={
                    slaCompliance.data.resolvedBreached > 0
                      ? 'destructive'
                      : 'default'
                  }
                />
              </div>
              {slaCompliance.data.totalAlerts > 0 && (() => {
                const ackEval =
                  slaCompliance.data.acknowledgedWithinSla +
                  slaCompliance.data.acknowledgedBreached;
                const resEval =
                  slaCompliance.data.resolvedWithinSla +
                  slaCompliance.data.resolvedBreached;
                return (
                  <div className="flex flex-wrap gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
                    {ackEval > 0 && (
                      <span>
                        Ack compliance:{' '}
                        {(
                          (100 * slaCompliance.data.acknowledgedWithinSla) /
                          ackEval
                        ).toFixed(0)}
                        %
                      </span>
                    )}
                    {resEval > 0 && (
                      <span>
                        Resolve compliance:{' '}
                        {(
                          (100 * slaCompliance.data.resolvedWithinSla) /
                          resEval
                        ).toFixed(0)}
                        %
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : null}
          {escalationTrend.isLoading ? (
            <Skeleton className="h-48 rounded-lg" />
          ) : escalationTrend.isError ? (
            <SectionError
              message={
                escalationTrend.error instanceof Error
                  ? escalationTrend.error.message
                  : 'Something went wrong'
              }
              onRetry={() => escalationTrend.refetch()}
            />
          ) : escalationTrend.data ? (
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
              <h2 className="text-sm font-medium text-foreground">
                Alerts triggered (last 7 days)
              </h2>
              <p className="text-xs text-muted-foreground">
                Breached = currently past deadline
              </p>
              {escalationTrend.data.length > 0 ? (
                <div className="space-y-2">
                  {escalationTrend.data.map((point) => {
                    const maxTotal = Math.max(
                      ...escalationTrend.data!.map((p) => p.totalAlerts),
                      1
                    );
                    const widthPct = (point.totalAlerts / maxTotal) * 100;
                    return (
                      <div key={point.date} className="flex items-center gap-2">
                        <span className="w-20 shrink-0 text-xs text-muted-foreground">
                          {format(new Date(point.date), 'MMM d')}
                        </span>
                        <div className="flex flex-1 items-center">
                          <div
                            className="flex h-5 min-w-[2px] overflow-hidden rounded"
                            style={{ width: `${Math.max(widthPct, 2)}%` }}
                          >
                            <div
                              className="h-full bg-muted-foreground/30"
                              style={{
                                width: `${100 - (point.totalAlerts > 0 ? (point.breachedAlerts / point.totalAlerts) * 100 : 0)}%`,
                              }}
                            />
                            {point.breachedAlerts > 0 && (
                              <div
                                className="h-full flex-1 bg-destructive/60"
                                style={{
                                  width: `${point.totalAlerts > 0 ? (point.breachedAlerts / point.totalAlerts) * 100 : 0}%`,
                                }}
                              />
                            )}
                          </div>
                        </div>
                        <span className="w-14 shrink-0 text-right text-xs tabular-nums">
                          {point.totalAlerts}
                          {point.breachedAlerts > 0 && (
                            <span className="ml-1 text-destructive">
                              ({point.breachedAlerts})
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No alerts in this period
                </p>
              )}
            </div>
          ) : null}
          {topProblemSources.isLoading ? (
            <Skeleton className="h-48 rounded-lg" />
          ) : topProblemSources.isError ? (
            <SectionError
              message={
                topProblemSources.error instanceof Error
                  ? topProblemSources.error.message
                  : 'Something went wrong'
              }
              onRetry={() => topProblemSources.refetch()}
            />
          ) : topProblemSources.data ? (
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
              <h2 className="text-sm font-medium text-foreground">
                Top problem sources (all-time)
              </h2>
              <p className="text-xs text-muted-foreground">
                By total alert count
              </p>
              {topProblemSources.data.length > 0 ? (
                <ol className="space-y-1">
                  {topProblemSources.data.map((source, i) => (
                    <li
                      key={`${source.sourceType}-${source.sourceId}`}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="flex shrink-0 font-medium text-muted-foreground">
                        {i + 1}.
                      </span>
                      <span className="min-w-0 truncate">
                        {getSourceTypeLabel(source.sourceType)}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {source.count}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No alert sources yet
                </p>
              )}
            </div>
          ) : null}
        </div>
      )}

      {hasAlertView &&
        (prioritized.isLoading ? (
          <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-48 rounded-lg" />
          </div>
        ) : prioritized.isError ? (
          <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
            <h2 className="font-medium text-foreground">Top priorities</h2>
            <SectionError
              message={
                prioritized.error instanceof Error
                  ? prioritized.error.message
                  : 'Something went wrong'
              }
              onRetry={() => prioritized.refetch()}
            />
          </div>
        ) : prioritized.data ? (
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
        ) : null)}
    </div>
  );
}
