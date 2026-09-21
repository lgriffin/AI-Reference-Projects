"""API: the single place where errors become HTTP responses (RFC 9457 problem details)."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from taskboard.domain.errors import DomainError, InvalidTransition, TaskNotFound, WipLimitExceeded

STATUS_BY_ERROR: dict[type[DomainError], int] = {
    TaskNotFound: 404,
    InvalidTransition: 409,
    WipLimitExceeded: 409,
}


def problem(status: int, code: str, detail: str) -> JSONResponse:
    return JSONResponse(
        {"type": "about:blank", "status": status, "code": code, "detail": detail},
        status_code=status,
        media_type="application/problem+json",
    )


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    def domain_error(_: Request, error: DomainError) -> JSONResponse:
        return problem(STATUS_BY_ERROR[type(error)], error.code, str(error))

    @app.exception_handler(RequestValidationError)
    def invalid_request(_: Request, error: RequestValidationError) -> JSONResponse:
        first = error.errors()[0]
        field = ".".join(str(part) for part in first["loc"][1:])
        return problem(400, "validation_failed", f"{field}: {first['msg']}")
