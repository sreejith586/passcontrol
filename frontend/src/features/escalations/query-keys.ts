import type {
  EscalationsListParams,
  EscalationsPrioritizedParams,
} from './types';

export const queryKeys = {
  escalations: {
    list: (params: EscalationsListParams) =>
      ['escalations', 'list', params] as const,
    summary: (params: Record<string, unknown>) =>
      ['escalations', 'summary', params] as const,
    prioritized: (params: EscalationsPrioritizedParams) =>
      ['escalations', 'prioritized', params] as const,
  },
} as const;
