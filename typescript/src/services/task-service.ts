/**
 * Pattern 3 — Service Layer
 * Pattern 4 — Dependency Injection
 * Pattern 6 — Structured Error Handling
 * Pattern 7 — Event-Driven Communication
 *
 * TaskService encapsulates all business logic for task management.
 * It depends only on abstractions (ITaskRepository, IUserRepository)
 * injected via the constructor — never on concrete implementations.
 *
 * No HTTP concepts (request, response, status codes) appear here.
 * Errors are expressed as domain error types or Result values, and
 * domain events are published for cross-cutting concerns.
 */

import { injectable, inject } from "tsyringe";
import {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus,
  ALLOWED_TRANSITIONS,
} from "../domain/entities/task";
import { ITaskRepository, TaskFilters, PaginationOptions } from "../repositories/interfaces/task-repository";
import { IUserRepository } from "../repositories/interfaces/user-repository";
import {
  Result,
  ok,
  err,
  NotFoundError,
  InvalidOperationError,
  ValidationError,
} from "../domain/errors";
import { EventBus } from "../events/event-bus";
import {
  TaskCreatedEvent,
  TaskAssignedEvent,
  TaskStatusChangedEvent,
} from "../domain/events";

@injectable()
export class TaskService {
  constructor(
    @inject("ITaskRepository") private readonly taskRepo: ITaskRepository,
    @inject("IUserRepository") private readonly userRepo: IUserRepository,
    private readonly eventBus: EventBus,
  ) {}

  // -----------------------------------------------------------------------
  // Queries
  // -----------------------------------------------------------------------

  async getTask(id: string): Promise<Result<Task, NotFoundError>> {
    const task = await this.taskRepo.findById(id);
    if (!task) return err(new NotFoundError("Task", id));
    return ok(task);
  }

  async listTasks(filters?: TaskFilters, pagination?: PaginationOptions): Promise<Task[]> {
    return this.taskRepo.findAll(filters, pagination);
  }

  async getTasksByAssignee(assigneeId: string): Promise<Result<Task[], NotFoundError>> {
    const user = await this.userRepo.findById(assigneeId);
    if (!user) return err(new NotFoundError("User", assigneeId));
    const tasks = await this.taskRepo.findByAssigneeId(assigneeId);
    return ok(tasks);
  }

  // -----------------------------------------------------------------------
  // Commands
  // -----------------------------------------------------------------------

  async createTask(input: CreateTaskInput): Promise<Result<Task, NotFoundError | ValidationError>> {
    if (!input.title.trim()) {
      return err(new ValidationError("title", "must not be empty"));
    }

    // Validate assignee exists when provided
    if (input.assigneeId) {
      const assignee = await this.userRepo.findById(input.assigneeId);
      if (!assignee) return err(new NotFoundError("User", input.assigneeId));
    }

    const task = await this.taskRepo.create(input);

    this.eventBus.publish<TaskCreatedEvent>({
      type: "task.created",
      occurredAt: new Date().toISOString(),
      payload: {
        taskId: task.id,
        title: task.title,
        assigneeId: task.assigneeId,
      },
    });

    return ok(task);
  }

  async updateTask(
    id: string,
    input: UpdateTaskInput,
  ): Promise<Result<Task, NotFoundError>> {
    const existing = await this.taskRepo.findById(id);
    if (!existing) return err(new NotFoundError("Task", id));

    const updated = await this.taskRepo.update(id, input);

    // If the assignee changed, emit an assignment event
    if (
      input.assigneeId !== undefined &&
      input.assigneeId !== existing.assigneeId &&
      input.assigneeId !== null
    ) {
      this.eventBus.publish<TaskAssignedEvent>({
        type: "task.assigned",
        occurredAt: new Date().toISOString(),
        payload: {
          taskId: id,
          previousAssigneeId: existing.assigneeId,
          newAssigneeId: input.assigneeId,
        },
      });
    }

    return ok(updated);
  }

  async changeStatus(
    id: string,
    newStatus: TaskStatus,
  ): Promise<Result<Task, NotFoundError | InvalidOperationError>> {
    const existing = await this.taskRepo.findById(id);
    if (!existing) return err(new NotFoundError("Task", id));

    const allowed = ALLOWED_TRANSITIONS[existing.status];
    if (!allowed.has(newStatus)) {
      return err(
        new InvalidOperationError(
          `Cannot transition from ${existing.status} to ${newStatus}`,
        ),
      );
    }

    const completedAt = newStatus === TaskStatus.COMPLETED ? new Date() : undefined;
    const task = await this.taskRepo.updateStatus(id, newStatus, completedAt);

    this.eventBus.publish<TaskStatusChangedEvent>({
      type: "task.status_changed",
      occurredAt: new Date().toISOString(),
      payload: {
        taskId: id,
        previousStatus: existing.status,
        newStatus,
      },
    });

    return ok(task);
  }

  async deleteTask(id: string): Promise<Result<void, NotFoundError>> {
    const existing = await this.taskRepo.findById(id);
    if (!existing) return err(new NotFoundError("Task", id));
    await this.taskRepo.delete(id);
    return ok(undefined);
  }
}
