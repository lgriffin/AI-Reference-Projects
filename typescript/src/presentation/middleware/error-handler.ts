/**
 * Pattern 6 — Structured Error Handling (presentation boundary)
 *
 * This Fastify error handler is the single place where domain errors
 * are translated to HTTP responses.  Services throw or return domain
 * errors; this handler decides the status code and response shape.
 */

import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import {
  DomainError,
  NotFoundError,
  ValidationError,
  ConflictError,
  InvalidOperationError,
} from "../../domain/errors";

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function errorHandler(
  error: FastifyError | Error,
  _request: FastifyRequest,
  reply: FastifyReply,
): void {
  // --- Zod validation errors (from request parsing) --------------------
  if (error instanceof ZodError) {
    const response: ErrorResponse = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: error.flatten().fieldErrors,
      },
    };
    void reply.status(400).send(response);
    return;
  }

  // --- Domain errors ---------------------------------------------------
  if (error instanceof DomainError) {
    const statusMap: Record<string, number> = {
      NOT_FOUND: 404,
      VALIDATION_ERROR: 422,
      CONFLICT: 409,
      INVALID_OPERATION: 422,
    };
    const status = statusMap[error.code] ?? 500;

    const response: ErrorResponse = {
      error: {
        code: error.code,
        message: error.message,
      },
    };

    // Attach extra context for specific error types
    if (error instanceof NotFoundError) {
      (response.error as Record<string, unknown>)["entity"] = error.entity;
      (response.error as Record<string, unknown>)["entityId"] = error.entityId;
    }
    if (error instanceof ValidationError) {
      (response.error as Record<string, unknown>)["field"] = error.field;
      (response.error as Record<string, unknown>)["reason"] = error.reason;
    }

    void reply.status(status).send(response);
    return;
  }

  // --- Fastify-level errors (e.g. 404 for unknown routes) ---------------
  if ("statusCode" in error && typeof error.statusCode === "number") {
    const response: ErrorResponse = {
      error: {
        code: "HTTP_ERROR",
        message: error.message,
      },
    };
    void reply.status(error.statusCode).send(response);
    return;
  }

  // --- Unexpected errors ------------------------------------------------
  console.error("Unhandled error:", error);
  const response: ErrorResponse = {
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    },
  };
  void reply.status(500).send(response);
}
