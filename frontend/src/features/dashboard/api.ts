import { get } from '@/core/api/client';
import type {
  ChecklistRunMetrics,
  EscalationsSummary,
  SlaComplianceSummary,
  EscalationTrendPoint,
  TopProblemSource,
} from './types';
import type { EscalationItem } from '@/features/escalations/types';

export async function getChecklistMetrics(
  params?: Record<string, string>
): Promise<ChecklistRunMetrics> {
  return get<ChecklistRunMetrics>('/v1/checklist-runs/metrics', params ?? {});
}

export async function getEscalationSummary(
  params?: Record<string, string>
): Promise<EscalationsSummary> {
  return get<EscalationsSummary>('/v1/alert-events/escalations/summary', params ?? {});
}

export async function getPrioritizedEscalations(
  limit = 10
): Promise<{ items: EscalationItem[] }> {
  return get<{ items: EscalationItem[] }>(
    '/v1/alert-events/escalations/prioritized',
    { limit }
  );
}

/** SLA compliance for alerts triggered in a period. Uses triggeredAt. */
export async function getSlaCompliance(params?: {
  from?: string;
  to?: string;
}): Promise<SlaComplianceSummary> {
  return get<SlaComplianceSummary>(
    '/v1/alert-events/insights/sla-compliance',
    params ?? {}
  );
}

/** Escalation trend: daily buckets of triggered alerts, with breached counts. */
export async function getEscalationTrend(days = 7): Promise<
  EscalationTrendPoint[]
> {
  return get<EscalationTrendPoint[]>(
    '/v1/alert-events/insights/escalation-trend',
    { days }
  );
}

/** Top problem sources by alert count.
 *  All-time (no date filter). */
export async function getTopProblemSources(
  limit = 5
): Promise<TopProblemSource[]> {
  return get<TopProblemSource[]>(
    '/v1/alert-events/insights/top-sources',
    { limit }
  );
}
