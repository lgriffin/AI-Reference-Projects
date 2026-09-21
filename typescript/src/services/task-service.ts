/** Services: every use case of the board. No HTTP, no SQL, no environment. */

import { TaskNotFound, WipLimitExceeded } from "../domain/errors.ts";
import { moveTo, newTask, type Status, type Task } from "../domain/task.ts";
import type { EventBus } from "../events/event-bus.ts";
import type { TaskRepository } from "../repositories/task-repository.ts";

export class TaskService {
  private readonly tasks: TaskRepository;
  private readonly events: EventBus;
  private readonly wipLimit: number;

  constructor(tasks: TaskRepository, events: EventBus, wipLimit: number) {
    this.tasks = tasks;
    this.events = events;
    this.wipLimit = wipLimit;
  }

  async createTask(title: string): Promise<Task> {
    const task = newTask(title);
    await this.tasks.save(task);
    return task;
  }

  async getTask(taskId: string): Promise<Task> {
    const task = await this.tasks.find(taskId);
    if (task === null) throw new TaskNotFound(taskId);
    return task;
  }

  listTasks(): Promise<Task[]> {
    return this.tasks.findAll();
  }

  async moveTask(taskId: string, status: Status): Promise<Task> {
    const task = moveTo(await this.getTask(taskId), status);
    if (status === "in_progress" && (await this.boardIsFull())) {
      throw new WipLimitExceeded(this.wipLimit);
    }
    await this.tasks.save(task);
    if (status === "done") {
      await this.events.publish({ type: "task_completed", taskId: task.id, title: task.title });
    }
    return task;
  }

  private async boardIsFull(): Promise<boolean> {
    return (await this.tasks.countByStatus("in_progress")) >= this.wipLimit;
  }
}
