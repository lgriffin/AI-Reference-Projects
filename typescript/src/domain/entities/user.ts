/**
 * User domain entity.
 *
 * Kept intentionally simple — the focus of this reference implementation
 * is on architectural patterns, not a full user-management system.
 */

export interface User {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  name: string;
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
}
