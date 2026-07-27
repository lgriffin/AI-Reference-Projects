"""Pattern 3 -- Service Layer (task operations).

The service encapsulates all business logic for tasks.  It depends on
repository *interfaces* (Pattern 2) and the event bus (Pattern 7),
both injected via constructor (Pattern 4).  It never touches HTTP
artefacts -- no Request, Response, or status-code constants.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Sequence

from task_manager.domain.errors import (
    InvalidStateTransitionError,
    TaskNotFoundError,
    UserNotFoundError,
)
from task_manager.domain.events import (
    TaskAssignedEvent,
    TaskCompletedEvent,
    TaskCreatedEvent,
    TaskStatusChangedEvent,
)
from task_manager.domain.models import Task, TaskStatus
from task_manager.events.bus import EventBus
from task_manager.repositories.interfaces import TaskRepository, UserRepository


# Valid status transitions (business rule)
_ALLOWED_TRANSITIONS: dict[TaskStatus, set[TaskStatus]] = {
    TaskStatus.PENDING: {TaskStatus.IN_PROGRESS},
    TaskStatus.IN_PROGRESS: {TaskStatus.COMPLETED, TaskStatus.PENDING},
    TaskStatus.COMPLETED: set(),
}


class TaskService:
    """Business logic for task management."""

    def __init__(
        self,
        task_repo: TaskRepository,
        user_repo: UserRepository,
        event_bus: EventBus,
    ) -> None:
        self._task_repo = task_repo
        self._user_repo = user_repo
        self._event_bus = event_bus

    async def create_task(self, title: str, description: str = "") -> Task:
        task = Task(title=title, description=description)
        created = await self._task_repo.create(task)
        await self._event_bus.publish(
            TaskCreatedEvent(task_id=created.id, title=created.title)
        )
        return created

    async def get_task(self, task_id: uuid.UUID) -> Task:
        task = await self._task_repo.get_by_id(task_id)
        if task is None:
            raise TaskNotFoundError(task_id)
        return task

    async def list_tasks(self, *, limit: int = 20, offset: int = 0) -> Sequence[Task]:
        return await self._task_repo.list_all(limit=limit, offset=offset)

    async def update_task(
        self,
        task_id: uuid.UUID,
        title: str | None = None,
        description: str | None = None,
    ) -> Task:
        task = await self.get_task(task_id)
        if title is not None:
            task.title = title
        if description is not None:
            task.description = description
        task.updated_at = datetime.now(UTC)
        return await self._task_repo.update(task)

    async def change_status(self, task_id: uuid.UUID, new_status: TaskStatus) -> Task:
        task = await self.get_task(task_id)
        old_status = task.status

        if new_status not in _ALLOWED_TRANSITIONS.get(old_status, set()):
            raise InvalidStateTransitionError(old_status.value, new_status.value)

        task.status = new_status
        task.updated_at = datetime.now(UTC)
        updated = await self._task_repo.update(task)

        await self._event_bus.publish(
            TaskStatusChangedEvent(
                task_id=updated.id,
                old_status=old_status,
                new_status=new_status,
            )
        )

        if new_status == TaskStatus.COMPLETED:
            await self._event_bus.publish(
                TaskCompletedEvent(task_id=updated.id, title=updated.title)
            )

        return updated

    async def assign_task(self, task_id: uuid.UUID, user_id: uuid.UUID) -> Task:
        task = await self.get_task(task_id)

        user = await self._user_repo.get_by_id(user_id)
        if user is None:
            raise UserNotFoundError(user_id)

        task.assignee_id = user_id
        task.updated_at = datetime.now(UTC)
        updated = await self._task_repo.update(task)

        await self._event_bus.publish(
            TaskAssignedEvent(task_id=updated.id, assignee_id=user_id)
        )
        return updated

    async def delete_task(self, task_id: uuid.UUID) -> None:
        await self.get_task(task_id)  # ensure it exists
        await self._task_repo.delete(task_id)
