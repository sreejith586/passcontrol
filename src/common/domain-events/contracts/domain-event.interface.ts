/**
 * Base interface for domain events.
 * Events are immutable records of something that happened in the domain.
 */
export interface DomainEvent<TPayload = unknown> {
  /** Unique event type identifier (e.g. checklist.run-item.failed) */
  eventName: string;
  /** When the event occurred (UTC) */
  occurredAt: Date;
  /** Tenant scope - required for multi-tenant systems */
  organizationId: string;
  /** Event-specific payload */
  payload: TPayload;
}
