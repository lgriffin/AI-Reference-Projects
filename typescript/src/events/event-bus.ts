/** Events: an in-process publish/subscribe bus. Publishers never learn who listens. */

import type { DomainEvent } from "../domain/events.ts";

type EventOf<T extends DomainEvent["type"]> = Extract<DomainEvent, { type: T }>;
type Handler<E> = (event: E) => void | Promise<void>;

export class EventBus {
  private readonly handlers = new Map<string, Handler<DomainEvent>[]>();

  subscribe<T extends DomainEvent["type"]>(type: T, handler: Handler<EventOf<T>>): void {
    const registered = this.handlers.get(type) ?? [];
    this.handlers.set(type, [...registered, handler as Handler<DomainEvent>]);
  }

  async publish(event: DomainEvent): Promise<void> {
    for (const handler of this.handlers.get(event.type) ?? []) {
      try {
        await handler(event);
      } catch (error) {
        // a failing side effect must never fail the use case
        console.error("Handler failed for", event, error);
      }
    }
  }
}
