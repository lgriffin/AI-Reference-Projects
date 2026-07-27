"""Domain entities.

These are plain dataclasses -- they carry no ORM metadata, no HTTP
schema logic, and no framework coupling.  They represent the core
vocabulary of the Task Management domain and flow freely between
layers.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum


class TaskStatus(str, Enum):
    """Lifecycle states of a Task."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


@dataclass
class User:
    """A person who can be assigned tasks."""

    id: uuid.UUID = field(default_factory=uuid.uuid4)
    name: str = ""
    email: str = ""
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))


@dataclass
class Task:
    """A unit of work that may be assigned to a User."""

    id: uuid.UUID = field(default_factory=uuid.uuid4)
    title: str = ""
    description: str = ""
    status: TaskStatus = TaskStatus.PENDING
    assignee_id: uuid.UUID | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = field(default_factory=lambda: datetime.now(UTC))
