import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRegionalSettings, updateRegionalSettings } from './api';
import { queryKeys } from './query-keys';
import { PageHeader } from '@/shared/layout/PageHeader';
import { Breadcrumbs } from '@/shared/layout/Breadcrumbs';
import { RegionalSettingsForm } from './components/RegionalSettingsForm';
import { Skeleton } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/layout/ErrorState';
import { Button } from '@/shared/ui/Button';
import { toast } from '@/shared/feedback/useToast';

export function RegionalSettingsPage() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.organizationSettings.regional,
    queryFn: getRegionalSettings,
  });

  const updateMutation = useMutation({
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

  if (isError) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'Settings', href: '/settings' }, { label: 'Regional' }]} />
        <PageHeader title="Regional settings" />
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
        <Breadcrumbs items={[{ label: 'Settings', href: '/settings' }, { label: 'Regional' }]} />
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
          { label: 'Regional' },
        ]}
      />
      <PageHeader
        title="Regional settings"
        description="Configure organization-wide default timezone and temperature unit."
      />
      <RegionalSettingsForm
        settings={settings}
        onSubmit={(dto) => updateMutation.mutate(dto)}
        isSubmitting={updateMutation.isPending}
      />
    </div>
  );
}
