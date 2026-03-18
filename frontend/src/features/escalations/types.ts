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
