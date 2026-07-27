"""Pydantic v2 request/response schemas for the presentation layer.

These models serialise HTTP bodies and are distinct from both domain
entities and ORM models.  The separation keeps HTTP-specific concerns
(field aliasing, examples, optional-vs-required semantics for PATCH)
out of the domain.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from task_manager.domain.models import TaskStatus


# -- requests ---------------------------------------------------------------

class CreateTaskRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)


class UpdateTaskRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)


class ChangeStatusRequest(BaseModel):
    status: TaskStatus


class AssignTaskRequest(BaseModel):
    user_id: uuid.UUID


class CreateUserRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=3, max_length=255)


# -- responses --------------------------------------------------------------

class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str
    status: TaskStatus
    assignee_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    created_at: datetime


class ErrorResponse(BaseModel):
    detail: str
    error_type: str
