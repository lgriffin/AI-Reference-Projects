"""Pattern 2 -- Repository Pattern (contracts).

Repository interfaces are defined as Python Protocols so that the
service layer depends on an abstraction, never on a concrete ORM
implementation.  Any class that structurally matches the protocol
satisfies the contract -- no explicit inheritance required.
"""

from __future__ import annotations

import uuid
from typing import Protocol, Sequence

from task_manager.domain.models import Task, User


class TaskRepository(Protocol):
    """Data-access contract for Task entities."""

    async def get_by_id(self, task_id: uuid.UUID) -> Task | None: ...

    async def list_all(self) -> Sequence[Task]: ...

    async def list_by_assignee(self, user_id: uuid.UUID) -> Sequence[Task]: ...

    async def create(self, task: Task) -> Task: ...

    async def update(self, task: Task) -> Task: ...

    async def delete(self, task_id: uuid.UUID) -> None: ...


class UserRepository(Protocol):
    """Data-access contract for User entities."""

    async def get_by_id(self, user_id: uuid.UUID) -> User | None: ...

    async def get_by_name(self, name: str) -> User | None: ...

    async def list_all(self) -> Sequence[User]: ...

    async def create(self, user: User) -> User: ...

    async def delete(self, user_id: uuid.UUID) -> None: ...
