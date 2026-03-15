import { DomainEvent } from './domain-event.interface';

/**
 * Handler for a specific domain event type.
 * Handlers are invoked sequentially by the publisher.
 */
export interface DomainEventHandler<TEvent extends DomainEvent = DomainEvent> {
  /** Event name this handler subscribes to */
  readonly eventName: string;
  /** Process the event. Throwing will fail-fast and propagate. */
  handle(event: TEvent): Promise<void>;
}
