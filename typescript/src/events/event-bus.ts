/**
 * Pattern 7 — Event-Driven Communication
 *
 * A lightweight, typed event bus built on Node's EventEmitter.  Services
 * publish domain events here; handlers subscribe and react.  This keeps
 * feature modules decoupled — the publisher does not know (or care) who
 * is listening.
 */

import { EventEmitter } from "node:events";
import { injectable } from "tsyringe";
import { DomainEvent } from "../domain/events";

export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => void | Promise<void>;

@injectable()
export class EventBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    // Allow many listeners — each event type may have several handlers.
    this.emitter.setMaxListeners(50);
  }

  /**
   * Publish a domain event.  All registered handlers for the event's
   * `type` are invoked asynchronously.
   */
  publish<T extends DomainEvent>(event: T): void {
    this.emitter.emit(event.type, event);
  }

  /**
   * Subscribe a handler to a specific event type.
   */
  subscribe<T extends DomainEvent>(eventType: T["type"], handler: EventHandler<T>): void {
    this.emitter.on(eventType, handler as EventHandler);
  }

  /**
   * Remove a previously registered handler.
   */
  unsubscribe<T extends DomainEvent>(eventType: T["type"], handler: EventHandler<T>): void {
    this.emitter.off(eventType, handler as EventHandler);
  }

  /**
   * Remove all handlers (useful in tests).
   */
  clear(): void {
    this.emitter.removeAllListeners();
  }
}
