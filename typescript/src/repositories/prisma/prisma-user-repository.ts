/**
 * Pattern 2 — Repository Pattern (Prisma implementation for Users)
 */

import { PrismaClient, User as PrismaUser } from "@prisma/client";
import { injectable, inject } from "tsyringe";
import { User, CreateUserInput, UpdateUserInput } from "../../domain/entities/user";
import { IUserRepository } from "../interfaces/user-repository";

function toDomain(record: PrismaUser): User {
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

@injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(@inject("PrismaClient") private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { email } });
    return record ? toDomain(record) : null;
  }

  async findAll(): Promise<User[]> {
    const records = await this.prisma.user.findMany({ orderBy: { createdAt: "desc" } });
    return records.map(toDomain);
  }

  async create(input: CreateUserInput): Promise<User> {
    const record = await this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
      },
    });
    return toDomain(record);
  }

  async update(id: string, input: UpdateUserInput): Promise<User> {
    const record = await this.prisma.user.update({
      where: { id },
      data: {
        ...(input.email !== undefined && { email: input.email }),
        ...(input.name !== undefined && { name: input.name }),
      },
    });
    return toDomain(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
