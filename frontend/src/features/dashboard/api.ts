import { get } from '@/core/api/client';
import type { ChecklistRunMetrics } from './types';
import type { EscalationItem } from '@/features/escalations/types';
import type { EscalationsSummary } from './types';

export async function getChecklistMetrics(
  params?: Record<string, string>
): Promise<ChecklistRunMetrics> {
  return get<ChecklistRunMetrics>('/checklist-runs/metrics', params ?? {});
}

export async function getEscalationSummary(
  params?: Record<string, string>
): Promise<EscalationsSummary> {
  return get<EscalationsSummary>('/alert-events/escalations/summary', params ?? {});
}

export async function getPrioritizedEscalations(
  limit = 10
): Promise<{ items: EscalationItem[] }> {
  return get<{ items: EscalationItem[] }>(
    '/alert-events/escalations/prioritized',
    { limit }
  );
}
