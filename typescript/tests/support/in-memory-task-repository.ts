/** Test support: a TaskRepository that keeps tasks in a Map. Shared by every unit test. */

import type { Status, Task } from "../../src/domain/task.ts";
import type { TaskRepository } from "../../src/repositories/task-repository.ts";

export class InMemoryTaskRepository implements TaskRepository {
  private readonly tasks = new Map<string, Task>();

  async save(task: Task): Promise<void> {
    this.tasks.set(task.id, task);
  }

  async find(taskId: string): Promise<Task | null> {
    return this.tasks.get(taskId) ?? null;
  }

  async findAll(): Promise<Task[]> {
    return [...this.tasks.values()];
  }

  async countByStatus(status: Status): Promise<number> {
    return [...this.tasks.values()].filter((task) => task.status === status).length;
  }
}
