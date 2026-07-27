"""Pattern 7 -- Event-Driven Communication (handlers).

Concrete handlers that react to domain events.  In a production
system these might send emails, update read-models, or push
WebSocket messages.  Here they simply log -- the structural pattern
is the point.
"""

from __future__ import annotations

import logging

from task_manager.domain.events import (
    TaskAssignedEvent,
    TaskCompletedEvent,
    TaskCreatedEvent,
    TaskStatusChangedEvent,
)

logger = logging.getLogger(__name__)


async def on_task_created(event: TaskCreatedEvent) -> None:
    logger.info("EVENT  TaskCreated -- id=%s title=%r", event.task_id, event.title)


async def on_task_assigned(event: TaskAssignedEvent) -> None:
    logger.info(
        "EVENT  TaskAssigned -- task=%s assignee=%s",
        event.task_id,
        event.assignee_id,
    )


async def on_task_status_changed(event: TaskStatusChangedEvent) -> None:
    logger.info(
        "EVENT  TaskStatusChanged -- task=%s %s -> %s",
        event.task_id,
        event.old_status.value,
        event.new_status.value,
    )


async def on_task_completed(event: TaskCompletedEvent) -> None:
    logger.info(
        "EVENT  TaskCompleted -- id=%s title=%r",
        event.task_id,
        event.title,
    )


def register_all(bus: "EventBus") -> None:  # noqa: F821 -- forward ref
    """Wire every handler to the bus.  Called once at startup."""
    from task_manager.events.bus import EventBus as _Bus  # deferred to avoid circular

    assert isinstance(bus, _Bus)
    bus.subscribe(TaskCreatedEvent, on_task_created)
    bus.subscribe(TaskAssignedEvent, on_task_assigned)
    bus.subscribe(TaskStatusChangedEvent, on_task_status_changed)
    bus.subscribe(TaskCompletedEvent, on_task_completed)
