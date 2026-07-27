"""Pattern 8 -- Test Scaffold (integration tests).

Integration tests exercise the SQLAlchemy repository against a real
(in-memory) SQLite database.  They verify that ORM mapping, domain
model conversion, and query logic work end-to-end.
"""

from __future__ import annotations

import uuid

import pytest

from task_manager.domain.models import Task, TaskStatus, User
from task_manager.repositories.sqlalchemy.task_repository import SQLAlchemyTaskRepository
from task_manager.repositories.sqlalchemy.user_repository import SQLAlchemyUserRepository


class TestSQLAlchemyTaskRepository:
    async def test_create_and_get(self, task_repo: SQLAlchemyTaskRepository) -> None:
        task = Task(title="Integration test task", description="Verify persistence")
        created = await task_repo.create(task)

        assert created.id == task.id
        assert created.title == "Integration test task"

        fetched = await task_repo.get_by_id(created.id)
        assert fetched is not None
        assert fetched.title == created.title

    async def test_list_all(self, task_repo: SQLAlchemyTaskRepository) -> None:
        await task_repo.create(Task(title="Task A"))
        await task_repo.create(Task(title="Task B"))

        tasks = await task_repo.list_all()
        assert len(tasks) == 2

    async def test_update(self, task_repo: SQLAlchemyTaskRepository) -> None:
        task = Task(title="Original")
        created = await task_repo.create(task)

        created.title = "Updated"
        created.status = TaskStatus.IN_PROGRESS
        updated = await task_repo.update(created)

        assert updated.title == "Updated"
        assert updated.status == TaskStatus.IN_PROGRESS

    async def test_delete(self, task_repo: SQLAlchemyTaskRepository) -> None:
        task = Task(title="To delete")
        created = await task_repo.create(task)

        await task_repo.delete(created.id)
        fetched = await task_repo.get_by_id(created.id)
        assert fetched is None

    async def test_get_nonexistent_returns_none(
        self, task_repo: SQLAlchemyTaskRepository
    ) -> None:
        result = await task_repo.get_by_id(uuid.uuid4())
        assert result is None

    async def test_list_by_assignee(
        self,
        task_repo: SQLAlchemyTaskRepository,
        user_repo: SQLAlchemyUserRepository,
    ) -> None:
        user = User(name="bob", email="bob@example.com")
        await user_repo.create(user)

        t1 = Task(title="Assigned", assignee_id=user.id)
        t2 = Task(title="Unassigned")
        await task_repo.create(t1)
        await task_repo.create(t2)

        assigned = await task_repo.list_by_assignee(user.id)
        assert len(assigned) == 1
        assert assigned[0].title == "Assigned"
