import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAlertWorkflow, updateAlertWorkflow } from './api';
import { queryKeys } from './query-keys';
import { PageHeader } from '@/shared/layout/PageHeader';
import { Breadcrumbs } from '@/shared/layout/Breadcrumbs';
import { WorkflowPolicyForm } from './components/WorkflowPolicyForm';
import { Spinner } from '@/shared/ui/Spinner';
import { toast } from '@/shared/feedback/useToast';

export function AlertWorkflowSettingsPage() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
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

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
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
