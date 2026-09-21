/** API: the single place where errors become HTTP responses (RFC 9457 problem details). */

import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { DomainError, type ErrorCode } from "../domain/errors.ts";

// Record<ErrorCode, number> is exhaustive: a new error code will not compile until it has a status.
const STATUS_BY_CODE: Record<ErrorCode, number> = {
  task_not_found: 404,
  invalid_transition: 409,
  wip_limit_exceeded: 409,
};

function problem(reply: FastifyReply, status: number, code: string, detail: string): FastifyReply {
  return reply
    .code(status)
    .type("application/problem+json")
    .send({ type: "about:blank", status, code, detail });
}

export function errorHandler(error: unknown, request: FastifyRequest, reply: FastifyReply): FastifyReply {
  if (error instanceof DomainError) {
    return problem(reply, STATUS_BY_CODE[error.code], error.code, error.message);
  }
  if (error instanceof ZodError) {
    const [first] = error.issues;
    return problem(reply, 400, "validation_failed", `${first?.path.join(".")}: ${first?.message}`);
  }
  request.log.error(error);
  return problem(reply, 500, "internal_error", "An unexpected error occurred.");
}
