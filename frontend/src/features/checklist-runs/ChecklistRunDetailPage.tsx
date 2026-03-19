import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { getRunById, updateRunItem, submitRun } from './api';
import { queryKeys } from './query-keys';
import { RunItemRow } from './components/RunItemRow';
import { RunStatusBadge } from './components/RunStatusBadge';
import { PageHeader } from '@/shared/layout/PageHeader';
import { Breadcrumbs } from '@/shared/layout/Breadcrumbs';
import { ErrorState } from '@/shared/layout/ErrorState';
import { Button } from '@/shared/ui/Button';
import { Skeleton } from '@/shared/ui/Skeleton';
import { formatDateTime } from '@/lib/date';
import { toast } from '@/shared/feedback/useToast';
import { ApiError } from '@/core/api/errors';
import { useState } from 'react';
import { usePermission } from '@/core/permissions/use-permission';

type UpdateItemVariables = {
  itemId: string;
  data: { result?: string; valueJson?: Record<string, unknown>; comment?: string };
  mutationId: number;
};

let mutationIdCounter = 0;

export function ChecklistRunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const latestMutationIdByItem = useRef<Map<string, number>>(new Map());
  const canSubmit = usePermission('checklist.run.submit');
  const canViewEvidence = usePermission('attachment.view');
  const canDeleteEvidence = usePermission('attachment.delete');

  const runQuery = useQuery({
    queryKey: queryKeys.detail(id!),
    queryFn: () => getRunById(id!),
    enabled: !!id,
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, data }: UpdateItemVariables) =>
      updateRunItem(itemId, data),
    onMutate: (variables: UpdateItemVariables) => {
      const { itemId, mutationId } = variables;
      latestMutationIdByItem.current.set(itemId, mutationId);
      setUpdatingItemId(itemId);
    },
    onSettled: (_data, _error, variables: UpdateItemVariables) => {
      setUpdatingItemId((prev) =>
        prev === variables.itemId ? null : prev
      );
    },
    onSuccess: (_data, variables: UpdateItemVariables) => {
      const { itemId, mutationId } = variables;
      const latest = latestMutationIdByItem.current.get(itemId);
      if (latest === mutationId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.detail(id!) });
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update item');
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(id!) });
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => submitRun(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.all });
      toast.success('Checklist run submitted successfully');
      navigate('/checklist-runs');
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : 'Failed to submit run';
      toast.error(message);
    },
  });

  function handleUpdateItem(
    itemId: string,
    data: { result?: string; valueJson?: Record<string, unknown>; comment?: string }
  ) {
    updateItemMutation.mutate({
      itemId,
      data,
      mutationId: ++mutationIdCounter,
    });
  }

  if (runQuery.isLoading || !runQuery.data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-48" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-24 rounded-lg" />
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </div>
    );
  }

  if (runQuery.isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Checklist Run" />
        <ErrorState
          title="Failed to load run"
          description={
            runQuery.error instanceof Error
              ? runQuery.error.message
              : 'Something went wrong'
          }
          action={
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => runQuery.refetch()}>
                Try again
              </Button>
              <Link to="/checklist-runs">
                <Button variant="ghost" size="sm">
                  Back to runs
                </Button>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  const run = runQuery.data;
  const isCompleted = run.status === 'COMPLETED';

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Checklist Runs', href: '/checklist-runs' },
          {
            label: `${run.templateNameSnapshot} #${run.runNumber}`,
          },
        ]}
      />
      <PageHeader
        title={`${run.templateNameSnapshot} #${run.runNumber}`}
        description={
          <>
            <RunStatusBadge status={run.status} />
            {run.dueAt && (
              <span className="ml-2 text-muted-foreground">
                Due {formatDateTime(run.dueAt)}
              </span>
            )}
          </>
        }
        actions={
          <Link
            to="/checklist-runs"
            className="text-sm text-primary hover:underline"
          >
            ← Back to list
          </Link>
        }
      />
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Template</dt>
            <dd className="font-medium">{run.templateNameSnapshot}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Run number</dt>
            <dd className="font-medium">{run.runNumber}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <RunStatusBadge status={run.status} />
            </dd>
          </div>
          {run.dueAt && (
            <div>
              <dt className="text-muted-foreground">Due</dt>
              <dd className="font-medium">{formatDateTime(run.dueAt)}</dd>
            </div>
          )}
        </dl>
      </div>
      <div className="space-y-6">
        {run.sectionSnapshots?.map((section) => (
          <section key={section.id}>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              {section.titleSnapshot}
            </h2>
            {section.descriptionSnapshot && (
              <p className="mb-3 text-sm text-muted-foreground">
                {section.descriptionSnapshot}
              </p>
            )}
            <div className="space-y-3">
              {section.itemSnapshots?.map((item) => (
                <RunItemRow
                  key={item.id}
                  item={item}
                  runId={run.id}
                  runStatus={run.status}
                  disabled={isCompleted}
                  isUpdating={updatingItemId === item.id}
                  canViewEvidence={canViewEvidence}
                  canDeleteEvidence={canDeleteEvidence}
                  onUpdate={handleUpdateItem}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
      {!isCompleted && canSubmit && (
        <div className="flex flex-col items-end gap-2 border-t border-border pt-4">
          {(updateItemMutation.isPending || submitMutation.isPending) && (
            <span className="text-sm text-muted-foreground">
              {updateItemMutation.isPending
                ? 'Saving changes...'
                : 'Submitting...'}
            </span>
          )}
          <Button
            onClick={() => submitMutation.mutate()}
            disabled={
              submitMutation.isPending || updateItemMutation.isPending
            }
          >
            {submitMutation.isPending ? 'Submitting...' : 'Submit run'}
          </Button>
        </div>
      )}
    </div>
  );
}
