/**
 * Pattern 7 — Event-Driven Communication
 *
 * Domain event types that services emit.  Handlers in the events/ layer
 * subscribe to these events and react asynchronously, keeping features
 * decoupled from one another.
 */

export interface DomainEvent {
  /** Unique event name used for routing. */
  readonly type: string;
  /** ISO-8601 timestamp of when the event was created. */
  readonly occurredAt: string;
}

// ---------------------------------------------------------------------------
// Task events
// ---------------------------------------------------------------------------

export interface TaskCreatedEvent extends DomainEvent {
  readonly type: "task.created";
  readonly payload: {
    taskId: string;
    title: string;
    assigneeId: string | null;
  };
}

export interface TaskAssignedEvent extends DomainEvent {
  readonly type: "task.assigned";
  readonly payload: {
    taskId: string;
    previousAssigneeId: string | null;
    newAssigneeId: string;
  };
}

export interface TaskStatusChangedEvent extends DomainEvent {
  readonly type: "task.status_changed";
  readonly payload: {
    taskId: string;
    previousStatus: string;
    newStatus: string;
  };
}

// ---------------------------------------------------------------------------
// User events
// ---------------------------------------------------------------------------

export interface UserCreatedEvent extends DomainEvent {
  readonly type: "user.created";
  readonly payload: {
    userId: string;
    email: string;
  };
}

// ---------------------------------------------------------------------------
// Union of all domain events (useful for typed handlers)
// ---------------------------------------------------------------------------

export type AppDomainEvent =
  | TaskCreatedEvent
  | TaskAssignedEvent
  | TaskStatusChangedEvent
  | UserCreatedEvent;
