"""Pattern 3 -- Service Layer (user operations)."""

from __future__ import annotations

import uuid
from typing import Sequence

from task_manager.domain.errors import DuplicateEntityError, UserNotFoundError
from task_manager.domain.models import User
from task_manager.repositories.interfaces import UserRepository


class UserService:
    """Business logic for user management."""

    def __init__(self, user_repo: UserRepository) -> None:
        self._user_repo = user_repo

    async def create_user(self, name: str, email: str) -> User:
        existing = await self._user_repo.get_by_name(name)
        if existing is not None:
            raise DuplicateEntityError("User", "name", name)
        user = User(name=name, email=email)
        return await self._user_repo.create(user)

    async def get_user(self, user_id: uuid.UUID) -> User:
        user = await self._user_repo.get_by_id(user_id)
        if user is None:
            raise UserNotFoundError(user_id)
        return user

    async def list_users(self) -> Sequence[User]:
        return await self._user_repo.list_all()

    async def delete_user(self, user_id: uuid.UUID) -> None:
        await self.get_user(user_id)  # ensure exists
        await self._user_repo.delete(user_id)
