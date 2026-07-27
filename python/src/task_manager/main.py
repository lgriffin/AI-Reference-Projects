"""Application entry point.

Creates the FastAPI app, initialises the DI container, registers error
handlers, and includes routers.  The lifespan context manager creates
database tables on startup.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI

from task_manager.container import Container
from task_manager.presentation.error_handlers import register_error_handlers
from task_manager.presentation.routers import tasks, users
from task_manager.repositories.sqlalchemy.models import Base


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Create tables on startup; dispose engine on shutdown."""
    container: Container = app.state.container  # type: ignore[attr-defined]
    engine = container.engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


def create_app() -> FastAPI:
    """Application factory wiring all components together."""
    container = Container()

    app = FastAPI(
        title=container.config().app_name,
        lifespan=lifespan,
    )
    app.state.container = container  # type: ignore[attr-defined]

    # Pattern 6 -- error handlers
    register_error_handlers(app)

    # Pattern 1 -- routers (presentation layer)
    app.include_router(tasks.router, prefix="/api")
    app.include_router(users.router, prefix="/api")

    return app


app = create_app()
