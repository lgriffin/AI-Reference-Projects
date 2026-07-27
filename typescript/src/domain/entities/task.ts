/**
 * Task domain entity.
 *
 * This is a pure domain object — it carries no ORM decorators and no
 * framework coupling.  Repositories map between this entity and whatever
 * persistence model they use (Pattern 2 — Repository).
 */

export enum TaskStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
}

export const ALLOWED_TRANSITIONS: Record<TaskStatus, Set<TaskStatus>> = {
  [TaskStatus.PENDING]: new Set([TaskStatus.IN_PROGRESS]),
  [TaskStatus.IN_PROGRESS]: new Set([TaskStatus.COMPLETED, TaskStatus.PENDING]),
  [TaskStatus.COMPLETED]: new Set(),
};

export enum Priority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export interface Task {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly status: TaskStatus;
  readonly priority: Priority;
  readonly assigneeId: string | null;
  readonly dueDate: Date | null;
  readonly completedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: Priority;
  assigneeId?: string;
  dueDate?: Date;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  priority?: Priority;
  assigneeId?: string | null;
  dueDate?: Date | null;
}
