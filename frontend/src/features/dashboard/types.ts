export interface ChecklistRunMetrics {
  todayRuns: number;
  overdueRuns: number;
  failedRuns: number;
  openAlerts: number;
  acknowledgedAlerts: number;
  resolvedAlertsToday: number;
}

export interface EscalationsSummary {
  totalActiveAlerts: number;
  acknowledgeBreached: number;
  resolveBreached: number;
  bySeverity: Record<
    string,
    { total: number; acknowledgeBreached: number; resolveBreached: number }
  >;
}
