/**
 * Pattern 3 — Service Layer (Users)
 * Pattern 4 — Dependency Injection
 */

import { injectable, inject } from "tsyringe";
import { User, CreateUserInput, UpdateUserInput } from "../domain/entities/user";
import { IUserRepository } from "../repositories/interfaces/user-repository";
import {
  Result,
  ok,
  err,
  NotFoundError,
  ConflictError,
} from "../domain/errors";
import { EventBus } from "../events/event-bus";
import { UserCreatedEvent } from "../domain/events";

@injectable()
export class UserService {
  constructor(
    @inject("IUserRepository") private readonly userRepo: IUserRepository,
    private readonly eventBus: EventBus,
  ) {}

  async getUser(id: string): Promise<Result<User, NotFoundError>> {
    const user = await this.userRepo.findById(id);
    if (!user) return err(new NotFoundError("User", id));
    return ok(user);
  }

  async listUsers(): Promise<User[]> {
    return this.userRepo.findAll();
  }

  async createUser(
    input: CreateUserInput,
  ): Promise<Result<User, ConflictError>> {
    const existing = await this.userRepo.findByEmail(input.email);
    if (existing) {
      return err(new ConflictError(`A user with email '${input.email}' already exists`));
    }

    const user = await this.userRepo.create(input);

    this.eventBus.publish<UserCreatedEvent>({
      type: "user.created",
      occurredAt: new Date().toISOString(),
      payload: { userId: user.id, email: user.email },
    });

    return ok(user);
  }

  async updateUser(
    id: string,
    input: UpdateUserInput,
  ): Promise<Result<User, NotFoundError | ConflictError>> {
    const existing = await this.userRepo.findById(id);
    if (!existing) return err(new NotFoundError("User", id));

    // If email is changing, check uniqueness
    if (input.email && input.email !== existing.email) {
      const conflict = await this.userRepo.findByEmail(input.email);
      if (conflict) {
        return err(new ConflictError(`A user with email '${input.email}' already exists`));
      }
    }

    const user = await this.userRepo.update(id, input);
    return ok(user);
  }

  async deleteUser(id: string): Promise<Result<void, NotFoundError>> {
    const existing = await this.userRepo.findById(id);
    if (!existing) return err(new NotFoundError("User", id));
    await this.userRepo.delete(id);
    return ok(undefined);
  }
}
