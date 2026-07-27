"""Shared test fixtures.

Pattern 8 -- Test Scaffold.  Fixtures provide:
  - An in-memory SQLite engine for integration tests.
  - A fully wired FastAPI TestClient for API tests.
  - A clean database per test function (tables are dropped/recreated).
"""

from __future__ import annotations

from typing import AsyncIterator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from task_manager.events.bus import EventBus
from task_manager.events.handlers import register_all
from task_manager.repositories.sqlalchemy.models import Base
from task_manager.repositories.sqlalchemy.task_repository import SQLAlchemyTaskRepository
from task_manager.repositories.sqlalchemy.user_repository import SQLAlchemyUserRepository


# ---------------------------------------------------------------------------
# Database fixtures (integration / API tests)
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def async_engine():
    engine = create_async_engine("sqlite+aiosqlite://", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def async_session(async_engine) -> AsyncIterator[AsyncSession]:
    session_factory = async_sessionmaker(
        bind=async_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with session_factory() as session:
        yield session


# ---------------------------------------------------------------------------
# Repository fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def task_repo(async_session: AsyncSession) -> SQLAlchemyTaskRepository:
    return SQLAlchemyTaskRepository(async_session)


@pytest_asyncio.fixture
async def user_repo(async_session: AsyncSession) -> SQLAlchemyUserRepository:
    return SQLAlchemyUserRepository(async_session)


# ---------------------------------------------------------------------------
# Event bus fixture
# ---------------------------------------------------------------------------

@pytest.fixture
def event_bus() -> EventBus:
    bus = EventBus()
    register_all(bus)
    return bus


# ---------------------------------------------------------------------------
# API test client
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def api_client(async_engine) -> AsyncIterator[AsyncClient]:
    """Build a TestClient backed by the in-memory database.

    We override the DI container providers so that the app uses the
    test engine and session factory rather than its own.
    """
    from contextlib import asynccontextmanager

    from dependency_injector import providers

    from task_manager.container import Container

    session_factory = async_sessionmaker(
        bind=async_engine, class_=AsyncSession, expire_on_commit=False
    )

    # Build a patched app whose lifespan skips table creation (already done).
    @asynccontextmanager
    async def _noop_lifespan(app):
        yield

    from fastapi import FastAPI

    from task_manager.presentation.error_handlers import register_error_handlers
    from task_manager.presentation.routers import tasks, users

    container = Container()
    container.engine.override(providers.Object(async_engine))
    container.session_factory.override(providers.Object(session_factory))
    container.session.override(
        providers.Factory(lambda sf: sf(), sf=session_factory)
    )

    app = FastAPI(title="test", lifespan=_noop_lifespan)
    app.state.container = container  # type: ignore[attr-defined]
    register_error_handlers(app)
    app.include_router(tasks.router, prefix="/api")
    app.include_router(users.router, prefix="/api")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
