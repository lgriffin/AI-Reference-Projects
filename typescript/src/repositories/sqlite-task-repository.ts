/** Repositories: TaskRepository on SQLite. The only module that speaks SQL. */

import { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { STATUSES, type Status, type Task } from "../domain/task.ts";
import type { TaskRepository } from "./task-repository.ts";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tasks (
  id     TEXT PRIMARY KEY,
  title  TEXT NOT NULL,
  status TEXT NOT NULL
)`;

const UPSERT = `
INSERT INTO tasks (id, title, status) VALUES (?, ?, ?)
ON CONFLICT (id) DO UPDATE SET title = excluded.title, status = excluded.status`;

const Row = z.object({ id: z.string(), title: z.string(), status: z.enum(STATUSES) });

export class SqliteTaskRepository implements TaskRepository {
  private readonly db: DatabaseSync;

  constructor(databasePath: string) {
    this.db = new DatabaseSync(databasePath);
    this.db.exec(SCHEMA);
  }

  async save(task: Task): Promise<void> {
    this.db.prepare(UPSERT).run(task.id, task.title, task.status);
  }

  async find(taskId: string): Promise<Task | null> {
    const row = this.db.prepare("SELECT id, title, status FROM tasks WHERE id = ?").get(taskId);
    return row ? Row.parse(row) : null;
  }

  async findAll(): Promise<Task[]> {
    const rows = this.db.prepare("SELECT id, title, status FROM tasks ORDER BY rowid").all();
    return rows.map((row) => Row.parse(row));
  }

  async countByStatus(status: Status): Promise<number> {
    const row = this.db.prepare("SELECT COUNT(*) AS n FROM tasks WHERE status = ?").get(status);
    return Number(row?.n);
  }
}
