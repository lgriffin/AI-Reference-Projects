"""Repositories: the complete list of data operations the application may perform."""

from typing import Protocol

from taskboard.domain.task import Status, Task


class TaskRepository(Protocol):
    def save(self, task: Task) -> None: ...

    def find(self, task_id: str) -> Task | None: ...

    def find_all(self) -> list[Task]: ...

    def count_by_status(self, status: Status) -> int: ...
