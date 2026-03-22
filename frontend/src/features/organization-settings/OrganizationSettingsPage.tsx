import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRegionalSettings,
  updateRegionalSettings,
  getAlertWorkflow,
  updateAlertWorkflow,
} from './api';
import { queryKeys } from './query-keys';
import { PageHeader } from '@/shared/layout/PageHeader';
import { Breadcrumbs } from '@/shared/layout/Breadcrumbs';
import { RegionalSettingsForm } from './components/RegionalSettingsForm';
import { WorkflowPolicyForm } from './components/WorkflowPolicyForm';
import { Card } from '@/shared/ui/Card';
import { Skeleton } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/layout/ErrorState';
import { Button } from '@/shared/ui/Button';
import { toast } from '@/shared/feedback/useToast';

export function OrganizationSettingsPage() {
  const queryClient = useQueryClient();

  const regionalQuery = useQuery({
    queryKey: queryKeys.organizationSettings.regional,
    queryFn: getRegionalSettings,
  });

  const alertWorkflowQuery = useQuery({
    queryKey: queryKeys.organizationSettings.alertWorkflow,
    queryFn: getAlertWorkflow,
  });

  const regionalMutation = useMutation({
    mutationFn: updateRegionalSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizationSettings.regional,
      });
      toast.success('Regional settings updated');
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Failed to update settings'),
  });

  const alertWorkflowMutation = useMutation({
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

  const isError = regionalQuery.isError || alertWorkflowQuery.isError;
  const error = regionalQuery.error ?? alertWorkflowQuery.error;
  const isLoading =
    regionalQuery.isLoading || alertWorkflowQuery.isLoading;
  const hasData =
    regionalQuery.data && alertWorkflowQuery.data;

  if (isError) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Settings', href: '/settings' },
            { label: 'Organization Settings' },
          ]}
        />
        <PageHeader title="Organization Settings" />
        <ErrorState
          title="Failed to load settings"
          description={
            error instanceof Error ? error.message : 'Something went wrong'
          }
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                regionalQuery.refetch();
                alertWorkflowQuery.refetch();
              }}
            >
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  if (isLoading || !hasData) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Settings', href: '/settings' },
            { label: 'Organization Settings' },
          ]}
        />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Settings', href: '/settings' },
          { label: 'Organization Settings' },
        ]}
      />
      <PageHeader
        title="Organization Settings"
        description="Configure organization-wide defaults and policies."
      />

      <Card className="space-y-6 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Regional
        </h3>
        <RegionalSettingsForm
          settings={regionalQuery.data}
          onSubmit={(dto) => regionalMutation.mutate(dto)}
          isSubmitting={regionalMutation.isPending}
        />
      </Card>

      <Card className="space-y-6 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Alert Workflow
        </h3>
        <WorkflowPolicyForm
          settings={alertWorkflowQuery.data}
          onSubmit={(dto) => alertWorkflowMutation.mutate(dto)}
          isSubmitting={alertWorkflowMutation.isPending}
        />
      </Card>
    </div>
  );
}
