export const queryKeys = {
  dashboard: {
    checklistMetrics: (params?: Record<string, string>) =>
      ['dashboard', 'checklist-metrics', params ?? {}] as const,
    escalationSummary: (params?: Record<string, string>) =>
      ['dashboard', 'escalation-summary', params ?? {}] as const,
    prioritizedEscalations: ['dashboard', 'prioritized-escalations'] as const,
    slaCompliance: (params?: { from?: string; to?: string }) =>
      ['dashboard', 'sla-compliance', params ?? {}] as const,
    escalationTrend: (days?: number) =>
      ['dashboard', 'escalation-trend', days ?? 7] as const,
    topProblemSources: (limit?: number) =>
      ['dashboard', 'top-problem-sources', limit ?? 5] as const,
  },
} as const;
