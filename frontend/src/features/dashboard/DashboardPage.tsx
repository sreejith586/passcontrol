import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import {
  getChecklistMetrics,
  getEscalationSummary,
  getPrioritizedEscalations,
  getSlaCompliance,
  getEscalationTrend,
  getTopProblemSources,
} from './api';
import {
  getFirstRunStatus,
  quickSetup,
  demoWorkspaceSetup,
} from '@/features/onboarding/api';
import { DemoWorkspaceCta } from '@/features/onboarding/components/DemoWorkspaceCta';
import {
  OnboardingChecklistCard,
  isFirstRunFullyComplete,
} from '@/features/onboarding/components/OnboardingChecklistCard';
import { onboardingQueryKeys } from '@/features/onboarding/query-keys';
import { queryKeys } from './query-keys';
import {
  usePermission,
  usePermissions,
} from '@/core/permissions/use-permission';
import { PageHeader } from '@/shared/layout/PageHeader';
import { PermissionGate } from '@/core/permissions/PermissionGate';
import { toast } from '@/shared/feedback/useToast';
import { Skeleton } from '@/shared/ui/Skeleton';
import { EmptyState } from '@/shared/layout/EmptyState';
import { cn } from '@/lib/cn';
import { SeverityBadge } from '@/features/alerts/components/SeverityBadge';
import { StatusBadge } from '@/features/alerts/components/StatusBadge';
import { getSourceTypeLabel, formatAlertSourceDisplay } from '@/lib/labels';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';

const SLA_DAYS = 30;

