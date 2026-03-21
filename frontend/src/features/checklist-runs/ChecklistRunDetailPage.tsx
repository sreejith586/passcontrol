import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { KeyboardEvent } from 'react';
import { useRef, useEffect, useState } from 'react';
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
import { usePermission } from '@/core/permissions/use-permission';
import { cn } from '@/lib/cn';

type UpdateItemVariables = {
  itemId: string;
  data: { result?: string; valueJson?: Record<string, unknown>; comment?: string };
  mutationId: number;
};

let mutationIdCounter = 0;

const HIGHLIGHT_DURATION_MS = 2500;

export function ChecklistRunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const latestMutationIdByItem = useRef<Map<string, number>>(new Map());
  const itemIdFromUrl = searchParams.get('itemId');
  const canSubmit = usePermission('checklist.run.submit');
  const canViewEvidence = usePermission('attachment.view');
  const canDeleteEvidence = usePermission('attachment.delete');
  const canUploadEvidence = usePermission('checklist.run.update');

  const runQuery = useQuery({
    queryKey: queryKeys.detail(id!),
    queryFn: () => getRunById(id!),
    enabled: !!id,
  });

  const flatItemIdsRef = useRef<string[]>([]);

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
        const ids = flatItemIdsRef.current;
        const idx = ids.indexOf(itemId);
        if (idx >= 0 && idx < ids.length - 1) {
          const nextEl = document.getElementById(`run-item-${ids[idx + 1]}`);
          (nextEl as HTMLElement)?.focus();
        }
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

  // Deep link: scroll to and briefly highlight item when itemId query param is present.
  // Must be declared unconditionally (before any early returns) to satisfy Rules of Hooks.
  useEffect(() => {
    const run = runQuery.data;
    if (!itemIdFromUrl || !run?.sectionSnapshots) return;
    const itemExists = run.sectionSnapshots.some((s) =>
      s.itemSnapshots?.some((i) => i.id === itemIdFromUrl)
    );
    if (!itemExists) return;

    const el = document.getElementById(`run-item-${itemIdFromUrl}`);
    if (!el) return;

    let rafId: number;
    let timeoutId: ReturnType<typeof setTimeout>;

    rafId = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedItemId(itemIdFromUrl);
      timeoutId = setTimeout(() => setHighlightedItemId(null), HIGHLIGHT_DURATION_MS);
    });

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, [itemIdFromUrl, runQuery.data?.sectionSnapshots]);

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

  // Progress counts and flat item list derived from itemSnapshots
  const allItems = run.sectionSnapshots?.flatMap((s) => s.itemSnapshots ?? []) ?? [];
  flatItemIdsRef.current = allItems.map((i) => i.id);

  function focusNextItem(itemId: string) {
    const ids = flatItemIdsRef.current;
    const idx = ids.indexOf(itemId);
    if (idx >= 0 && idx < ids.length - 1) {
      const el = document.getElementById(`run-item-${ids[idx + 1]}`);
      (el as HTMLElement)?.focus();
    }
  }

  function focusPrevItem(itemId: string) {
    const ids = flatItemIdsRef.current;
    const idx = ids.indexOf(itemId);
    if (idx > 0) {
      const el = document.getElementById(`run-item-${ids[idx - 1]}`);
      (el as HTMLElement)?.focus();
    }
  }

  function handleItemKeyDown(
    item: (typeof allItems)[0],
    e: KeyboardEvent<HTMLDivElement>
  ) {
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select')) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusNextItem(item.id);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusPrevItem(item.id);
      return;
    }
    if (['BOOLEAN', 'CHECKBOX'].includes(item.itemTypeSnapshot)) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleUpdateItem(item.id, { result: 'PASS' });
        return;
      }
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        handleUpdateItem(item.id, { result: 'FAIL' });
        return;
      }
    }
  }

  const totalItems = allItems.length;
  const completedItems = allItems.filter((i) => i.respondedAt != null).length;
  const failedItems = allItems.filter((i) => i.result === 'FAIL').length;
  const incompleteRequired = allItems.filter(
    (i) => i.isRequiredSnapshot && i.respondedAt == null
  ).length;
  const failedMissingEvidence = allItems.filter(
    (i) =>
      i.result === 'FAIL' &&
      i.requiresEvidenceOnFailSnapshot &&
      (i._count?.attachments ?? 0) === 0
  ).length;
  const failedMissingComment = allItems.filter(
    (i) =>
      i.result === 'FAIL' &&
      i.requiresCommentOnFailSnapshot &&
      !(i.comment?.trim())
  ).length;

  const blockers: string[] = [];
  if (incompleteRequired > 0) blockers.push(`${incompleteRequired} required item${incompleteRequired !== 1 ? 's' : ''} incomplete`);
  if (failedMissingEvidence > 0) blockers.push(`${failedMissingEvidence} failed item${failedMissingEvidence !== 1 ? 's' : ''} missing evidence`);
  if (failedMissingComment > 0) blockers.push(`${failedMissingComment} failed item${failedMissingComment !== 1 ? 's' : ''} missing comment`);

  function scrollToSection(sectionId: string) {
    const el = document.getElementById(`section-${sectionId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

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
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <div className="min-w-0 space-y-6">
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
          <div className="space-y-6">
        {run.sectionSnapshots?.map((section) => (
          <section key={section.id} id={`section-${section.id}`}>
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
                <div
                  key={item.id}
                  id={`run-item-${item.id}`}
                  tabIndex={0}
                  role="group"
                  aria-label={item.labelSnapshot}
                  onKeyDown={(e) => handleItemKeyDown(item, e)}
                  className={cn(
                    'transition-[box-shadow] duration-300 outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg',
                    highlightedItemId === item.id &&
                      'ring-2 ring-primary/50 ring-offset-2 ring-offset-background'
                  )}
                >
                  <RunItemRow
                    item={item}
                    runId={run.id}
                    runStatus={run.status}
                    disabled={isCompleted}
                    isUpdating={updatingItemId === item.id}
                    canViewEvidence={canViewEvidence}
                    canDeleteEvidence={canDeleteEvidence}
                    canUploadEvidence={canUploadEvidence}
                    onUpdate={handleUpdateItem}
                  />
                </div>
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

        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Run summary
            </h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <RunStatusBadge status={run.status} />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Template</dt>
                <dd className="font-medium">{run.templateNameSnapshot}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Run #</dt>
                <dd className="font-medium">{run.runNumber}</dd>
              </div>
              {run.dueAt && (
                <div>
                  <dt className="text-muted-foreground">Due</dt>
                  <dd className="font-medium">{formatDateTime(run.dueAt)}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Progress
            </h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Completed</dt>
                <dd className="font-medium">{completedItems} / {totalItems}</dd>
              </div>
              {failedItems > 0 && (
                <div>
                  <dt className="text-muted-foreground">Failed</dt>
                  <dd className="font-medium text-destructive">{failedItems}</dd>
                </div>
              )}
              {incompleteRequired > 0 && (
                <div>
                  <dt className="text-muted-foreground">Incomplete required</dt>
                  <dd className="font-medium">{incompleteRequired}</dd>
                </div>
              )}
              {failedMissingEvidence > 0 && (
                <div>
                  <dt className="text-muted-foreground">Missing evidence</dt>
                  <dd className="font-medium text-amber-600 dark:text-amber-400">{failedMissingEvidence}</dd>
                </div>
              )}
              {failedMissingComment > 0 && (
                <div>
                  <dt className="text-muted-foreground">Missing comment</dt>
                  <dd className="font-medium text-amber-600 dark:text-amber-400">{failedMissingComment}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Jump to section
            </h3>
            <ul className="space-y-1 text-sm">
              {run.sectionSnapshots?.map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className="text-left text-primary hover:underline w-full"
                  >
                    {section.titleSnapshot}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {!isCompleted && (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Submission readiness
              </h3>
              {blockers.length === 0 ? (
                <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                  Ready to submit
                </p>
              ) : (
                <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-400">
                  {blockers.map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
