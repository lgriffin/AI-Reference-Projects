/**
 * Pattern 2 — Repository Pattern (interface)
 */

import { User, CreateUserInput, UpdateUserInput } from "../../domain/entities/user";

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  create(input: CreateUserInput): Promise<User>;
  update(id: string, input: UpdateUserInput): Promise<User>;
  delete(id: string): Promise<void>;
}
