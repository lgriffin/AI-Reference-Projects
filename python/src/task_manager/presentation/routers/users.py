"""Users router -- thin presentation layer for user operations."""

from __future__ import annotations

import uuid
from typing import Sequence

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends

from task_manager.container import Container
from task_manager.presentation.schemas.task_schemas import (
    CreateUserRequest,
    UserResponse,
)
from task_manager.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", status_code=201, response_model=UserResponse)
@inject
async def create_user(
    body: CreateUserRequest,
    service: UserService = Depends(Provide[Container.user_service]),
) -> UserResponse:
    user = await service.create_user(name=body.name, email=body.email)
    return UserResponse.model_validate(user, from_attributes=True)


@router.get("", response_model=list[UserResponse])
@inject
async def list_users(
    service: UserService = Depends(Provide[Container.user_service]),
) -> Sequence[UserResponse]:
    users = await service.list_users()
    return [UserResponse.model_validate(u, from_attributes=True) for u in users]


@router.get("/{user_id}", response_model=UserResponse)
@inject
async def get_user(
    user_id: uuid.UUID,
    service: UserService = Depends(Provide[Container.user_service]),
) -> UserResponse:
    user = await service.get_user(user_id)
    return UserResponse.model_validate(user, from_attributes=True)


@router.delete("/{user_id}", status_code=204)
@inject
async def delete_user(
    user_id: uuid.UUID,
    service: UserService = Depends(Provide[Container.user_service]),
) -> None:
    await service.delete_user(user_id)
