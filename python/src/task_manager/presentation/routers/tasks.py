"""Pattern 1 -- Layered Architecture (presentation / router layer).

Routers are thin: they deserialise the request, delegate to the
service, and serialise the response.  No business logic lives here.
The service is obtained via FastAPI's Depends() which resolves through
the DI container (Pattern 4).
"""

from __future__ import annotations

import uuid
from typing import Sequence

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, Query

from task_manager.container import Container
from task_manager.presentation.schemas.task_schemas import (
    AssignTaskRequest,
    ChangeStatusRequest,
    CreateTaskRequest,
    TaskResponse,
    UpdateTaskRequest,
)
from task_manager.services.task_service import TaskService

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("", status_code=201, response_model=TaskResponse)
@inject
async def create_task(
    body: CreateTaskRequest,
    service: TaskService = Depends(Provide[Container.task_service]),
) -> TaskResponse:
    task = await service.create_task(title=body.title, description=body.description)
    return TaskResponse.model_validate(task, from_attributes=True)


@router.get("", response_model=list[TaskResponse])
@inject
async def list_tasks(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    service: TaskService = Depends(Provide[Container.task_service]),
) -> Sequence[TaskResponse]:
    tasks = await service.list_tasks(limit=limit, offset=offset)
    return [TaskResponse.model_validate(t, from_attributes=True) for t in tasks]


@router.get("/{task_id}", response_model=TaskResponse)
@inject
async def get_task(
    task_id: uuid.UUID,
    service: TaskService = Depends(Provide[Container.task_service]),
) -> TaskResponse:
    task = await service.get_task(task_id)
    return TaskResponse.model_validate(task, from_attributes=True)


@router.patch("/{task_id}", response_model=TaskResponse)
@inject
async def update_task(
    task_id: uuid.UUID,
    body: UpdateTaskRequest,
    service: TaskService = Depends(Provide[Container.task_service]),
) -> TaskResponse:
    task = await service.update_task(
        task_id, title=body.title, description=body.description
    )
    return TaskResponse.model_validate(task, from_attributes=True)


@router.post("/{task_id}/status", response_model=TaskResponse)
@inject
async def change_status(
    task_id: uuid.UUID,
    body: ChangeStatusRequest,
    service: TaskService = Depends(Provide[Container.task_service]),
) -> TaskResponse:
    task = await service.change_status(task_id, new_status=body.status)
    return TaskResponse.model_validate(task, from_attributes=True)


@router.post("/{task_id}/assign", response_model=TaskResponse)
@inject
async def assign_task(
    task_id: uuid.UUID,
    body: AssignTaskRequest,
    service: TaskService = Depends(Provide[Container.task_service]),
) -> TaskResponse:
    task = await service.assign_task(task_id, user_id=body.user_id)
    return TaskResponse.model_validate(task, from_attributes=True)


@router.delete("/{task_id}", status_code=204)
@inject
async def delete_task(
    task_id: uuid.UUID,
    service: TaskService = Depends(Provide[Container.task_service]),
) -> None:
    await service.delete_task(task_id)
