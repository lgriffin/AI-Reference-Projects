/**
 * Pattern 8 — Test Scaffold (unit tests)
 *
 * Unit tests for TaskService with fully mocked dependencies.
 * These tests verify business logic in isolation — no database,
 * no HTTP, no filesystem.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TaskService } from "../../../src/services/task-service";
import { EventBus } from "../../../src/events/event-bus";
import { ITaskRepository } from "../../../src/repositories/interfaces/task-repository";
import { IUserRepository } from "../../../src/repositories/interfaces/user-repository";
import { Task, TaskStatus, Priority } from "../../../src/domain/entities/task";
import { User } from "../../../src/domain/entities/user";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Write tests",
    description: null,
    status: TaskStatus.PENDING,
    priority: Priority.MEDIUM,
    assigneeId: null,
    dueDate: null,
    completedAt: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "alice@example.com",
    name: "Alice",
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

function createMockTaskRepo(): ITaskRepository {
  return {
    findById: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
    findByAssigneeId: vi.fn(),
  };
}

function createMockUserRepo(): IUserRepository {
  return {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TaskService", () => {
  let taskRepo: ITaskRepository;
  let userRepo: IUserRepository;
  let eventBus: EventBus;
  let service: TaskService;

  beforeEach(() => {
    taskRepo = createMockTaskRepo();
    userRepo = createMockUserRepo();
    eventBus = new EventBus();
    vi.spyOn(eventBus, "publish");
    service = new TaskService(taskRepo, userRepo, eventBus);
  });

  // -----------------------------------------------------------------------
  // getTask
  // -----------------------------------------------------------------------

  describe("getTask", () => {
    it("returns the task when found", async () => {
      const task = makeTask();
      vi.mocked(taskRepo.findById).mockResolvedValue(task);

      const result = await service.getTask("task-1");

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual(task);
    });

    it("returns NotFoundError when task does not exist", async () => {
      vi.mocked(taskRepo.findById).mockResolvedValue(null);

      const result = await service.getTask("nonexistent");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOT_FOUND");
        expect(result.error.entity).toBe("Task");
      }
    });
  });

  // -----------------------------------------------------------------------
  // createTask
  // -----------------------------------------------------------------------

  describe("createTask", () => {
    it("creates a task and emits task.created event", async () => {
      const task = makeTask();
      vi.mocked(taskRepo.create).mockResolvedValue(task);

      const result = await service.createTask({ title: "Write tests" });

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.title).toBe("Write tests");
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: "task.created" }),
      );
    });

    it("rejects empty title", async () => {
      const result = await service.createTask({ title: "  " });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
    });

    it("validates assignee exists", async () => {
      vi.mocked(userRepo.findById).mockResolvedValue(null);

      const result = await service.createTask({
        title: "Write tests",
        assigneeId: "nonexistent",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });

    it("accepts valid assignee", async () => {
      const user = makeUser();
      const task = makeTask({ assigneeId: user.id });
      vi.mocked(userRepo.findById).mockResolvedValue(user);
      vi.mocked(taskRepo.create).mockResolvedValue(task);

      const result = await service.createTask({
        title: "Write tests",
        assigneeId: user.id,
      });

      expect(result.ok).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // changeStatus
  // -----------------------------------------------------------------------

  describe("changeStatus", () => {
    it("transitions PENDING → IN_PROGRESS", async () => {
      const pending = makeTask({ status: TaskStatus.PENDING });
      const inProgress = makeTask({ status: TaskStatus.IN_PROGRESS });
      vi.mocked(taskRepo.findById).mockResolvedValue(pending);
      vi.mocked(taskRepo.updateStatus).mockResolvedValue(inProgress);

      const result = await service.changeStatus("task-1", TaskStatus.IN_PROGRESS);

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.status).toBe(TaskStatus.IN_PROGRESS);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: "task.status_changed" }),
      );
    });

    it("transitions IN_PROGRESS → COMPLETED", async () => {
      const inProgress = makeTask({ status: TaskStatus.IN_PROGRESS });
      const completed = makeTask({ status: TaskStatus.COMPLETED, completedAt: new Date() });
      vi.mocked(taskRepo.findById).mockResolvedValue(inProgress);
      vi.mocked(taskRepo.updateStatus).mockResolvedValue(completed);

      const result = await service.changeStatus("task-1", TaskStatus.COMPLETED);

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.status).toBe(TaskStatus.COMPLETED);
    });

    it("transitions IN_PROGRESS → PENDING", async () => {
      const inProgress = makeTask({ status: TaskStatus.IN_PROGRESS });
      const pending = makeTask({ status: TaskStatus.PENDING });
      vi.mocked(taskRepo.findById).mockResolvedValue(inProgress);
      vi.mocked(taskRepo.updateStatus).mockResolvedValue(pending);

      const result = await service.changeStatus("task-1", TaskStatus.PENDING);

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.status).toBe(TaskStatus.PENDING);
    });

    it("rejects PENDING → COMPLETED (must go through IN_PROGRESS)", async () => {
      const pending = makeTask({ status: TaskStatus.PENDING });
      vi.mocked(taskRepo.findById).mockResolvedValue(pending);

      const result = await service.changeStatus("task-1", TaskStatus.COMPLETED);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("INVALID_OPERATION");
    });

    it("rejects COMPLETED → any (terminal state)", async () => {
      const completed = makeTask({ status: TaskStatus.COMPLETED });
      vi.mocked(taskRepo.findById).mockResolvedValue(completed);

      const result = await service.changeStatus("task-1", TaskStatus.PENDING);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("INVALID_OPERATION");
    });

    it("returns NotFoundError for missing task", async () => {
      vi.mocked(taskRepo.findById).mockResolvedValue(null);

      const result = await service.changeStatus("missing", TaskStatus.IN_PROGRESS);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
    });
  });

  // -----------------------------------------------------------------------
  // updateTask — event emission on reassignment
  // -----------------------------------------------------------------------

  describe("updateTask", () => {
    it("emits task.assigned when assignee changes", async () => {
      const existing = makeTask({ assigneeId: "user-1" });
      const updated = makeTask({ assigneeId: "user-2" });
      vi.mocked(taskRepo.findById).mockResolvedValue(existing);
      vi.mocked(taskRepo.update).mockResolvedValue(updated);

      const result = await service.updateTask("task-1", {
        assigneeId: "user-2",
      });

      expect(result.ok).toBe(true);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "task.assigned",
          payload: expect.objectContaining({
            previousAssigneeId: "user-1",
            newAssigneeId: "user-2",
          }),
        }),
      );
    });

    it("does not emit event when assignee stays the same", async () => {
      const existing = makeTask({ assigneeId: "user-1" });
      const updated = makeTask({ assigneeId: "user-1", title: "New title" });
      vi.mocked(taskRepo.findById).mockResolvedValue(existing);
      vi.mocked(taskRepo.update).mockResolvedValue(updated);

      await service.updateTask("task-1", { title: "New title" });

      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // deleteTask
  // -----------------------------------------------------------------------

  describe("deleteTask", () => {
    it("deletes an existing task", async () => {
      vi.mocked(taskRepo.findById).mockResolvedValue(makeTask());
      vi.mocked(taskRepo.delete).mockResolvedValue(undefined);

      const result = await service.deleteTask("task-1");

      expect(result.ok).toBe(true);
      expect(taskRepo.delete).toHaveBeenCalledWith("task-1");
    });

    it("returns NotFoundError for missing task", async () => {
      vi.mocked(taskRepo.findById).mockResolvedValue(null);

      const result = await service.deleteTask("missing");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
    });
  });
});
