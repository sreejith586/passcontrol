export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface AlertEvent {
  id: string;
  organizationId: string;
  brandId: string | null;
  locationId: string | null;
  zoneId: string | null;
  assetId: string | null;
  sourceType: string;
  sourceId: string;
  type: string;
  status: AlertStatus;
  severity: string | null;
  acknowledgeWithinMinutes: number;
  resolveWithinMinutes: number;
  payloadJson: Record<string, unknown> | null;
  triggeredAt: string;
  acknowledgedAt: string | null;
  acknowledgedByUserId: string | null;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  resolutionNote: string | null;
  createdAt: string;
  assignedToUserId: string | null;
  assignedAt: string | null;
  assignedByUserId: string | null;
  assignedToUser?: { id: string; name: string } | null;
}

export interface AlertEventActivity {
  id: string;
  type: string;
  actorUserId: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  fromAssignedToUserId: string | null;
  toAssignedToUserId: string | null;
  comment: string | null;
  metadata: unknown;
  createdAt: string;
}

export interface AlertEventComment {
  id: string;
  authorUserId: string | null;
  type: string;
  body: string;
  createdAt: string;
}

export interface ListAlertsParams {
  brandId?: string;
  locationId?: string;
  zoneId?: string;
  assetId?: string;
  type?: string;
  status?: AlertStatus;
  severity?: string;
  sourceType?: string;
  assignedUserId?: string;
  assignedToMe?: boolean;
  unassignedOnly?: boolean;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  sort?: 'triggered_at_asc' | 'triggered_at_desc' | 'created_at_desc';
}
