"""Pattern 6 -- Structured Error Handling (presentation mapping).

FastAPI exception handlers translate domain errors into HTTP responses
with appropriate status codes and a consistent JSON body.  Business
logic never raises HTTPException; it raises domain errors.  The
mapping is concentrated here -- a single place to audit or extend.
"""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from task_manager.domain.errors import (
    DomainError,
    DuplicateEntityError,
    EntityNotFoundError,
    InvalidStateTransitionError,
)


def register_error_handlers(app: FastAPI) -> None:
    """Attach exception handlers to the FastAPI application."""

    @app.exception_handler(EntityNotFoundError)
    async def _not_found(request: Request, exc: EntityNotFoundError) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content={
                "detail": exc.message,
                "error_type": type(exc).__name__,
            },
        )

    @app.exception_handler(DuplicateEntityError)
    async def _conflict(request: Request, exc: DuplicateEntityError) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content={
                "detail": exc.message,
                "error_type": "DuplicateEntityError",
            },
        )

    @app.exception_handler(InvalidStateTransitionError)
    async def _bad_transition(
        request: Request, exc: InvalidStateTransitionError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "detail": exc.message,
                "error_type": "InvalidStateTransitionError",
            },
        )

    @app.exception_handler(DomainError)
    async def _domain_fallback(request: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse(
            status_code=400,
            content={
                "detail": exc.message,
                "error_type": type(exc).__name__,
            },
        )
