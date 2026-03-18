import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAlert, listActivities, listComments } from './api';
import { queryKeys } from './query-keys';
import { AlertHeader } from './components/AlertHeader';
import { AlertActionBar } from './components/AlertActionBar';
import { ActivityTimeline } from './components/ActivityTimeline';
import { CommentsSection } from './components/CommentsSection';
import { PageHeader } from '@/shared/layout/PageHeader';
import { Breadcrumbs } from '@/shared/layout/Breadcrumbs';
import { Spinner } from '@/shared/ui/Spinner';

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
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (alertQuery.isError) {
    return (
      <div className="space-y-4">
        <PageHeader title="Alert" />
        <p className="text-destructive">
          {alertQuery.error instanceof Error
            ? alertQuery.error.message
            : 'Failed to load alert'}
        </p>
        <Link to="/alerts" className="text-primary hover:underline">
          Back to alerts
        </Link>
      </div>
    );
  }

  const alert = alertQuery.data;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Alerts', href: '/alerts' },
          { label: `Alert ${alert.id.slice(0, 8)}…` },
        ]}
      />
      <PageHeader
        title={`Alert ${alert.id.slice(0, 8)}…`}
        description={`${alert.sourceType} • ${alert.severity ?? '—'}`}
        actions={
          <Link
            to="/alerts"
            className="text-sm text-primary hover:underline"
          >
            ← Back to list
          </Link>
        }
      />
      <AlertHeader alert={alert} />
      <AlertActionBar alert={alert} />
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
