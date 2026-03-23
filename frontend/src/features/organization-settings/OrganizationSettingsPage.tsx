import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRegionalSettings,
  updateRegionalSettings,
  getAlertWorkflow,
  updateAlertWorkflow,
  getEmailSettings,
  updateEmailSettings,
} from './api';
import { queryKeys } from './query-keys';
import { PageHeader } from '@/shared/layout/PageHeader';
import { Breadcrumbs } from '@/shared/layout/Breadcrumbs';
import { RegionalSettingsForm } from './components/RegionalSettingsForm';
import { WorkflowPolicyForm } from './components/WorkflowPolicyForm';
import { EmailSettingsForm } from './components/EmailSettingsForm';
import { Card } from '@/shared/ui/Card';
import { Skeleton } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/layout/ErrorState';
import { Button } from '@/shared/ui/Button';
import { toast } from '@/shared/feedback/useToast';
import { cn } from '@/lib/cn';

type Section = 'regional' | 'alert-workflow' | 'email';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'regional', label: 'Regional' },
  { id: 'alert-workflow', label: 'Alert Workflow' },
  { id: 'email', label: 'Email Settings' },
];

export function OrganizationSettingsPage() {
  const [activeSection, setActiveSection] = useState<Section>('regional');
  const queryClient = useQueryClient();

  const regionalQuery = useQuery({
    queryKey: queryKeys.organizationSettings.regional,
    queryFn: getRegionalSettings,
  });

  const alertWorkflowQuery = useQuery({
    queryKey: queryKeys.organizationSettings.alertWorkflow,
    queryFn: getAlertWorkflow,
  });

  const emailQuery = useQuery({
    queryKey: queryKeys.organizationSettings.email,
    queryFn: getEmailSettings,
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

  const emailMutation = useMutation({
    mutationFn: updateEmailSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizationSettings.email,
      });
      toast.success('Email settings updated');
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
                emailQuery.refetch();
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

      <div
        role="tablist"
        aria-label="Settings sections"
        className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5"
      >
        {SECTIONS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeSection === id}
            aria-controls={`panel-${id}`}
            id={`tab-${id}`}
            onClick={() => setActiveSection(id)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              activeSection === id
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {activeSection === 'regional' && (
        <Card id="panel-regional" role="tabpanel" aria-labelledby="tab-regional" className="space-y-6 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Regional
          </h3>
          <RegionalSettingsForm
            settings={regionalQuery.data}
            onSubmit={(dto) => regionalMutation.mutate(dto)}
            isSubmitting={regionalMutation.isPending}
          />
        </Card>
      )}

      {activeSection === 'alert-workflow' && (
        <Card id="panel-alert-workflow" role="tabpanel" aria-labelledby="tab-alert-workflow" className="space-y-6 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Alert Workflow
          </h3>
          <WorkflowPolicyForm
            settings={alertWorkflowQuery.data}
            onSubmit={(dto) => alertWorkflowMutation.mutate(dto)}
            isSubmitting={alertWorkflowMutation.isPending}
          />
        </Card>
      )}

      {activeSection === 'email' && (
        <Card id="panel-email" role="tabpanel" aria-labelledby="tab-email" className="space-y-6 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Email Settings
          </h3>
          {emailQuery.isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <EmailSettingsForm
              settings={emailQuery.data ?? null}
              onSubmit={(dto) => emailMutation.mutate(dto)}
              isSubmitting={emailMutation.isPending}
            />
          )}
        </Card>
      )}
    </div>
  );
}
