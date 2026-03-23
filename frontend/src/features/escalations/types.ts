export interface EscalationItem {
  alertEventId: string;
  severity: string | null;
  status: string;
  createdAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  sourceType: string;
  sourceId: string;
  scope: Record<string, unknown>;
  sla: {
    acknowledgeWithinMinutes: number;
    resolveWithinMinutes: number;
    acknowledgeBy: string;
    resolveBy: string;
    acknowledgeBreached: boolean;
    resolveBreached: boolean;
  };
  /** Checklist template/run name when enriched by backend (e.g. from source context). */
  checklistName?: string | null;
  /** Item label when enriched by backend (e.g. from run item snapshot). */
  itemLabel?: string | null;
  /** Assigned user when enriched by backend. */
  assignedToUser?: { id: string; name: string } | null;
}

export interface EscalationsListParams {
  brandId?: string;
  locationId?: string;
  zoneId?: string;
  severity?: string;
  status?: 'OPEN' | 'ACKNOWLEDGED';
  assignedUserId?: string;
  assignedToMe?: boolean;
  unassignedOnly?: boolean;
  onlyBreached?: boolean;
  page?: number;
  limit?: number;
  /** When omitted, backend uses urgency-based default ordering. */
  sort?:
    | 'created_at_asc'
    | 'created_at_desc'
    | 'status_asc'
    | 'status_desc'
    | 'severity_asc'
    | 'severity_desc'
    | 'assigned_asc'
    | 'assigned_desc';
}

export interface EscalationsPrioritizedParams {
  brandId?: string;
  locationId?: string;
  zoneId?: string;
  severity?: string;
  status?: 'OPEN' | 'ACKNOWLEDGED';
  assignedUserId?: string;
  assignedToMe?: boolean;
  unassignedOnly?: boolean;
  limit?: number;
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
