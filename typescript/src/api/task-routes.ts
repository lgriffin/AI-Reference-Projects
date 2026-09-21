/** API: translate HTTP to service calls and back. No business rules, no try/catch. */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { STATUSES } from "../domain/task.ts";
import type { TaskService } from "../services/task-service.ts";

const CreateTask = z.object({ title: z.string().min(1).max(200) });
const MoveTask = z.object({ status: z.enum(STATUSES) });
const TaskId = z.object({ taskId: z.string() });

export function registerTaskRoutes(app: FastifyInstance, service: TaskService): void {
  app.post("/tasks", async (request, reply) => {
    const { title } = CreateTask.parse(request.body);
    return reply.code(201).send(await service.createTask(title));
  });

  app.get("/tasks", () => service.listTasks());

  app.get("/tasks/:taskId", (request) => {
    const { taskId } = TaskId.parse(request.params);
    return service.getTask(taskId);
  });

  app.post("/tasks/:taskId/status", (request) => {
    const { taskId } = TaskId.parse(request.params);
    const { status } = MoveTask.parse(request.body);
    return service.moveTask(taskId, status);
  });
}
