/**
 * Pattern 7 — Event-Driven Communication (handlers)
 *
 * Side-effects that should happen when task domain events occur.
 * In a production system these might send emails, update analytics,
 * or push WebSocket notifications.  Here we keep them as structured
 * log statements so the pattern is visible without external deps.
 */

import { injectable } from "tsyringe";
import { EventBus } from "../event-bus";
import {
  TaskCreatedEvent,
  TaskAssignedEvent,
  TaskStatusChangedEvent,
} from "../../domain/events";

@injectable()
export class TaskEventHandlers {
  constructor(private readonly eventBus: EventBus) {}

  /**
   * Wire up all task-related event subscriptions.
   * Called once during application bootstrap.
   */
  register(): void {
    this.eventBus.subscribe<TaskCreatedEvent>("task.created", (event) => {
      this.onTaskCreated(event);
    });

    this.eventBus.subscribe<TaskAssignedEvent>("task.assigned", (event) => {
      this.onTaskAssigned(event);
    });

    this.eventBus.subscribe<TaskStatusChangedEvent>("task.status_changed", (event) => {
      this.onTaskStatusChanged(event);
    });
  }

  private onTaskCreated(event: TaskCreatedEvent): void {
    console.log(
      `[event] Task created: ${event.payload.taskId} — "${event.payload.title}"`,
    );

    if (event.payload.assigneeId) {
      console.log(
        `[event] Notification queued for assignee ${event.payload.assigneeId}`,
      );
    }
  }

  private onTaskAssigned(event: TaskAssignedEvent): void {
    console.log(
      `[event] Task ${event.payload.taskId} reassigned: ` +
        `${event.payload.previousAssigneeId ?? "(none)"} → ${event.payload.newAssigneeId}`,
    );
  }

  private onTaskStatusChanged(event: TaskStatusChangedEvent): void {
    console.log(
      `[event] Task ${event.payload.taskId} status changed: ` +
        `${event.payload.previousStatus} → ${event.payload.newStatus}`,
    );
  }
}
