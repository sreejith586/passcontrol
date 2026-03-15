import { DomainEvent } from './domain-event.interface';

/** Injection token for DomainEventPublisher */
export const DOMAIN_EVENT_PUBLISHER = 'DomainEventPublisher';

/**
 * Publishes domain events to registered handlers.
 * In-process, synchronous dispatch. Handlers run sequentially.
 * Throws if any handler throws (fail-fast).
 */
export interface DomainEventPublisher {
  /** Publish an event. Dispatches to all handlers for eventName. Awaits each. */
  publish<T extends DomainEvent>(event: T): Promise<void>;
}
