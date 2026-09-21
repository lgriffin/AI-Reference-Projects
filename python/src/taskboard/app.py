"""Composition root: the only module that constructs collaborators and wires them together.

Run with:  uvicorn taskboard.app:create_app --factory
"""

import logging

from fastapi import FastAPI

from taskboard.api.error_handlers import register_error_handlers
from taskboard.api.task_routes import router
from taskboard.config import Settings
from taskboard.domain.events import TaskCompleted
from taskboard.events.bus import EventBus
from taskboard.events.handlers import announce_completion
from taskboard.repositories.sqlite_task_repository import SqliteTaskRepository
from taskboard.services.task_service import TaskService


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    logging.basicConfig(level=settings.log_level)

    events = EventBus()
    events.subscribe(TaskCompleted, announce_completion)

    tasks = SqliteTaskRepository(settings.database_path)
    service = TaskService(tasks, events, settings.wip_limit)

    app = FastAPI(title="taskboard")
    app.state.task_service = service
    app.include_router(router)
    register_error_handlers(app)
    return app
