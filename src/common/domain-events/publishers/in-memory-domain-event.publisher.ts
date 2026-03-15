import { Injectable } from '@nestjs/common';
import { DomainEvent } from '../contracts/domain-event.interface';
import { DomainEventHandler } from '../contracts/domain-event-handler.interface';
import { DomainEventPublisher } from '../contracts/domain-event-publisher.interface';

/**
 * In-process domain event publisher.
 * Dispatches events to handlers by eventName. Runs handlers sequentially.
 * Fail-fast: if a handler throws, the error propagates.
 */
@Injectable()
export class InMemoryDomainEventPublisher implements DomainEventPublisher {
  private readonly handlersByEventName = new Map<
    string,
    DomainEventHandler[]
  >();

  /**
   * Register a handler for an event name.
   * Called during module initialization.
   */
  registerHandler(handler: DomainEventHandler): void {
    const existing = this.handlersByEventName.get(handler.eventName) ?? [];
    existing.push(handler);
    this.handlersByEventName.set(handler.eventName, existing);
  }

  async publish<T extends DomainEvent>(event: T): Promise<void> {
    const handlers = this.handlersByEventName.get(event.eventName) ?? [];
    for (const handler of handlers) {
      await handler.handle(event);
    }
  }
}
