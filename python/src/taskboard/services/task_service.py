"""Services: every use case of the board. No HTTP, no SQL, no environment."""

from taskboard.domain.errors import TaskNotFound, WipLimitExceeded
from taskboard.domain.events import TaskCompleted
from taskboard.domain.task import Status, Task
from taskboard.events.bus import EventBus
from taskboard.repositories.task_repository import TaskRepository


class TaskService:
    def __init__(self, tasks: TaskRepository, events: EventBus, wip_limit: int) -> None:
        self._tasks = tasks
        self._events = events
        self._wip_limit = wip_limit

    def create_task(self, title: str) -> Task:
        task = Task.new(title)
        self._tasks.save(task)
        return task

    def get_task(self, task_id: str) -> Task:
        task = self._tasks.find(task_id)
        if task is None:
            raise TaskNotFound(task_id)
        return task

    def list_tasks(self) -> list[Task]:
        return self._tasks.find_all()

    def move_task(self, task_id: str, status: Status) -> Task:
        task = self.get_task(task_id).move_to(status)
        if status is Status.IN_PROGRESS and self._board_is_full():
            raise WipLimitExceeded(self._wip_limit)
        self._tasks.save(task)
        if status is Status.DONE:
            self._events.publish(TaskCompleted(task.id, task.title))
        return task

    def _board_is_full(self) -> bool:
        return self._tasks.count_by_status(Status.IN_PROGRESS) >= self._wip_limit