function MetricCard({
  label,
  value,
  variant = 'default',
  secondary,
}: {
  label: string;
  value: number;
  variant?: 'default' | 'warning' | 'destructive';
  secondary?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-4 shadow-sm',
        variant === 'destructive' && 'border-destructive/30 bg-white',
        variant === 'warning' && 'border-amber-500/30 bg-white',
        variant === 'default' && 'border-slate-200 bg-white'
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p
        className={cn(
          'mt-2 text-3xl font-bold tabular-nums leading-tight',
          variant === 'destructive' && 'text-destructive',
          variant === 'warning' && 'text-amber-600',
          variant === 'default' && 'text-slate-900'
        )}
      >
        {value}
      </p>
      {secondary && (
        <p className="mt-0.5 text-xs text-slate-400">{secondary}</p>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
      {children}
    </h2>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasChecklistView = usePermission('checklist.run.view');
  const hasAlertView = usePermission('alert.view');
  const canCreateTemplate = usePermission('checklist.template.create');
  const canLoadFirstRunStatus = usePermissions([
    'checklist.run.view',
    'checklist.template.view',
    'user.view',
  ]);

  const firstRunStatus = useQuery({
    queryKey: onboardingQueryKeys.firstRunStatus,
    queryFn: getFirstRunStatus,
    enabled: canLoadFirstRunStatus,
  });

  const showSelfServeOnboarding =
    firstRunStatus.isSuccess &&
    firstRunStatus.data.isSelfOnboarded &&
    !isFirstRunFullyComplete(firstRunStatus.data);

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

  const quickSetupMutation = useMutation({
    mutationFn: quickSetup,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-runs'] });
      queryClient.invalidateQueries({ queryKey: onboardingQueryKeys.firstRunStatus });
      navigate(`/checklist-runs/${data.runId}`);
      toast.success('Your first checklist run is ready');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Setup failed');
    },
  });

  const demoWorkspaceMutation = useMutation({
    mutationFn: demoWorkspaceSetup,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: onboardingQueryKeys.firstRunStatus });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.checklistMetrics() });
      queryClient.invalidateQueries({ queryKey: ['checklist-runs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (data.alreadyInitialized) {
        toast.info(data.message);
      } else {
        toast.success(data.message);
      }
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Could not load demo workspace',
      );
    },
  });

  const showLegacyQuickSetup =
    hasChecklistView &&
    checklistMetrics.data &&
    checklistMetrics.data.totalRuns === 0 &&
    !showSelfServeOnboarding;

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

  const needsAttention =
    hasChecklistView &&
    checklistMetrics.data &&
    (checklistMetrics.data.openAlerts > 0 ||
      checklistMetrics.data.overdueRuns > 0 ||
      checklistMetrics.data.failedRuns > 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Operational overview"
      />

      {/* Self-onboarded tenants: optional demo load + guided checklist until all steps done */}
      {showSelfServeOnboarding && firstRunStatus.data && (
        <div className="space-y-4">
          {firstRunStatus.data.demoWorkspaceAvailable && canCreateTemplate && (
            <DemoWorkspaceCta
              loading={demoWorkspaceMutation.isPending}
              onLoadDemo={() => demoWorkspaceMutation.mutate()}
            />
          )}
          <OnboardingChecklistCard status={firstRunStatus.data} />
        </div>
      )}

      {/* Get Started – quick setup when no runs (non–self-serve path or legacy) */}
      {showLegacyQuickSetup && (
        <Card variant="soft" className="border-2 border-sky-200 bg-sky-50/50 p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Get started with PassControl
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            How PassControl works: <strong>Templates → Runs → Alerts</strong>
          </p>
          <ol className="mt-4 list-decimal list-inside space-y-1.5 text-sm text-slate-700">
            <li>Create your first checklist</li>
            <li>Generate a run</li>
            <li>Complete your first inspection</li>
          </ol>
          <PermissionGate permission="checklist.template.create">
            <Button
              variant="primary"
              size="sm"
              className="mt-4"
              onClick={() => quickSetupMutation.mutate()}
              disabled={quickSetupMutation.isPending}
            >
              {quickSetupMutation.isPending ? 'Setting up...' : 'Start setup'}
            </Button>
          </PermissionGate>
        </Card>
      )}

      {/* Needs Attention – high-priority summary */}
      {needsAttention && (
        <section className="space-y-3">
          <SectionTitle>Needs attention</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-3">
            {checklistMetrics.data!.openAlerts > 0 && (
              <Link
                to="/alerts?status=OPEN"
                className={cn(
                  'rounded-xl border-2 px-5 py-4 shadow-md transition-shadow hover:shadow-lg',
                  'border-destructive/50 bg-destructive/5'
                )}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-destructive">
                  Open alerts
                </p>
                <p className="mt-2 text-4xl font-bold tabular-nums text-destructive">
                  {checklistMetrics.data!.openAlerts}
                </p>
                <p className="mt-1 text-xs font-medium text-destructive/80">
                  Requires triage
                </p>
              </Link>
            )}
            {checklistMetrics.data!.overdueRuns > 0 && (
              <Link
                to="/checklist-runs?tab=overdue"
                className={cn(
                  'rounded-xl border-2 px-5 py-4 shadow-md transition-shadow hover:shadow-lg',
                  'border-amber-500/50 bg-amber-500/10'
                )}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
                  Overdue runs
                </p>
                <p className="mt-2 text-4xl font-bold tabular-nums text-amber-700">
                  {checklistMetrics.data!.overdueRuns}
                </p>
                <p className="mt-1 text-xs font-medium text-amber-600">
                  Past due
                </p>
              </Link>
            )}
            {checklistMetrics.data!.failedRuns > 0 && (
              <Link
                to="/checklist-runs?tab=failed"
                className={cn(
                  'rounded-xl border-2 px-5 py-4 shadow-md transition-shadow hover:shadow-lg',
                  'border-destructive/50 bg-destructive/5'
                )}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-destructive">
                  Failed runs
                </p>
                <p className="mt-2 text-4xl font-bold tabular-nums text-destructive">
                  {checklistMetrics.data!.failedRuns}
                </p>
                <p className="mt-1 text-xs font-medium text-destructive/80">
                  Items failed
                </p>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Key metrics – primary KPI row */}
      <section className="space-y-3">
        <SectionTitle>Key metrics</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
      </section>

      {/* Operational overview – SLA, trend, priorities, sources */}
      {hasAlertView && (
        <section className="space-y-6">
          <SectionTitle>Operational overview</SectionTitle>
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            {/* Left: SLA compliance + Escalation trend */}
            <div className="space-y-6">
              {slaCompliance.isLoading ? (
                <Skeleton className="h-52 rounded-xl" />
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
                <Card variant="soft" className="space-y-4 p-5">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      SLA compliance (last 30 days)
                    </h3>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Alerts triggered in this period
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
                      <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-3 text-xs text-slate-500">
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
                </Card>
              ) : null}

              {escalationTrend.isLoading ? (
                <Skeleton className="h-48 rounded-xl" />
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
                <Card variant="soft" className="space-y-4 p-5">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Alerts triggered (last 7 days)
                    </h3>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Breached = currently past deadline
                    </p>
                  </div>
                  {escalationTrend.data.length > 0 ? (
                    <div className="space-y-2.5">
                      {escalationTrend.data.map((point) => {
                        const maxTotal = Math.max(
                          ...escalationTrend.data!.map((p) => p.totalAlerts),
                          1
                        );
                        const widthPct = (point.totalAlerts / maxTotal) * 100;
                        return (
                          <div key={point.date} className="flex items-center gap-3">
                            <span className="w-20 shrink-0 text-xs text-slate-500">
                              {format(new Date(point.date), 'MMM d')}
                            </span>
                            <div className="flex flex-1 items-center h-6 rounded bg-slate-100 overflow-hidden">
                              <div
                                className="flex h-full min-w-[2px] overflow-hidden"
                                style={{ width: `${Math.max(widthPct, 2)}%` }}
                              >
                                <div
                                  className="h-full bg-slate-300"
                                  style={{
                                    width: `${100 - (point.totalAlerts > 0 ? (point.breachedAlerts / point.totalAlerts) * 100 : 0)}%`,
                                  }}
                                />
                                {point.breachedAlerts > 0 && (
                                  <div
                                    className="h-full flex-1 bg-destructive/70"
                                    style={{
                                      width: `${point.totalAlerts > 0 ? (point.breachedAlerts / point.totalAlerts) * 100 : 0}%`,
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                            <div className="w-28 shrink-0 text-right text-xs tabular-nums">
                              <span className="font-medium text-slate-700">
                                {point.totalAlerts} alert{point.totalAlerts !== 1 ? 's' : ''}
                              </span>
                              {point.breachedAlerts > 0 && (
                                <span className="ml-1 text-destructive font-medium">
                                  · {point.breachedAlerts} breached
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      No alerts in this period
                    </p>
                  )}
                </Card>
              ) : null}
            </div>

            {/* Right: Top priorities + Top problem sources */}
            <div className="space-y-6">
              {prioritized.isLoading ? (
                <Card variant="soft" className="p-5">
                  <Skeleton className="h-5 w-32 mb-4" />
                  <Skeleton className="h-48 rounded-lg" />
                </Card>
              ) : prioritized.isError ? (
                <Card variant="soft" className="p-5">
                  <h3 className="text-base font-semibold text-slate-900 mb-3">Top priorities</h3>
                  <SectionError
                    message={
                      prioritized.error instanceof Error
                        ? prioritized.error.message
                        : 'Something went wrong'
                    }
                    onRetry={() => prioritized.refetch()}
                  />
                </Card>
              ) : prioritized.data ? (
                <Card variant="soft" className="space-y-4 p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-900">
                      Top priorities
                    </h3>
                    <Link
                      to="/escalations"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      View all →
                    </Link>
                  </div>
                  {prioritized.data.items.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <ul className="divide-y divide-slate-100">
                        {prioritized.data.items.slice(0, 10).map((item) => (
                          <li key={item.alertEventId}>
                            <Link
                              to={`/alerts/${item.alertEventId}`}
                              className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50 transition-colors"
                            >
                              <span className="flex shrink-0 items-center gap-2 truncate text-sm">
                                <SeverityBadge severity={item.severity} />
                                <StatusBadge
                                  status={item.status as 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'}
                                />
                                <span className="truncate text-slate-700">{getSourceTypeLabel(item.sourceType)}</span>
                              </span>
                              <span className="flex shrink-0 gap-1 text-xs">
                                {item.sla.acknowledgeBreached && (
                                  <span className="text-destructive font-medium">Ack</span>
                                )}
                                {item.sla.resolveBreached && (
                                  <span className="text-destructive font-medium">Res</span>
                                )}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
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
                </Card>
              ) : null}

              {topProblemSources.isLoading ? (
                <Skeleton className="h-48 rounded-xl" />
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
                <Card variant="soft" className="space-y-4 p-5">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Top problem sources
                    </h3>
                    <p className="mt-0.5 text-sm text-slate-500">
                      By total alert count (all-time)
                    </p>
                  </div>
                  {topProblemSources.data.length > 0 ? (
                    <ol className="space-y-2">
                      {topProblemSources.data.map((source, i) => (
                        <li
                          key={`${source.sourceType}-${source.sourceId}`}
                          className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5 text-sm"
                        >
                          <span className="flex shrink-0 w-5 text-center font-bold text-slate-400">
                            {i + 1}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-medium text-slate-700">
                            {formatAlertSourceDisplay(source).primary}
                          </span>
                          <span className="shrink-0 rounded bg-slate-200 px-2 py-0.5 tabular-nums font-semibold text-slate-700">
                            {source.count}
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-slate-500">
                      No alert sources yet
                    </p>
                  )}
                </Card>
              ) : null}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
