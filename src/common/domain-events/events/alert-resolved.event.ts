import { DomainEvent } from '../contracts/domain-event.interface';

export const ALERT_RESOLVED_EVENT = 'alert.resolved';

export interface AlertResolvedPayload {
  alertEventId: string;
  sourceType: string;
  sourceId: string;
  resolvedByUserId: string | null;
  severity: string | null;
  status: string;
  resolvedAt: Date;
  resolutionNote: string | null;
  brandId: string | null;
  locationId: string | null;
  zoneId: string | null;
}

export interface AlertResolvedEvent
  extends DomainEvent<AlertResolvedPayload> {
  eventName: typeof ALERT_RESOLVED_EVENT;
}

export function createAlertResolvedEvent(
  organizationId: string,
  payload: AlertResolvedPayload,
): AlertResolvedEvent {
  return {
    eventName: ALERT_RESOLVED_EVENT,
    occurredAt: new Date(),
    organizationId,
    payload,
  };
}
