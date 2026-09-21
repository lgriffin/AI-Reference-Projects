"""Integration: one contract, run against every TaskRepository, so the test double stays honest."""

from pathlib import Path

import pytest

from taskboard.domain.task import Status, Task
from taskboard.repositories.sqlite_task_repository import SqliteTaskRepository
from taskboard.repositories.task_repository import TaskRepository
from tests.support.in_memory_task_repository import InMemoryTaskRepository


@pytest.fixture(params=["in_memory", "sqlite"])
def repository(request: pytest.FixtureRequest, tmp_path: Path) -> TaskRepository:
    if request.param == "sqlite":
        return SqliteTaskRepository(str(tmp_path / "test.db"))
    return InMemoryTaskRepository()


def test_a_saved_task_can_be_found(repository: TaskRepository) -> None:
    task = Task.new("Write the paper")
    repository.save(task)
    assert repository.find(task.id) == task


def test_a_missing_task_is_none(repository: TaskRepository) -> None:
    assert repository.find("no-such-id") is None


def test_saving_again_updates_in_place(repository: TaskRepository) -> None:
    task = Task.new("Write the paper")
    repository.save(task)
    repository.save(task.move_to(Status.IN_PROGRESS))
    assert [t.status for t in repository.find_all()] == [Status.IN_PROGRESS]


def test_tasks_are_listed_in_creation_order(repository: TaskRepository) -> None:
    titles = ["Write", "Review", "Publish"]  # creation order differs from every sort order
    for title in titles:
        repository.save(Task.new(title))
    assert [task.title for task in repository.find_all()] == titles


def test_tasks_are_counted_by_status(repository: TaskRepository) -> None:
    repository.save(Task.new("Waiting"))
    repository.save(Task.new("Started").move_to(Status.IN_PROGRESS))
    assert repository.count_by_status(Status.IN_PROGRESS) == 1
