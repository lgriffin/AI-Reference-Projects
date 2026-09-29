/** Unit: business rules, exercised through the service with an in-memory repository. */

import { beforeEach, expect, test, vi } from "vitest";
import { InvalidTransition, TaskNotFound, WipLimitExceeded } from "../../src/domain/errors.ts";
import type { TaskCompleted } from "../../src/domain/events.ts";
import { EventBus } from "../../src/events/event-bus.ts";
import { TaskService } from "../../src/services/task-service.ts";
import { InMemoryTaskRepository } from "../support/in-memory-task-repository.ts";

let published: TaskCompleted[];
let events: EventBus;
let service: TaskService;

beforeEach(() => {
  published = [];
  events = new EventBus();
  events.subscribe("task_completed", (event) => void published.push(event));
  service = new TaskService(new InMemoryTaskRepository(), events, 1);
});

test("R-FLOW-1: given no tasks, when a task is created, then it starts in todo", async () => {
  expect((await service.createTask("Write the paper")).status).toBe("todo");
});

test("R-DONE-1: given a task in progress, when it is completed, then TaskCompleted is published", async () => {
  const task = await service.createTask("Write the paper");
  await service.moveTask(task.id, "in_progress");
  await service.moveTask(task.id, "done");
  expect(published).toEqual([{ type: "task_completed", taskId: task.id, title: "Write the paper" }]);
});

test("R-FLOW-2: given a task in todo, when it is moved to done, then the move is refused", async () => {
  const task = await service.createTask("Write the paper");
  await expect(service.moveTask(task.id, "done")).rejects.toThrow(InvalidTransition);
});

test("R-WIP-1: given a full board, when another task is started, then it is refused and stays in todo", async () => {
  const first = await service.createTask("First");
  const second = await service.createTask("Second");
  await service.moveTask(first.id, "in_progress");
  await expect(service.moveTask(second.id, "in_progress")).rejects.toThrow(WipLimitExceeded);
  expect((await service.getTask(second.id)).status).toBe("todo");
});

test("R-FIND-1: given no such task, when it is requested, then task_not_found is raised", async () => {
  await expect(service.getTask("no-such-id")).rejects.toThrow(TaskNotFound);
});

test("R-DONE-2: given a failing announcer, when a task is completed, then it is still done and the failure is logged", async () => {
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});
  events.subscribe("task_completed", () => {
    throw new Error("mail server is down");
  });
  const task = await service.createTask("Write the paper");
  await service.moveTask(task.id, "in_progress");
  expect((await service.moveTask(task.id, "done")).status).toBe("done");
  expect(logged).toHaveBeenCalledOnce();
});
