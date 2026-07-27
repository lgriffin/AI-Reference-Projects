/**
 * Pattern 4 — Dependency Injection (container setup)
 *
 * The DI container is configured in one place.  It binds interface
 * tokens to concrete implementations, so the rest of the application
 * depends only on abstractions.  Swapping implementations (e.g. an
 * in-memory repository for testing) requires changing only this file.
 */

import "reflect-metadata";
import { container } from "tsyringe";
import { PrismaClient } from "@prisma/client";

import { PrismaTaskRepository } from "./repositories/prisma/prisma-task-repository";
import { PrismaUserRepository } from "./repositories/prisma/prisma-user-repository";
import { EventBus } from "./events/event-bus";

// ---------------------------------------------------------------------------
// Singleton instances
// ---------------------------------------------------------------------------

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Register dependencies
// ---------------------------------------------------------------------------

// Infrastructure
container.registerInstance("PrismaClient", prisma);

// Event bus (singleton so publishers and subscribers share the same instance)
container.registerSingleton(EventBus);

// Repositories — bind interface tokens to concrete Prisma implementations
container.register("ITaskRepository", { useClass: PrismaTaskRepository });
container.register("IUserRepository", { useClass: PrismaUserRepository });

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

export { container };
