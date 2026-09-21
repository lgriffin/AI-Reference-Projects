/** Domain: facts that other parts of the system may react to. Immutable. */

export type TaskCompleted = Readonly<{ type: "task_completed"; taskId: string; title: string }>;

export type DomainEvent = TaskCompleted;
