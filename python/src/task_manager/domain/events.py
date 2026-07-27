"""Pattern 7 -- Event-Driven Communication (event definitions).

Domain events are simple, immutable data objects that describe
something that *has happened* in the domain.  They carry no behaviour
and no framework dependencies.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime

from task_manager.domain.models import TaskStatus


@dataclass(frozen=True)
class DomainEvent:
    """Base class for all domain events."""

    occurred_at: datetime = field(default_factory=lambda: datetime.now(UTC))


@dataclass(frozen=True)
class TaskCreatedEvent(DomainEvent):
    task_id: uuid.UUID = field(default_factory=uuid.uuid4)
    title: str = ""


@dataclass(frozen=True)
class TaskAssignedEvent(DomainEvent):
    task_id: uuid.UUID = field(default_factory=uuid.uuid4)
    assignee_id: uuid.UUID = field(default_factory=uuid.uuid4)


@dataclass(frozen=True)
class TaskStatusChangedEvent(DomainEvent):
    task_id: uuid.UUID = field(default_factory=uuid.uuid4)
    old_status: TaskStatus = TaskStatus.PENDING
    new_status: TaskStatus = TaskStatus.PENDING


@dataclass(frozen=True)
class TaskCompletedEvent(DomainEvent):
    task_id: uuid.UUID = field(default_factory=uuid.uuid4)
    title: str = ""
