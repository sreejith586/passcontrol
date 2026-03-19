import type {
  ListTodayRunsParams,
  ListOverdueRunsParams,
  ListFailedRunsParams,
} from './types';

export const queryKeys = {
  all: ['checklist-runs'] as const,
  today: (params?: ListTodayRunsParams) =>
    ['checklist-runs', 'today', params ?? {}] as const,
  overdue: (params?: ListOverdueRunsParams) =>
    ['checklist-runs', 'overdue', params ?? {}] as const,
  failed: (params?: ListFailedRunsParams) =>
    ['checklist-runs', 'failed', params ?? {}] as const,
  detail: (id: string) => ['checklist-runs', 'detail', id] as const,
  runItemDetail: (itemId: string) =>
    ['checklist-runs', 'run-item', itemId] as const,
};
