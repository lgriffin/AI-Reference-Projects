/**
 * Pattern 1 — Layered Architecture (presentation layer)
 *
 * Routes handle HTTP concerns only: parse requests, call the service,
 * and format responses.  No business logic lives here.
 */

import { FastifyInstance } from "fastify";
import { container } from "tsyringe";
import { config } from "../../config";
import { TaskService } from "../../services/task-service";
import {
  createTaskSchema,
  updateTaskSchema,
  changeStatusSchema,
  taskFiltersSchema,
  idParamSchema,
} from "../schemas/task-schemas";
import { TaskStatus, Priority } from "../../domain/entities/task";

function serializeTask(task: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeId: string | null;
  dueDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId,
    dueDate: task.dueDate?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export async function taskRoutes(app: FastifyInstance): Promise<void> {
  const taskService = container.resolve(TaskService);

  // GET /tasks
  app.get("/tasks", async (request, reply) => {
    const { limit, offset, ...filterQuery } = taskFiltersSchema.parse(request.query);
    const filters = {
      ...(filterQuery.status && { status: filterQuery.status as TaskStatus }),
      ...(filterQuery.priority && { priority: filterQuery.priority as Priority }),
      ...(filterQuery.assigneeId && { assigneeId: filterQuery.assigneeId }),
    };
    const pagination = {
      limit: limit ?? config.defaultPageSize,
      offset: offset ?? 0,
    };
    const tasks = await taskService.listTasks(
      Object.keys(filters).length > 0 ? filters : undefined,
      pagination,
    );
    return reply.send(tasks.map(serializeTask));
  });

  // GET /tasks/:id
  app.get("/tasks/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const result = await taskService.getTask(id);
    if (!result.ok) throw result.error;
    return reply.send(serializeTask(result.value));
  });

  // POST /tasks
  app.post("/tasks", async (request, reply) => {
    const body = createTaskSchema.parse(request.body);
    const result = await taskService.createTask({
      title: body.title,
      description: body.description,
      priority: body.priority as Priority | undefined,
      assigneeId: body.assigneeId,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    });
    if (!result.ok) throw result.error;
    return reply.status(201).send(serializeTask(result.value));
  });

  // PATCH /tasks/:id
  app.patch("/tasks/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const body = updateTaskSchema.parse(request.body);
    const result = await taskService.updateTask(id, {
      title: body.title,
      description: body.description,
      priority: body.priority as Priority | undefined,
      assigneeId: body.assigneeId,
      dueDate: body.dueDate !== undefined
        ? body.dueDate !== null ? new Date(body.dueDate) : null
        : undefined,
    });
    if (!result.ok) throw result.error;
    return reply.send(serializeTask(result.value));
  });

  // POST /tasks/:id/status
  app.post("/tasks/:id/status", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const body = changeStatusSchema.parse(request.body);
    const result = await taskService.changeStatus(id, body.status as TaskStatus);
    if (!result.ok) throw result.error;
    return reply.send(serializeTask(result.value));
  });

  // DELETE /tasks/:id
  app.delete("/tasks/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const result = await taskService.deleteTask(id);
    if (!result.ok) throw result.error;
    return reply.status(204).send();
  });
}
