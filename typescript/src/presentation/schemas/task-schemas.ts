/**
 * Zod request/response schemas for the task API.
 *
 * These live in the presentation layer because they describe HTTP
 * request shapes, not domain rules.  The service layer has its own
 * validation logic expressed through domain errors.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums (mirror domain but defined here for HTTP-level validation)
// ---------------------------------------------------------------------------

export const taskStatusSchema = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
]);

export const prioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

// ---------------------------------------------------------------------------
// Request schemas
// ---------------------------------------------------------------------------

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: prioritySchema.optional(),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  priority: prioritySchema.optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

export const taskFiltersSchema = z.object({
  status: taskStatusSchema.optional(),
  priority: prioritySchema.optional(),
  assigneeId: z.string().uuid().optional(),
});

export const changeStatusSchema = z.object({
  status: taskStatusSchema,
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Response schema (for documentation; serialisation is straightforward)
// ---------------------------------------------------------------------------

export const taskResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: taskStatusSchema,
  priority: prioritySchema,
  assigneeId: z.string().uuid().nullable(),
  dueDate: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type CreateTaskBody = z.infer<typeof createTaskSchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskSchema>;
export type ChangeStatusBody = z.infer<typeof changeStatusSchema>;
export type TaskFiltersQuery = z.infer<typeof taskFiltersSchema>;
export type IdParam = z.infer<typeof idParamSchema>;
