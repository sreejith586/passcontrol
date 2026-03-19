import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAlertWorkflow, updateAlertWorkflow } from './api';
import { queryKeys } from './query-keys';
import { PageHeader } from '@/shared/layout/PageHeader';
import { Breadcrumbs } from '@/shared/layout/Breadcrumbs';
import { WorkflowPolicyForm } from './components/WorkflowPolicyForm';
import { Skeleton } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/layout/ErrorState';
import { Button } from '@/shared/ui/Button';
import { toast } from '@/shared/feedback/useToast';

export function AlertWorkflowSettingsPage() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.organizationSettings.alertWorkflow,
    queryFn: getAlertWorkflow,
  });

  const updateMutation = useMutation({
    mutationFn: updateAlertWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizationSettings.alertWorkflow,
      });
      toast.success('Workflow settings updated');
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to update settings'),
  });

  if (isError) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'Settings', href: '/settings' }, { label: 'Alert workflow policy' }]} />
        <PageHeader title="Alert workflow policy" />
        <ErrorState
          title="Failed to load settings"
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

  if (isLoading || !settings) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'Settings', href: '/settings' }, { label: 'Alert workflow policy' }]} />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Settings', href: '/settings' },
          { label: 'Alert workflow policy' },
        ]}
      />
      <PageHeader
        title="Alert workflow policy"
        description="Configure organization-wide requirements for alert resolution and reopen actions."
      />
      <WorkflowPolicyForm
        settings={settings}
        onSubmit={(dto) => updateMutation.mutate(dto)}
        isSubmitting={updateMutation.isPending}
      />
    </div>
  );
}
