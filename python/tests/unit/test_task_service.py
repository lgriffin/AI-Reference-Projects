"""Pattern 8 -- Test Scaffold (unit tests).

Unit tests for TaskService use mock repositories so that no database
is involved.  This validates business logic in isolation.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest

from task_manager.domain.errors import (
    InvalidStateTransitionError,
    TaskNotFoundError,
    UserNotFoundError,
)
from task_manager.domain.models import Task, TaskStatus, User
from task_manager.events.bus import EventBus
from task_manager.services.task_service import TaskService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_task(**overrides) -> Task:
    defaults = dict(
        id=uuid.uuid4(),
        title="Write tests",
        description="Cover all branches",
        status=TaskStatus.PENDING,
        assignee_id=None,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    defaults.update(overrides)
    return Task(**defaults)


def _make_user(**overrides) -> User:
    defaults = dict(
        id=uuid.uuid4(),
        name="alice",
        email="alice@example.com",
        created_at=datetime.now(UTC),
    )
    defaults.update(overrides)
    return User(**defaults)


def _build_service(
    task_repo: AsyncMock | None = None,
    user_repo: AsyncMock | None = None,
    event_bus: EventBus | None = None,
) -> TaskService:
    return TaskService(
        task_repo=task_repo or AsyncMock(),
        user_repo=user_repo or AsyncMock(),
        event_bus=event_bus or EventBus(),
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestCreateTask:
    async def test_creates_and_returns_task(self) -> None:
        task = _make_task()
        repo = AsyncMock()
        repo.create.return_value = task

        service = _build_service(task_repo=repo)
        result = await service.create_task(title=task.title, description=task.description)

        assert result.title == task.title
        repo.create.assert_awaited_once()

    async def test_publishes_task_created_event(self) -> None:
        task = _make_task()
        repo = AsyncMock()
        repo.create.return_value = task
        bus = EventBus()
        handler = AsyncMock()
        from task_manager.domain.events import TaskCreatedEvent
        bus.subscribe(TaskCreatedEvent, handler)

        service = _build_service(task_repo=repo, event_bus=bus)
        await service.create_task(title=task.title)

        handler.assert_awaited_once()


class TestGetTask:
    async def test_returns_task_when_found(self) -> None:
        task = _make_task()
        repo = AsyncMock()
        repo.get_by_id.return_value = task

        service = _build_service(task_repo=repo)
        result = await service.get_task(task.id)
        assert result.id == task.id

    async def test_raises_not_found(self) -> None:
        repo = AsyncMock()
        repo.get_by_id.return_value = None

        service = _build_service(task_repo=repo)
        with pytest.raises(TaskNotFoundError):
            await service.get_task(uuid.uuid4())


class TestChangeStatus:
    async def test_valid_transition(self) -> None:
        task = _make_task(status=TaskStatus.PENDING)
        repo = AsyncMock()
        repo.get_by_id.return_value = task
        repo.update.return_value = _make_task(
            id=task.id, status=TaskStatus.IN_PROGRESS
        )

        service = _build_service(task_repo=repo)
        result = await service.change_status(task.id, TaskStatus.IN_PROGRESS)
        assert result.status == TaskStatus.IN_PROGRESS

    async def test_invalid_transition_raises(self) -> None:
        task = _make_task(status=TaskStatus.COMPLETED)
        repo = AsyncMock()
        repo.get_by_id.return_value = task

        service = _build_service(task_repo=repo)
        with pytest.raises(InvalidStateTransitionError):
            await service.change_status(task.id, TaskStatus.PENDING)


class TestAssignTask:
    async def test_assigns_to_existing_user(self) -> None:
        task = _make_task()
        user = _make_user()
        task_repo = AsyncMock()
        task_repo.get_by_id.return_value = task
        task_repo.update.return_value = _make_task(
            id=task.id, assignee_id=user.id
        )
        user_repo = AsyncMock()
        user_repo.get_by_id.return_value = user

        service = _build_service(task_repo=task_repo, user_repo=user_repo)
        result = await service.assign_task(task.id, user.id)
        assert result.assignee_id == user.id

    async def test_raises_when_user_not_found(self) -> None:
        task = _make_task()
        task_repo = AsyncMock()
        task_repo.get_by_id.return_value = task
        user_repo = AsyncMock()
        user_repo.get_by_id.return_value = None

        service = _build_service(task_repo=task_repo, user_repo=user_repo)
        with pytest.raises(UserNotFoundError):
            await service.assign_task(task.id, uuid.uuid4())
