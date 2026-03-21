import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getAlert, listActivities, listComments } from './api';
import { queryKeys } from './query-keys';
import { AlertHeader } from './components/AlertHeader';
import { StatusBadge } from './components/StatusBadge';
import { SeverityBadge } from './components/SeverityBadge';
import { AssigneeBadge } from './components/AssigneeBadge';
import { RailCard } from '@/shared/ui/Card';
import { formatDateTime, deriveSlaBreach } from '@/lib/date';
import { AlertActionBar } from './components/AlertActionBar';
import { ActivityTimeline } from './components/ActivityTimeline';
import { CommentsSection } from './components/CommentsSection';
import { getSeverityLabel } from './components/SeverityBadge';
import { getSourceTypeLabel } from '@/lib/labels';
import { isNotFoundError } from '@/core/api/errors';
import { getRunItemById } from '@/features/checklist-runs/api';
import { PageHeader } from '@/shared/layout/PageHeader';
import { Breadcrumbs } from '@/shared/layout/Breadcrumbs';
import { Skeleton } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/layout/ErrorState';
import { Button } from '@/shared/ui/Button';
import { formatDate } from '@/lib/date';
import { toast } from '@/shared/feedback/useToast';

export function AlertDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [navigatingToItem, setNavigatingToItem] = useState(false);

  const alertQuery = useQuery({
    queryKey: queryKeys.alerts.detail(id!),
    queryFn: () => getAlert(id!),
    enabled: !!id,
  });

  const activitiesQuery = useQuery({
    queryKey: queryKeys.alerts.activities(id!),
    queryFn: () => listActivities(id!),
    enabled: !!id,
  });

  const commentsQuery = useQuery({
    queryKey: queryKeys.alerts.comments(id!),
    queryFn: () => listComments(id!),
    enabled: !!id,
  });

  if (alertQuery.isLoading || !alertQuery.data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-48" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-24 rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-20 rounded-md" />
            <Skeleton className="h-20 rounded-md" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-20 rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  if (alertQuery.isError) {
    const isNotFound = isNotFoundError(alertQuery.error);
    return (
      <div className="space-y-6">
        <PageHeader title="Alert" />
        <ErrorState
          title={isNotFound ? 'Alert not found' : 'Failed to load alert'}
          description={
            isNotFound
              ? 'The alert may have been deleted or you may not have access to it.'
              : alertQuery.error instanceof Error
                ? alertQuery.error.message
                : 'Something went wrong'
          }
          action={
            <div className="flex gap-2">
              {!isNotFound && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => alertQuery.refetch()}
                >
                  Try again
                </Button>
              )}
              <Link to="/alerts">
                <Button variant="ghost" size="sm">
                  Back to alerts
                </Button>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  const alert = alertQuery.data;
  const severityLabel = getSeverityLabel(alert.severity);
  const sourceLabel = getSourceTypeLabel(alert.sourceType);
  const pageTitle = `${severityLabel !== '—' ? severityLabel : 'Alert'} • ${sourceLabel} • ${formatDate(alert.triggeredAt)}`;

  const showViewChecklistItem =
    alert.sourceType === 'CHECKLIST_RUN_ITEM' && !!alert.sourceId;

  async function handleViewChecklistItem() {
    if (!alert.sourceId) return;
    setNavigatingToItem(true);
    try {
      const item = await getRunItemById(alert.sourceId);
      navigate(`/checklist-runs/${item.checklistRunId}?itemId=${alert.sourceId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not open checklist item';
      toast.error(message);
    } finally {
      setNavigatingToItem(false);
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Alerts', href: '/alerts' },
          { label: pageTitle },
        ]}
      />
      <PageHeader
        title={pageTitle}
        description={`${sourceLabel} • ${getSeverityLabel(alert.severity)}`}
        actions={
          <div className="flex items-center gap-2">
            {showViewChecklistItem && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleViewChecklistItem}
                disabled={navigatingToItem}
              >
                {navigatingToItem ? 'Opening…' : 'View checklist item'}
              </Button>
            )}
            <Link
              to="/alerts"
              className="text-sm font-medium text-primary hover:underline"
            >
              ← Back to list
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        {/* Main: Summary + Activity + Comments */}
        <div className="min-w-0 space-y-6">
          <AlertHeader alert={alert} />
          <ActivityTimeline activities={activitiesQuery.data ?? []} />
          <CommentsSection
            alertId={alert.id}
            comments={commentsQuery.data ?? []}
          />
        </div>

        {/* Right rail: Context + Actions */}
        <aside className="space-y-4">
          <RailCard title="Case summary" className="border-slate-200">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-slate-500">Status</dt>
                <dd className="mt-1">
                  <StatusBadge status={alert.status} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Severity</dt>
                <dd className="mt-1">
                  <SeverityBadge severity={alert.severity} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Assigned to</dt>
                <dd className="mt-1">
                  <AssigneeBadge
                    assignedToUserId={alert.assignedToUserId}
                    assignedToUser={alert.assignedToUser}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Source</dt>
                <dd className="mt-1 font-medium text-slate-900">{sourceLabel}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Triggered</dt>
                <dd className="mt-1 font-medium text-slate-900">{formatDateTime(alert.triggeredAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">SLA</dt>
                <dd className="mt-1 text-slate-700">
                  Ack {alert.acknowledgeWithinMinutes}m · Resolve {alert.resolveWithinMinutes}m
                  {(() => {
                    const { ackBreached, resolveBreached } = deriveSlaBreach(alert);
                    if (ackBreached || resolveBreached) {
                      return (
                        <span className="mt-1 block text-xs font-medium text-destructive">
                          {ackBreached && 'Ack breached'}
                          {ackBreached && resolveBreached && ' · '}
                          {resolveBreached && 'Resolve breached'}
                        </span>
                      );
                    }
                    return null;
                  })()}
                </dd>
              </div>
            </dl>
          </RailCard>
          <RailCard title="Actions" className="border-slate-200">
            <AlertActionBar alert={alert} />
          </RailCard>
        </aside>
      </div>
    </div>
  );
}
