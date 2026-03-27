import { get } from '@/core/api/client';
import type { PaginatedData } from '@/core/api/types';
import type {
  EscalationItem,
  EscalationsListParams,
  EscalationsPrioritizedParams,
  EscalationsSummary,
} from './types';

export async function listEscalations(
  params: EscalationsListParams
): Promise<PaginatedData<EscalationItem>> {
  const cleanParams: Record<string, string | number | boolean> = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === '') return;
    if (k === 'sort' && v === 'default') return; // omit sort => backend uses urgency default
    cleanParams[k] = v as string | number | boolean;
  });
  return get<PaginatedData<EscalationItem>>(
    '/v1/alert-events/escalations',
    cleanParams
  );
}

export async function getEscalationsSummary(
  params?: Record<string, string>
): Promise<EscalationsSummary> {
  return get<EscalationsSummary>('/v1/alert-events/escalations/summary', params ?? {});
}

export async function getPrioritizedEscalations(
  params?: EscalationsPrioritizedParams
): Promise<{ items: EscalationItem[] }> {
  const cleanParams: Record<string, string | number | boolean> = {};
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') {
        cleanParams[k] = v as string | number | boolean;
      }
    });
  }
  return get<{ items: EscalationItem[] }>(
    '/v1/alert-events/escalations/prioritized',
    cleanParams
  );
}
