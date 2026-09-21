"""Test support: a TaskRepository that keeps tasks in a dict. Shared by every unit test."""

from taskboard.domain.task import Status, Task


class InMemoryTaskRepository:
    def __init__(self) -> None:
        self._tasks: dict[str, Task] = {}

    def save(self, task: Task) -> None:
        self._tasks[task.id] = task

    def find(self, task_id: str) -> Task | None:
        return self._tasks.get(task_id)

    def find_all(self) -> list[Task]:
        return list(self._tasks.values())

    def count_by_status(self, status: Status) -> int:
        return sum(task.status is status for task in self._tasks.values())
