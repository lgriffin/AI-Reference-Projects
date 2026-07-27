/**
 * Application entry point.
 *
 * Bootstraps the Fastify server, registers the DI container, wires up
 * event handlers, and starts listening.
 */

import "reflect-metadata";
import Fastify from "fastify";
import cors from "@fastify/cors";

import { config } from "./config";
import { container, disconnectDatabase } from "./container";
import { taskRoutes } from "./presentation/routes/task-routes";
import { userRoutes } from "./presentation/routes/user-routes";
import { errorHandler } from "./presentation/middleware/error-handler";
import { TaskEventHandlers } from "./events/handlers/task-handlers";

async function main(): Promise<void> {
  const app = Fastify({
    logger: {
      level: config.logLevel,
    },
  });

  // --- Plugins -----------------------------------------------------------
  await app.register(cors);

  // --- Error handler (Pattern 6) -----------------------------------------
  app.setErrorHandler(errorHandler);

  // --- Routes (Pattern 1 — presentation layer) ---------------------------
  await app.register(taskRoutes, { prefix: "/api" });
  await app.register(userRoutes, { prefix: "/api" });

  // --- Event handlers (Pattern 7) ----------------------------------------
  const taskEventHandlers = container.resolve(TaskEventHandlers);
  taskEventHandlers.register();

  // --- Health check ------------------------------------------------------
  app.get("/health", async () => ({ status: "ok" }));

  // --- Start -------------------------------------------------------------
  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`Server listening on http://${config.host}:${config.port}`);
  } catch (error) {
    app.log.error(error);
    await disconnectDatabase();
    process.exit(1);
  }

  // --- Graceful shutdown --------------------------------------------------
  const shutdown = async () => {
    console.log("Shutting down...");
    await app.close();
    await disconnectDatabase();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("Fatal error during startup:", error);
  process.exit(1);
});
