/** Domain: every way a request can break a business rule. No HTTP in here. */

export type ErrorCode = "task_not_found" | "invalid_transition" | "wip_limit_exceeded";

export abstract class DomainError extends Error {
  abstract readonly code: ErrorCode;
}

export class TaskNotFound extends DomainError {
  readonly code = "task_not_found";

  constructor(taskId: string) {
    super(`Task '${taskId}' does not exist.`);
  }
}

export class InvalidTransition extends DomainError {
  readonly code = "invalid_transition";

  constructor(current: string, requested: string) {
    super(`A task cannot move from '${current}' to '${requested}'.`);
  }
}

export class WipLimitExceeded extends DomainError {
  readonly code = "wip_limit_exceeded";

  constructor(limit: number) {
    super(`No more than ${limit} tasks may be in progress at once.`);
  }
}
