/**
 * Pattern 8 — Test Scaffold (API / route tests)
 *
 * These tests exercise the full HTTP layer: request parsing, Zod
 * validation, service delegation, and response serialisation.
 *
 * The service layer is mocked so we can test presentation-layer
 * behaviour without a database.  Fastify's `inject` method lets us
 * send requests without starting a real network listener.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { container } from "tsyringe";
import { taskRoutes } from "../../src/presentation/routes/task-routes";
import { errorHandler } from "../../src/presentation/middleware/error-handler";
import { TaskService } from "../../src/services/task-service";
import { TaskStatus, Priority } from "../../src/domain/entities/task";
import { ok, err, NotFoundError } from "../../src/domain/errors";

// ---------------------------------------------------------------------------
// Mock TaskService
// ---------------------------------------------------------------------------

const mockTaskService = {
  getTask: vi.fn(),
  listTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  changeStatus: vi.fn(),
  deleteTask: vi.fn(),
  getTasksByAssignee: vi.fn(),
};

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

describe("Task Routes", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Override DI resolution for TaskService
    container.register(TaskService, { useValue: mockTaskService as unknown as TaskService });

    app = Fastify();
    app.setErrorHandler(errorHandler);
    await app.register(taskRoutes, { prefix: "/api" });
    await app.ready();
  });

  // -----------------------------------------------------------------------
  // GET /api/tasks
  // -----------------------------------------------------------------------

  describe("GET /api/tasks", () => {
    it("returns 200 with a list of tasks", async () => {
      const task = {
        id: "00000000-0000-0000-0000-000000000001",
        title: "Test task",
        description: null,
        status: TaskStatus.PENDING,
        priority: Priority.MEDIUM,
        assigneeId: null,
        dueDate: null,
        completedAt: null,
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-01T00:00:00Z"),
      };
      mockTaskService.listTasks.mockResolvedValue([task]);

      const response = await app.inject({
        method: "GET",
        url: "/api/tasks",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveLength(1);
      expect(body[0].title).toBe("Test task");
      expect(body[0].createdAt).toBe("2025-01-01T00:00:00.000Z");
      expect(mockTaskService.listTasks).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({ limit: expect.any(Number), offset: 0 }),
      );
    });

    it("passes explicit limit and offset to the service", async () => {
      mockTaskService.listTasks.mockResolvedValue([]);

      const response = await app.inject({
        method: "GET",
        url: "/api/tasks?limit=5&offset=10",
      });

      expect(response.statusCode).toBe(200);
      expect(mockTaskService.listTasks).toHaveBeenCalledWith(
        undefined,
        { limit: 5, offset: 10 },
      );
    });
  });

  // -----------------------------------------------------------------------
  // GET /api/tasks/:id
  // -----------------------------------------------------------------------

  describe("GET /api/tasks/:id", () => {
    it("returns 200 for an existing task", async () => {
      const task = {
        id: "00000000-0000-0000-0000-000000000001",
        title: "Found task",
        description: null,
        status: TaskStatus.PENDING,
        priority: Priority.MEDIUM,
        assigneeId: null,
        dueDate: null,
        completedAt: null,
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-01T00:00:00Z"),
      };
      mockTaskService.getTask.mockResolvedValue(ok(task));

      const response = await app.inject({
        method: "GET",
        url: "/api/tasks/00000000-0000-0000-0000-000000000001",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().title).toBe("Found task");
    });

    it("returns 404 for a nonexistent task", async () => {
      mockTaskService.getTask.mockResolvedValue(
        err(new NotFoundError("Task", "00000000-0000-0000-0000-000000000099")),
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/tasks/00000000-0000-0000-0000-000000000099",
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe("NOT_FOUND");
    });

    it("returns 400 for an invalid UUID", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/tasks/not-a-uuid",
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("VALIDATION_ERROR");
    });
  });

  // -----------------------------------------------------------------------
  // POST /api/tasks
  // -----------------------------------------------------------------------

  describe("POST /api/tasks", () => {
    it("returns 201 for a valid creation", async () => {
      const task = {
        id: "00000000-0000-0000-0000-000000000002",
        title: "New task",
        description: null,
        status: TaskStatus.PENDING,
        priority: Priority.MEDIUM,
        assigneeId: null,
        dueDate: null,
        completedAt: null,
        createdAt: new Date("2025-06-01T00:00:00Z"),
        updatedAt: new Date("2025-06-01T00:00:00Z"),
      };
      mockTaskService.createTask.mockResolvedValue(ok(task));

      const response = await app.inject({
        method: "POST",
        url: "/api/tasks",
        headers: { "content-type": "application/json" },
        payload: { title: "New task" },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().title).toBe("New task");
    });

    it("returns 400 when title is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/tasks",
        headers: { "content-type": "application/json" },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // -----------------------------------------------------------------------
  // POST /api/tasks/:id/status
  // -----------------------------------------------------------------------

  describe("POST /api/tasks/:id/status", () => {
    it("returns 200 when status is changed successfully", async () => {
      const task = {
        id: "00000000-0000-0000-0000-000000000001",
        title: "Started task",
        description: null,
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.MEDIUM,
        assigneeId: null,
        dueDate: null,
        completedAt: null,
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-06-01T12:00:00Z"),
      };
      mockTaskService.changeStatus.mockResolvedValue(ok(task));

      const response = await app.inject({
        method: "POST",
        url: "/api/tasks/00000000-0000-0000-0000-000000000001/status",
        headers: { "content-type": "application/json" },
        payload: { status: "IN_PROGRESS" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("IN_PROGRESS");
    });

    it("returns 400 for invalid status value", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/tasks/00000000-0000-0000-0000-000000000001/status",
        headers: { "content-type": "application/json" },
        payload: { status: "INVALID" },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // -----------------------------------------------------------------------
  // DELETE /api/tasks/:id
  // -----------------------------------------------------------------------

  describe("DELETE /api/tasks/:id", () => {
    it("returns 204 when task is deleted", async () => {
      mockTaskService.deleteTask.mockResolvedValue(ok(undefined));

      const response = await app.inject({
        method: "DELETE",
        url: "/api/tasks/00000000-0000-0000-0000-000000000001",
      });

      expect(response.statusCode).toBe(204);
    });
  });
});
