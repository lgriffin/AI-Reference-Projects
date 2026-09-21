"""Unit: business rules, exercised through the service with an in-memory repository."""

import pytest

from taskboard.domain.errors import InvalidTransition, TaskNotFound, WipLimitExceeded
from taskboard.domain.events import TaskCompleted
from taskboard.domain.task import Status
from taskboard.events.bus import EventBus
from taskboard.services.task_service import TaskService
from tests.support.in_memory_task_repository import InMemoryTaskRepository


@pytest.fixture
def published() -> list[TaskCompleted]:
    return []


@pytest.fixture
def service(published: list[TaskCompleted]) -> TaskService:
    events = EventBus()
    events.subscribe(TaskCompleted, published.append)
    return TaskService(InMemoryTaskRepository(), events, wip_limit=1)


def test_a_new_task_starts_in_todo(service: TaskService) -> None:
    assert service.create_task("Write the paper").status is Status.TODO


def test_completing_a_task_publishes_an_event(
    service: TaskService, published: list[TaskCompleted]
) -> None:
    task = service.create_task("Write the paper")
    service.move_task(task.id, Status.IN_PROGRESS)
    service.move_task(task.id, Status.DONE)
    assert published == [TaskCompleted(task.id, "Write the paper")]


def test_a_task_cannot_skip_a_step(service: TaskService) -> None:
    task = service.create_task("Write the paper")
    with pytest.raises(InvalidTransition):
        service.move_task(task.id, Status.DONE)


def test_the_wip_limit_is_enforced(service: TaskService) -> None:
    first, second = service.create_task("First"), service.create_task("Second")
    service.move_task(first.id, Status.IN_PROGRESS)
    with pytest.raises(WipLimitExceeded):
        service.move_task(second.id, Status.IN_PROGRESS)
    assert service.get_task(second.id).status is Status.TODO


def test_an_unknown_task_is_reported(service: TaskService) -> None:
    with pytest.raises(TaskNotFound):
        service.get_task("no-such-id")


def test_a_failing_handler_does_not_fail_the_use_case() -> None:
    def explode(_: TaskCompleted) -> None:
        raise RuntimeError("mail server is down")

    events = EventBus()
    events.subscribe(TaskCompleted, explode)
    service = TaskService(InMemoryTaskRepository(), events, wip_limit=1)
    task = service.create_task("Write the paper")
    service.move_task(task.id, Status.IN_PROGRESS)
    assert service.move_task(task.id, Status.DONE).status is Status.DONE
