/** API: the whole stack over HTTP, wired by the real composition root. */

import type { FastifyInstance } from "fastify";
import { beforeEach, expect, test, vi } from "vitest";
import { buildApp } from "../../src/app.ts";

let app: FastifyInstance;

beforeEach(() => {
  app = buildApp({ databasePath: ":memory:", port: 0, wipLimit: 1, logLevel: "error" });
});

async function create(title: string): Promise<string> {
  const response = await app.inject({ method: "POST", url: "/tasks", payload: { title } });
  expect(response.statusCode).toBe(201);
  return response.json().id;
}

function move(taskId: string, status: string) {
  return app.inject({ method: "POST", url: `/tasks/${taskId}/status`, payload: { status } });
}

test("a task moves across the board", async () => {
  const announced = vi.spyOn(console, "info").mockImplementation(() => {});
  const taskId = await create("Write the paper");
  await move(taskId, "in_progress");
  await move(taskId, "done");

  const expected = { id: taskId, title: "Write the paper", status: "done" };
  expect((await app.inject(`/tasks/${taskId}`)).json()).toEqual(expected);
  expect((await app.inject("/tasks")).json()).toEqual([expected]);
  expect(announced).toHaveBeenCalledWith(expect.stringContaining("Task completed: Write the paper"));
});

test("every failure is a problem document", async () => {
  const started = await create("Started");
  const waiting = await create("Waiting");
  await move(started, "in_progress");

  const failures = {
    task_not_found: [404, await app.inject("/tasks/no-such-id")],
    invalid_transition: [409, await move(waiting, "done")],
    wip_limit_exceeded: [409, await move(waiting, "in_progress")],
    validation_failed: [400, await app.inject({ method: "POST", url: "/tasks", payload: { title: "" } })],
  } as const;

  for (const [code, [status, response]] of Object.entries(failures)) {
    expect(response.statusCode).toBe(status);
    expect(response.headers["content-type"]).toContain("application/problem+json");
    expect(response.json().code).toBe(code);
  }
});
