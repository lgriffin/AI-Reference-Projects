/** Repositories: the complete list of data operations the application may perform. */

import type { Status, Task } from "../domain/task.ts";

export interface TaskRepository {
  save(task: Task): Promise<void>;
  find(taskId: string): Promise<Task | null>;
  findAll(): Promise<Task[]>;
  countByStatus(status: Status): Promise<number>;
}
