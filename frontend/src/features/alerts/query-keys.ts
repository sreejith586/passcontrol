import type { ListAlertsParams } from './types';

export const queryKeys = {
  alerts: {
    all: ['alerts'] as const,
    list: (filters: ListAlertsParams) => ['alerts', 'list', filters] as const,
    detail: (id: string) => ['alerts', 'detail', id] as const,
    activities: (id: string) => ['alerts', 'activities', id] as const,
    comments: (id: string) => ['alerts', 'comments', id] as const,
  },
} as const;
