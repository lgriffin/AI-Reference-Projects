/**
 * Pattern 2 — Repository Pattern (Prisma implementation)
 *
 * This concrete repository maps between the Prisma ORM model and the
 * domain Task entity.  Callers never see Prisma types — the interface
 * guarantees that only domain objects cross the boundary.
 */

import { PrismaClient, Task as PrismaTask } from "@prisma/client";
import { injectable, inject } from "tsyringe";
import { Task, CreateTaskInput, UpdateTaskInput, TaskStatus, Priority } from "../../domain/entities/task";
import { ITaskRepository, TaskFilters } from "../interfaces/task-repository";

function toDomain(record: PrismaTask): Task {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    status: record.status as TaskStatus,
    priority: record.priority as Priority,
    assigneeId: record.assigneeId,
    dueDate: record.dueDate,
    completedAt: record.completedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

@injectable()
export class PrismaTaskRepository implements ITaskRepository {
  constructor(@inject("PrismaClient") private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Task | null> {
    const record = await this.prisma.task.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async findAll(filters?: TaskFilters): Promise<Task[]> {
    const where: Record<string, unknown> = {};
    if (filters?.status) where["status"] = filters.status;
    if (filters?.priority) where["priority"] = filters.priority;
    if (filters?.assigneeId) where["assigneeId"] = filters.assigneeId;

    const records = await this.prisma.task.findMany({ where, orderBy: { createdAt: "desc" } });
    return records.map(toDomain);
  }

  async create(input: CreateTaskInput): Promise<Task> {
    const record = await this.prisma.task.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        priority: input.priority ?? Priority.MEDIUM,
        assigneeId: input.assigneeId ?? null,
        dueDate: input.dueDate ?? null,
      },
    });
    return toDomain(record);
  }

  async update(id: string, input: UpdateTaskInput): Promise<Task> {
    const record = await this.prisma.task.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.assigneeId !== undefined && { assigneeId: input.assigneeId }),
        ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
      },
    });
    return toDomain(record);
  }

  async updateStatus(id: string, status: TaskStatus, completedAt?: Date): Promise<Task> {
    const record = await this.prisma.task.update({
      where: { id },
      data: {
        status,
        completedAt: completedAt ?? null,
      },
    });
    return toDomain(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.task.delete({ where: { id } });
  }

  async findByAssigneeId(assigneeId: string): Promise<Task[]> {
    const records = await this.prisma.task.findMany({
      where: { assigneeId },
      orderBy: { createdAt: "desc" },
    });
    return records.map(toDomain);
  }
}
