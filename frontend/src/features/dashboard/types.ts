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

/** SLA compliance summary for alerts triggered in a period.
 *  Uses triggeredAt for date range and SLA deadlines. */
export interface SlaComplianceSummary {
  totalAlerts: number;
  acknowledgedWithinSla: number;
  acknowledgedBreached: number;
  resolvedWithinSla: number;
  resolvedBreached: number;
}

/** Escalation trend: daily buckets of triggered alerts.
 *  Breached = currently past deadline (at query time). */
export interface EscalationTrendPoint {
  date: string;
  totalAlerts: number;
  breachedAlerts: number;
}

export interface TopProblemSource {
  sourceType: string;
  sourceId: string;
  count: number;
  /** Enriched source label when available. */
  sourceLabel?: string;
  sourceContext?: { checklistName?: string; locationName?: string };
}
