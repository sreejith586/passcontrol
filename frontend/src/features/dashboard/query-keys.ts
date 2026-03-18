export const queryKeys = {
  dashboard: {
    checklistMetrics: (params?: Record<string, string>) =>
      ['dashboard', 'checklist-metrics', params ?? {}] as const,
    escalationSummary: (params?: Record<string, string>) =>
      ['dashboard', 'escalation-summary', params ?? {}] as const,
    prioritizedEscalations: ['dashboard', 'prioritized-escalations'] as const,
  },
} as const;
