/**
 * Pattern 6 — Structured Error Handling
 *
 * Domain errors form a typed hierarchy.  Services never throw raw Error
 * objects; they return or throw one of these domain-specific error types.
 * The presentation layer's error-handler middleware maps each error type
 * to the appropriate HTTP status code and response shape.
 *
 * The Result<T> type provides a monadic alternative to exceptions for
 * operations where failure is a normal outcome (e.g. validation).
 */

// ---------------------------------------------------------------------------
// Result type — functional error handling
// ---------------------------------------------------------------------------

export type Result<T, E = DomainError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// ---------------------------------------------------------------------------
// Domain error hierarchy
// ---------------------------------------------------------------------------

export abstract class DomainError extends Error {
  abstract readonly code: string;

  protected constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Restore prototype chain broken by extending builtins in TS
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends DomainError {
  readonly code = "NOT_FOUND";

  constructor(
    public readonly entity: string,
    public readonly entityId: string,
  ) {
    super(`${entity} with id '${entityId}' not found`);
  }
}

export class ValidationError extends DomainError {
  readonly code = "VALIDATION_ERROR";

  constructor(
    public readonly field: string,
    public readonly reason: string,
  ) {
    super(`Validation failed on '${field}': ${reason}`);
  }
}

export class ConflictError extends DomainError {
  readonly code = "CONFLICT";

  constructor(message: string) {
    super(message);
  }
}

export class InvalidOperationError extends DomainError {
  readonly code = "INVALID_OPERATION";

  constructor(message: string) {
    super(message);
  }
}
