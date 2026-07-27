"""Pattern 2 -- Repository Pattern (SQLAlchemy implementation for Users)."""

from __future__ import annotations

import uuid
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from task_manager.domain.models import User
from task_manager.repositories.sqlalchemy.models import UserRow


class SQLAlchemyUserRepository:
    """User repository backed by SQLAlchemy 2.0 async sessions."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # -- mapping helpers ----------------------------------------------------

    @staticmethod
    def _to_domain(row: UserRow) -> User:
        return User(
            id=row.id,
            name=row.name,
            email=row.email,
            created_at=row.created_at,
        )

    @staticmethod
    def _to_row(user: User) -> UserRow:
        return UserRow(
            id=user.id,
            name=user.name,
            email=user.email,
            created_at=user.created_at,
        )

    # -- repository interface -----------------------------------------------

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        row = await self._session.get(UserRow, user_id)
        return self._to_domain(row) if row else None

    async def get_by_name(self, name: str) -> User | None:
        stmt = select(UserRow).where(UserRow.name == name)
        result = await self._session.execute(stmt)
        row = result.scalar_one_or_none()
        return self._to_domain(row) if row else None

    async def list_all(self) -> Sequence[User]:
        result = await self._session.execute(select(UserRow))
        return [self._to_domain(r) for r in result.scalars().all()]

    async def create(self, user: User) -> User:
        row = self._to_row(user)
        self._session.add(row)
        await self._session.commit()
        await self._session.refresh(row)
        return self._to_domain(row)

    async def delete(self, user_id: uuid.UUID) -> None:
        row = await self._session.get(UserRow, user_id)
        if row is not None:
            await self._session.delete(row)
            await self._session.commit()
