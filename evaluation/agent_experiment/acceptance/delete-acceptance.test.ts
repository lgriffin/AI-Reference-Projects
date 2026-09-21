/** Hidden acceptance test for the feature request in task.md (TypeScript). Never shown to the agent. */

import type { FastifyInstance } from "fastify";
import { beforeEach, expect, test, vi } from "vitest";
import { buildApp } from "../../src/app.ts";

let app: FastifyInstance;
let output: string;

beforeEach(() => {
  output = "";
  const capture = (...parts: unknown[]) => void (output += parts.map(String).join(" ") + "\n");
  vi.spyOn(console, "info").mockImplementation(capture);
  vi.spyOn(console, "log").mockImplementation(capture);
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    output += String(chunk);
    return true;
  });
  app = buildApp({ databasePath: ":memory:", port: 0, wipLimit: 3, logLevel: "info" });
});

async function create(title: string): Promise<string> {
  return (await app.inject({ method: "POST", url: "/tasks", payload: { title } })).json().id;
}

test("deleting a task removes it", async () => {
  const taskId = await create("Doomed");
  const response = await app.inject({ method: "DELETE", url: `/tasks/${taskId}` });
  expect(response.statusCode).toBe(204);
  expect(response.body).toBe("");
  expect((await app.inject(`/tasks/${taskId}`)).statusCode).toBe(404);
});

test("a task in progress is not deleted", async () => {
  const taskId = await create("Busy");
  await app.inject({ method: "POST", url: `/tasks/${taskId}/status`, payload: { status: "in_progress" } });
  const response = await app.inject({ method: "DELETE", url: `/tasks/${taskId}` });
  expect(response.statusCode).toBe(409);
  expect(response.headers["content-type"]).toContain("application/problem+json");
  expect(response.json().code).toBe("task_in_progress");
  expect((await app.inject(`/tasks/${taskId}`)).statusCode).toBe(200);
});

test("deleting an unknown task is the usual 404", async () => {
  const response = await app.inject({ method: "DELETE", url: "/tasks/no-such-id" });
  expect(response.statusCode).toBe(404);
  expect(response.headers["content-type"]).toContain("application/problem+json");
  expect(response.json().code).toBe("task_not_found");
});

test("the team is told", async () => {
  const taskId = await create("Doomed");
  await app.inject({ method: "DELETE", url: `/tasks/${taskId}` });
  expect(output).toContain(`Task deleted: Doomed (${taskId})`);
});
