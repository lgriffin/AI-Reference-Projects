/**
 * Pattern 8 — Test Scaffold (integration tests)
 *
 * Integration tests for the Prisma task repository running against a
 * real SQLite database — the same approach Java uses with H2 and Python
 * uses with SQLite.  No mocks: these tests verify the full persistence
 * round-trip through the ORM.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaTaskRepository } from "../../../src/repositories/prisma/prisma-task-repository";
import { TaskStatus, Priority } from "../../../src/domain/entities/task";

const TEST_DB_URL = "file:./test-integration.db";

describe("PrismaTaskRepository (integration)", () => {
  let prisma: PrismaClient;
  let repo: PrismaTaskRepository;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: { db: { url: TEST_DB_URL } },
    });
    await prisma.$connect();

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING',
        priority TEXT NOT NULL DEFAULT 'MEDIUM',
        assignee_id TEXT REFERENCES users(id),
        due_date DATETIME,
        completed_at DATETIME,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    repo = new PrismaTaskRepository(prisma);
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe("DELETE FROM tasks");
    await prisma.$executeRawUnsafe("DELETE FROM users");
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a task and returns a domain entity", async () => {
    const task = await repo.create({ title: "Integration test task" });

    expect(task.id).toBeDefined();
    expect(task.title).toBe("Integration test task");
    expect(task.status).toBe(TaskStatus.PENDING);
    expect(task.priority).toBe(Priority.MEDIUM);
    expect(task.createdAt).toBeInstanceOf(Date);
  });

  it("finds a task by id after creation", async () => {
    const created = await repo.create({ title: "Find me" });
    const found = await repo.findById(created.id);

    expect(found).not.toBeNull();
    expect(found?.title).toBe("Find me");
  });

  it("returns null for a nonexistent task", async () => {
    const found = await repo.findById("nonexistent");
    expect(found).toBeNull();
  });

  it("updates a task's status", async () => {
    const created = await repo.create({ title: "Status test" });
    const updated = await repo.updateStatus(created.id, TaskStatus.COMPLETED, new Date());

    expect(updated.status).toBe(TaskStatus.COMPLETED);
    expect(updated.completedAt).toBeInstanceOf(Date);
  });

  it("deletes a task", async () => {
    const created = await repo.create({ title: "Delete me" });
    await repo.delete(created.id);
    const found = await repo.findById(created.id);

    expect(found).toBeNull();
  });

  it("filters tasks by status", async () => {
    await repo.create({ title: "Task A" });
    await repo.create({ title: "Task B" });
    const taskC = await repo.create({ title: "Task C" });
    await repo.updateStatus(taskC.id, TaskStatus.IN_PROGRESS);

    const pending = await repo.findAll({ status: TaskStatus.PENDING });
    const inProgress = await repo.findAll({ status: TaskStatus.IN_PROGRESS });

    expect(pending).toHaveLength(2);
    expect(inProgress).toHaveLength(1);
    expect(inProgress[0].title).toBe("Task C");
  });

  it("paginates results with limit and offset", async () => {
    await repo.create({ title: "Task A" });
    await repo.create({ title: "Task B" });
    await repo.create({ title: "Task C" });

    const firstPage = await repo.findAll(undefined, { limit: 2, offset: 0 });
    const secondPage = await repo.findAll(undefined, { limit: 2, offset: 2 });

    expect(firstPage).toHaveLength(2);
    expect(secondPage).toHaveLength(1);
  });
});
