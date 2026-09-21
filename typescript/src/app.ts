/** Composition root: the only module that constructs collaborators and wires them together. */

import Fastify, { type FastifyInstance } from "fastify";
import { errorHandler } from "./api/error-handler.ts";
import { registerTaskRoutes } from "./api/task-routes.ts";
import type { Config } from "./config.ts";
import { EventBus } from "./events/event-bus.ts";
import { announceCompletion } from "./events/handlers.ts";
import { SqliteTaskRepository } from "./repositories/sqlite-task-repository.ts";
import { TaskService } from "./services/task-service.ts";

export function buildApp(config: Config): FastifyInstance {
  const events = new EventBus();
  events.subscribe("task_completed", announceCompletion);

  const tasks = new SqliteTaskRepository(config.databasePath);
  const service = new TaskService(tasks, events, config.wipLimit);

  const app = Fastify({ logger: { level: config.logLevel } });
  app.setErrorHandler(errorHandler);
  registerTaskRoutes(app, service);
  return app;
}
