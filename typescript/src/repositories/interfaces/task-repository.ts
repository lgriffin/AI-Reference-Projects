/**
 * Pattern 2 — Repository Pattern (interface)
 *
 * Defines the contract that any task persistence implementation must
 * satisfy.  The service layer depends only on this interface, never on
 * the concrete Prisma (or any other) implementation.
 */

import { Task, CreateTaskInput, UpdateTaskInput } from "../../domain/entities/task";

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface ITaskRepository {
  findById(id: string): Promise<Task | null>;
  findAll(filters?: TaskFilters, pagination?: PaginationOptions): Promise<Task[]>;
  create(input: CreateTaskInput): Promise<Task>;
  update(id: string, input: UpdateTaskInput): Promise<Task>;
  updateStatus(id: string, status: Task["status"], completedAt?: Date): Promise<Task>;
  delete(id: string): Promise<void>;
  findByAssigneeId(assigneeId: string): Promise<Task[]>;
}

export interface TaskFilters {
  status?: Task["status"];
  priority?: Task["priority"];
  assigneeId?: string;
}
