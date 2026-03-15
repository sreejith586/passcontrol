import { DomainEvent } from '../contracts/domain-event.interface';

export const ALERT_ACKNOWLEDGED_EVENT = 'alert.acknowledged';

export interface AlertAcknowledgedPayload {
  alertEventId: string;
  sourceType: string;
  sourceId: string;
  acknowledgedByUserId: string | null;
  severity: string | null;
  status: string;
  acknowledgedAt: Date;
  brandId: string | null;
  locationId: string | null;
  zoneId: string | null;
}

export interface AlertAcknowledgedEvent
  extends DomainEvent<AlertAcknowledgedPayload> {
  eventName: typeof ALERT_ACKNOWLEDGED_EVENT;
}

export function createAlertAcknowledgedEvent(
  organizationId: string,
  payload: AlertAcknowledgedPayload,
): AlertAcknowledgedEvent {
  return {
    eventName: ALERT_ACKNOWLEDGED_EVENT,
    occurredAt: new Date(),
    organizationId,
    payload,
  };
}
