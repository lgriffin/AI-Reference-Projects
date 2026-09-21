/** Domain: a task, and the rule for how its status may change. Pure; no I/O. */

import { randomUUID } from "node:crypto";
import { InvalidTransition } from "./errors.ts";

export const STATUSES = ["todo", "in_progress", "done"] as const;
export type Status = (typeof STATUSES)[number];

export const TRANSITIONS: Record<Status, readonly Status[]> = {
  todo: ["in_progress"],
  in_progress: ["todo", "done"],
  done: [],
};

export type Task = Readonly<{ id: string; title: string; status: Status }>;

export function newTask(title: string): Task {
  return { id: randomUUID(), title, status: "todo" };
}

export function moveTo(task: Task, status: Status): Task {
  if (!TRANSITIONS[task.status].includes(status)) {
    throw new InvalidTransition(task.status, status);
  }
  return { ...task, status };
}
