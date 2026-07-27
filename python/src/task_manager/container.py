"""Pattern 4 -- Dependency Injection (container).

The DI container is the single place where concrete implementations
are bound to abstract contracts.  Services declare *what* they need
via constructor parameters; the container decides *which* concrete
class fulfils each dependency.  Swapping an implementation (e.g.
replacing SQLAlchemy with an in-memory repo for tests) means changing
one line here -- no service code is touched.

dependency-injector uses providers that are lazily evaluated.  The
container is wired to FastAPI modules so that ``Depends(Provide[...])``
resolves at request time.
"""

from __future__ import annotations

from dependency_injector import containers, providers
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from task_manager.config import Settings
from task_manager.events.bus import EventBus
from task_manager.events.handlers import register_all
from task_manager.repositories.sqlalchemy.task_repository import SQLAlchemyTaskRepository
from task_manager.repositories.sqlalchemy.user_repository import SQLAlchemyUserRepository
from task_manager.services.task_service import TaskService
from task_manager.services.user_service import UserService


def _create_event_bus() -> EventBus:
    bus = EventBus()
    register_all(bus)
    return bus


class Container(containers.DeclarativeContainer):
    """Application-wide dependency injection container."""

    # Wiring: list of modules whose @inject decorators should be resolved.
    wiring_config = containers.WiringConfiguration(
        modules=[
            "task_manager.presentation.routers.tasks",
            "task_manager.presentation.routers.users",
        ]
    )

    # -- configuration ------------------------------------------------------
    config = providers.Singleton(Settings)

    # -- infrastructure -----------------------------------------------------
    engine = providers.Singleton(
        create_async_engine,
        url=config.provided.database_url,
        echo=config.provided.app_debug,
    )

    session_factory = providers.Singleton(
        async_sessionmaker,
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    session = providers.Factory(
        lambda sf: sf(),          # call the sessionmaker to get a session
        sf=session_factory,
    )

    # -- event bus ----------------------------------------------------------
    event_bus = providers.Singleton(_create_event_bus)

    # -- repositories -------------------------------------------------------
    task_repository = providers.Factory(
        SQLAlchemyTaskRepository,
        session=session,
    )

    user_repository = providers.Factory(
        SQLAlchemyUserRepository,
        session=session,
    )

    # -- services -----------------------------------------------------------
    task_service = providers.Factory(
        TaskService,
        task_repo=task_repository,
        user_repo=user_repository,
        event_bus=event_bus,
    )

    user_service = providers.Factory(
        UserService,
        user_repo=user_repository,
    )
