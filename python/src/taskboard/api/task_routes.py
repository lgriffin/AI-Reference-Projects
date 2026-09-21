"""API: translate HTTP to service calls and back. No business rules, no try/except."""

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from taskboard.domain.task import Status, Task
from taskboard.services.task_service import TaskService

router = APIRouter(prefix="/tasks")


class CreateTask(BaseModel):
    title: str = Field(min_length=1, max_length=200)


class MoveTask(BaseModel):
    status: Status


def _service(request: Request) -> TaskService:
    service: TaskService = request.app.state.task_service  # placed there by app.py
    return service


Service = Annotated[TaskService, Depends(_service)]


@router.post("", status_code=201)
def create_task(body: CreateTask, service: Service) -> Task:
    return service.create_task(body.title)


@router.get("")
def list_tasks(service: Service) -> list[Task]:
    return service.list_tasks()


@router.get("/{task_id}")
def get_task(task_id: str, service: Service) -> Task:
    return service.get_task(task_id)


@router.post("/{task_id}/status")
def move_task(task_id: str, body: MoveTask, service: Service) -> Task:
    return service.move_task(task_id, body.status)
