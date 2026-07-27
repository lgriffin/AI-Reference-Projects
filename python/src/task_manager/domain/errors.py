"""Pattern 6 -- Structured Error Handling (domain layer).

A hierarchy of domain-specific exceptions that carry semantic meaning
without any coupling to HTTP status codes or framework types.  The
presentation layer maps these to HTTP responses via FastAPI exception
handlers (see presentation/error_handlers.py).
"""

from __future__ import annotations

import uuid


# -- base -------------------------------------------------------------------

class DomainError(Exception):
    """Root of the domain exception hierarchy."""

    def __init__(self, message: str = "A domain error occurred") -> None:
        self.message = message
        super().__init__(self.message)


# -- not-found --------------------------------------------------------------

class EntityNotFoundError(DomainError):
    """Raised when a requested entity does not exist."""

    def __init__(self, entity_type: str, entity_id: uuid.UUID) -> None:
        self.entity_type = entity_type
        self.entity_id = entity_id
        super().__init__(f"{entity_type} with id {entity_id} not found")


class TaskNotFoundError(EntityNotFoundError):
    def __init__(self, task_id: uuid.UUID) -> None:
        super().__init__("Task", task_id)


class UserNotFoundError(EntityNotFoundError):
    def __init__(self, user_id: uuid.UUID) -> None:
        super().__init__("User", user_id)


# -- conflict / validation --------------------------------------------------

class DuplicateEntityError(DomainError):
    """Raised on uniqueness-constraint violations."""

    def __init__(self, entity_type: str, field: str, value: str) -> None:
        self.entity_type = entity_type
        self.field = field
        self.value = value
        super().__init__(
            f"{entity_type} with {field}={value!r} already exists"
        )


class InvalidStateTransitionError(DomainError):
    """Raised when a task status change violates business rules."""

    def __init__(self, current: str, requested: str) -> None:
        self.current_status = current
        self.requested_status = requested
        super().__init__(
            f"Cannot transition from {current!r} to {requested!r}"
        )
