import type { ChecklistRun, ChecklistRunItemSnapshot } from './types';

/** Blocker type for submission readiness (priority order: 1, 2, 3) */
export type BlockerType =
  | 'required_missing'
  | 'missing_evidence'
  | 'missing_comment';

/** A single blocking item with section context */
export interface BlockingItem {
  itemId: string;
  label: string;
  sectionId: string;
  sectionTitle: string;
  blockerType: BlockerType;
}

/** Section-level health for jump navigation */
export interface SectionHealth {
  sectionId: string;
  sectionTitle: string;
  completed: number;
  total: number;
  blockers: number;
  failed: number;
}

/** Aggregated execution metrics derived from run's item snapshots */
export interface RunExecutionMetrics {
  answered: number;
  total: number;
  requiredCount: number;
  optionalCount: number;
  failedCount: number;
  incompleteRequiredCount: number;
  missingEvidenceCount: number;
  missingCommentCount: number;
  attachmentCount: number;
}

/**
 * Compute all run execution metrics in a single pass over item snapshots.
 * Use this to avoid duplicating iteration logic.
 */
export function computeRunMetrics(run: ChecklistRun): RunExecutionMetrics {
  const result: RunExecutionMetrics = {
    answered: 0,
    total: 0,
    requiredCount: 0,
    optionalCount: 0,
    failedCount: 0,
    incompleteRequiredCount: 0,
    missingEvidenceCount: 0,
    missingCommentCount: 0,
    attachmentCount: 0,
  };

  if (!run.sectionSnapshots?.length) return result;

  for (const section of run.sectionSnapshots) {
    for (const item of section.itemSnapshots) {
      result.total++;
      if (item.respondedAt) result.answered++;

      if (item.isRequiredSnapshot) {
        result.requiredCount++;
        if (!item.respondedAt) result.incompleteRequiredCount++;
      } else {
        result.optionalCount++;
      }

      if (item.result === 'FAIL') {
        result.failedCount++;
        const attachmentCount = item._count?.attachments ?? 0;
        const hasComment = !!item.comment?.trim();

        if (item.requiresEvidenceOnFailSnapshot && attachmentCount === 0) {
          result.missingEvidenceCount++;
        }
        if (item.requiresCommentOnFailSnapshot && !hasComment) {
          result.missingCommentCount++;
        }
      }

      result.attachmentCount += item._count?.attachments ?? 0;
    }
  }

  return result;
}

/** Progress string for display: "answered / total" */
export function formatProgress(metrics: RunExecutionMetrics): string | null {
  if (metrics.total === 0) return null;
  return `${metrics.answered}/${metrics.total}`;
}

/** Required scope string for display: "X required · Y optional" */
export function formatRequiredScope(metrics: RunExecutionMetrics): string {
  const parts: string[] = [];
  if (metrics.requiredCount > 0) parts.push(`${metrics.requiredCount} required`);
  if (metrics.optionalCount > 0) parts.push(`${metrics.optionalCount} optional`);
  return parts.join(' · ') || '—';
}

function getItemBlockerType(
  item: ChecklistRunItemSnapshot
): BlockerType | null {
  if (item.isRequiredSnapshot && !item.respondedAt) {
    return 'required_missing';
  }
  if (item.result !== 'FAIL') return null;
  const attachmentCount = item._count?.attachments ?? 0;
  const hasComment = !!item.comment?.trim();
  if (
    item.requiresEvidenceOnFailSnapshot &&
    attachmentCount === 0
  ) {
    return 'missing_evidence';
  }
  if (item.requiresCommentOnFailSnapshot && !hasComment) {
    return 'missing_comment';
  }
  return null;
}

/**
 * List blocking items in document order with highest-priority blocker type per item.
 * Priority: 1) required_missing, 2) missing_evidence, 3) missing_comment.
 */
export function getBlockingItems(run: ChecklistRun): BlockingItem[] {
  const result: BlockingItem[] = [];
  if (!run.sectionSnapshots?.length) return result;

  for (const section of run.sectionSnapshots) {
    for (const item of section.itemSnapshots ?? []) {
      const blockerType = getItemBlockerType(item);
      if (blockerType) {
        result.push({
          itemId: item.id,
          label: item.labelSnapshot,
          sectionId: section.id,
          sectionTitle: section.titleSnapshot,
          blockerType,
        });
      }
    }
  }
  return result;
}

/**
 * Item ID of the first blocking item in operational priority order.
 * Safe to call when no blockers exist (returns null).
 */
export function getFirstBlockerItemId(run: ChecklistRun): string | null {
  const items = getBlockingItems(run);
  return items.length > 0 ? items[0].itemId : null;
}

/**
 * Per-section health for jump navigation and emphasis.
 */
export function getSectionHealth(run: ChecklistRun): SectionHealth[] {
  const result: SectionHealth[] = [];
  if (!run.sectionSnapshots?.length) return result;

  const blockingItemIds = new Set(
    getBlockingItems(run).map((b) => b.itemId)
  );

  for (const section of run.sectionSnapshots) {
    const items = section.itemSnapshots ?? [];
    let completed = 0;
    let blockers = 0;
    let failed = 0;
    for (const item of items) {
      if (item.respondedAt) completed++;
      if (item.result === 'FAIL') failed++;
      if (blockingItemIds.has(item.id)) blockers++;
    }
    result.push({
      sectionId: section.id,
      sectionTitle: section.titleSnapshot,
      completed,
      total: items.length,
      blockers,
      failed,
    });
  }
  return result;
}
