/** Integration: one contract, run against every TaskRepository, so the test double stays honest. */

import { describe, expect, test } from "vitest";
import { moveTo, newTask } from "../../src/domain/task.ts";
import { SqliteTaskRepository } from "../../src/repositories/sqlite-task-repository.ts";
import type { TaskRepository } from "../../src/repositories/task-repository.ts";
import { InMemoryTaskRepository } from "../support/in-memory-task-repository.ts";

const implementations: [string, () => TaskRepository][] = [
  ["in memory", () => new InMemoryTaskRepository()],
  ["sqlite", () => new SqliteTaskRepository(":memory:")],
];

describe.each(implementations)("TaskRepository (%s)", (_, create) => {
  test("a saved task can be found", async () => {
    const repository = create();
    const task = newTask("Write the paper");
    await repository.save(task);
    expect(await repository.find(task.id)).toEqual(task);
  });

  test("a missing task is null", async () => {
    expect(await create().find("no-such-id")).toBeNull();
  });

  test("saving again updates in place", async () => {
    const repository = create();
    const task = newTask("Write the paper");
    await repository.save(task);
    await repository.save(moveTo(task, "in_progress"));
    expect((await repository.findAll()).map((t) => t.status)).toEqual(["in_progress"]);
  });

  test("tasks are listed in creation order", async () => {
    const repository = create();
    const titles = ["Write", "Review", "Publish"]; // creation order differs from every sort order
    for (const title of titles) await repository.save(newTask(title));
    expect((await repository.findAll()).map((task) => task.title)).toEqual(titles);
  });

  test("tasks are counted by status", async () => {
    const repository = create();
    await repository.save(newTask("Waiting"));
    await repository.save(moveTo(newTask("Started"), "in_progress"));
    expect(await repository.countByStatus("in_progress")).toBe(1);
  });
});
