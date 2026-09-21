/** Events: side effects live here, one small function per reaction. */

import type { TaskCompleted } from "../domain/events.ts";

/** Stands in for an e-mail or chat notification. */
export function announceCompletion(event: TaskCompleted): void {
  console.info(`Task completed: ${event.title} (${event.taskId})`);
}
