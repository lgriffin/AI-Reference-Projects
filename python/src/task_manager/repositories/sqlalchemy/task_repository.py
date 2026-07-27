"""Pattern 2 -- Repository Pattern (SQLAlchemy implementation for Tasks).

This concrete repository translates between SQLAlchemy ORM rows and
the domain Task dataclass.  Callers never see ORM objects; they work
exclusively with domain models.
"""

from __future__ import annotations

import uuid
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from task_manager.domain.models import Task, TaskStatus
from task_manager.repositories.sqlalchemy.models import TaskRow


class SQLAlchemyTaskRepository:
    """Task repository backed by SQLAlchemy 2.0 async sessions."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # -- mapping helpers ----------------------------------------------------

    @staticmethod
    def _to_domain(row: TaskRow) -> Task:
        return Task(
            id=row.id,
            title=row.title,
            description=row.description,
            status=TaskStatus(row.status),
            assignee_id=row.assignee_id,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    @staticmethod
    def _to_row(task: Task) -> TaskRow:
        return TaskRow(
            id=task.id,
            title=task.title,
            description=task.description,
            status=task.status.value,
            assignee_id=task.assignee_id,
            created_at=task.created_at,
            updated_at=task.updated_at,
        )

    # -- repository interface -----------------------------------------------

    async def get_by_id(self, task_id: uuid.UUID) -> Task | None:
        row = await self._session.get(TaskRow, task_id)
        return self._to_domain(row) if row else None

    async def list_all(self) -> Sequence[Task]:
        result = await self._session.execute(select(TaskRow))
        return [self._to_domain(r) for r in result.scalars().all()]

    async def list_by_assignee(self, user_id: uuid.UUID) -> Sequence[Task]:
        stmt = select(TaskRow).where(TaskRow.assignee_id == user_id)
        result = await self._session.execute(stmt)
        return [self._to_domain(r) for r in result.scalars().all()]

    async def create(self, task: Task) -> Task:
        row = self._to_row(task)
        self._session.add(row)
        await self._session.commit()
        await self._session.refresh(row)
        return self._to_domain(row)

    async def update(self, task: Task) -> Task:
        row = await self._session.get(TaskRow, task.id)
        if row is None:
            raise ValueError(f"TaskRow {task.id} not found for update")
        row.title = task.title
        row.description = task.description
        row.status = task.status.value
        row.assignee_id = task.assignee_id
        row.updated_at = task.updated_at
        await self._session.commit()
        await self._session.refresh(row)
        return self._to_domain(row)

    async def delete(self, task_id: uuid.UUID) -> None:
        row = await self._session.get(TaskRow, task_id)
        if row is not None:
            await self._session.delete(row)
            await self._session.commit()
