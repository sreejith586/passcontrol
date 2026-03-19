import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAlert, listActivities, listComments } from './api';
import { queryKeys } from './query-keys';
import { AlertHeader } from './components/AlertHeader';
import { AlertActionBar } from './components/AlertActionBar';
import { ActivityTimeline } from './components/ActivityTimeline';
import { CommentsSection } from './components/CommentsSection';
import { getSeverityLabel } from './components/SeverityBadge';
import { getSourceTypeLabel } from '@/lib/labels';
import { PageHeader } from '@/shared/layout/PageHeader';
import { Breadcrumbs } from '@/shared/layout/Breadcrumbs';
import { Skeleton } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/layout/ErrorState';
import { Button } from '@/shared/ui/Button';
import { formatDate } from '@/lib/date';

export function AlertDetailPage() {
  const { id } = useParams<{ id: string }>();

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
    return (
      <div className="space-y-6">
        <PageHeader title="Alert" />
        <ErrorState
          title="Failed to load alert"
          description={
            alertQuery.error instanceof Error
              ? alertQuery.error.message
              : 'Something went wrong'
          }
          action={
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => alertQuery.refetch()}
              >
                Try again
              </Button>
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
          <Link
            to="/alerts"
            className="text-sm text-primary hover:underline"
          >
            ← Back to list
          </Link>
        }
      />
      <div className="space-y-4">
        <AlertHeader alert={alert} />
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <AlertActionBar alert={alert} />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ActivityTimeline activities={activitiesQuery.data ?? []} />
        <CommentsSection
          alertId={alert.id}
          comments={commentsQuery.data ?? []}
        />
      </div>
    </div>
  );
}
