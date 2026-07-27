/**
 * Pattern 1 — Layered Architecture (presentation layer for users)
 */

import { FastifyInstance } from "fastify";
import { container } from "tsyringe";
import { z } from "zod";
import { UserService } from "../../services/user-service";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(100).optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

function serializeUser(user: {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function userRoutes(app: FastifyInstance): Promise<void> {
  const userService = container.resolve(UserService);

  // GET /users
  app.get("/users", async (_request, reply) => {
    const users = await userService.listUsers();
    return reply.send(users.map(serializeUser));
  });

  // GET /users/:id
  app.get("/users/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const result = await userService.getUser(id);
    if (!result.ok) throw result.error;
    return reply.send(serializeUser(result.value));
  });

  // POST /users
  app.post("/users", async (request, reply) => {
    const body = createUserSchema.parse(request.body);
    const result = await userService.createUser(body);
    if (!result.ok) throw result.error;
    return reply.status(201).send(serializeUser(result.value));
  });

  // PATCH /users/:id
  app.patch("/users/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const body = updateUserSchema.parse(request.body);
    const result = await userService.updateUser(id, body);
    if (!result.ok) throw result.error;
    return reply.send(serializeUser(result.value));
  });

  // DELETE /users/:id
  app.delete("/users/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const result = await userService.deleteUser(id);
    if (!result.ok) throw result.error;
    return reply.status(204).send();
  });
}
