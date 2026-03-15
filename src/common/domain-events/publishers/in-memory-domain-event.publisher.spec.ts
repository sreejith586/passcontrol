import { InMemoryDomainEventPublisher } from './in-memory-domain-event.publisher';
import { DomainEvent } from '../contracts/domain-event.interface';
import { DomainEventHandler } from '../contracts/domain-event-handler.interface';

describe('InMemoryDomainEventPublisher', () => {
  let publisher: InMemoryDomainEventPublisher;

  beforeEach(() => {
    publisher = new InMemoryDomainEventPublisher();
  });

  it('dispatches events to handlers by eventName', async () => {
    const handled: DomainEvent[] = [];
    const handler: DomainEventHandler = {
      eventName: 'test.event',
      handle: async (event) => {
        handled.push(event);
      },
    };
    publisher.registerHandler(handler);

    const event: DomainEvent = {
      eventName: 'test.event',
      occurredAt: new Date(),
      organizationId: 'org-1',
      payload: { foo: 'bar' },
    };

    await publisher.publish(event);

    expect(handled).toHaveLength(1);
    expect(handled[0]).toBe(event);
    expect(handled[0].payload).toEqual({ foo: 'bar' });
  });

  it('does not dispatch to handlers for other event names', async () => {
    const handled: DomainEvent[] = [];
    const handler: DomainEventHandler = {
      eventName: 'other.event',
      handle: async (event) => {
        handled.push(event);
      },
    };
    publisher.registerHandler(handler);

    const event: DomainEvent = {
      eventName: 'test.event',
      occurredAt: new Date(),
      organizationId: 'org-1',
      payload: {},
    };

    await publisher.publish(event);

    expect(handled).toHaveLength(0);
  });

  it('runs multiple handlers for same eventName sequentially', async () => {
    const order: number[] = [];
    const handler1: DomainEventHandler = {
      eventName: 'test.event',
      handle: async () => {
        order.push(1);
      },
    };
    const handler2: DomainEventHandler = {
      eventName: 'test.event',
      handle: async () => {
        order.push(2);
      },
    };
    publisher.registerHandler(handler1);
    publisher.registerHandler(handler2);

    await publisher.publish({
      eventName: 'test.event',
      occurredAt: new Date(),
      organizationId: 'org-1',
      payload: {},
    });

    expect(order).toEqual([1, 2]);
  });

  it('awaits handlers before resolving', async () => {
    let resolved = false;
    const handler: DomainEventHandler = {
      eventName: 'test.event',
      handle: async () => {
        await new Promise((r) => setTimeout(r, 10));
        resolved = true;
      },
    };
    publisher.registerHandler(handler);

    const publishPromise = publisher.publish({
      eventName: 'test.event',
      occurredAt: new Date(),
      organizationId: 'org-1',
      payload: {},
    });

    expect(resolved).toBe(false);
    await publishPromise;
    expect(resolved).toBe(true);
  });

  it('throws if handler throws (fail-fast)', async () => {
    const handler: DomainEventHandler = {
      eventName: 'test.event',
      handle: async () => {
        throw new Error('Handler failed');
      },
    };
    publisher.registerHandler(handler);

    await expect(
      publisher.publish({
        eventName: 'test.event',
        occurredAt: new Date(),
        organizationId: 'org-1',
        payload: {},
      }),
    ).rejects.toThrow('Handler failed');
  });

  it('completes without error when no handlers registered for event', async () => {
    await expect(
      publisher.publish({
        eventName: 'unhandled.event',
        occurredAt: new Date(),
        organizationId: 'org-1',
        payload: {},
      }),
    ).resolves.toBeUndefined();
  });
});
