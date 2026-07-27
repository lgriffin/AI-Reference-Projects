# Task Manager -- Python Reference Implementation

A reference implementation demonstrating eight architectural patterns for AI-assisted software development. Built with FastAPI, SQLAlchemy 2.0, Pydantic v2, and dependency-injector.

## Patterns Demonstrated

| # | Pattern | Key Files |
|---|---------|-----------|
| 1 | **Layered Architecture** | `presentation/routers/`, `services/`, `repositories/` |
| 2 | **Repository Pattern** | `repositories/interfaces.py`, `repositories/sqlalchemy/` |
| 3 | **Service Layer** | `services/task_service.py`, `services/user_service.py` |
| 4 | **Dependency Injection** | `container.py`, router `Depends(Provide[...])` |
| 5 | **Configuration Externalisation** | `config.py`, `.env.example` |
| 6 | **Structured Error Handling** | `domain/errors.py`, `presentation/error_handlers.py` |
| 7 | **Event-Driven Communication** | `domain/events.py`, `events/bus.py`, `events/handlers.py` |
| 8 | **Test Scaffold** | `tests/unit/`, `tests/integration/`, `tests/api/` |

## Prerequisites

- Python 3.11 or later
- pip (or any PEP 517-compatible installer)

## Getting Started

```bash
# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Install the package with development dependencies
pip install -e ".[dev]"

# Copy the example environment file
cp .env.example .env

# Run the server
uvicorn task_manager.main:app --reload
```

The API is available at `http://localhost:8000`. Interactive docs are served at `/docs` (Swagger UI) and `/redoc`.

## Running Tests

```bash
pytest
```

The test suite includes three layers:

- **Unit tests** (`tests/unit/`) -- mock repositories, pure business-logic validation.
- **Integration tests** (`tests/integration/`) -- real SQLite via async engine.
- **API tests** (`tests/api/`) -- full HTTP round-trip through the FastAPI app.

## Project Structure

```
src/task_manager/
    main.py              FastAPI app factory and lifespan
    container.py         DI container (dependency-injector)
    config.py            Pydantic Settings (env-based config)
    domain/
        models.py        Domain entities (dataclasses)
        errors.py        Domain exception hierarchy
        events.py        Domain event types
    repositories/
        interfaces.py    Protocol-based repository contracts
        sqlalchemy/      Concrete SQLAlchemy implementations
    services/
        task_service.py  Task business logic
        user_service.py  User business logic
    events/
        bus.py           Async event bus
        handlers.py      Event handler functions
    presentation/
        routers/         FastAPI routers (thin HTTP layer)
        schemas/         Pydantic request/response models
        error_handlers.py Domain-to-HTTP error mapping
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/tasks` | Create a task |
| GET | `/api/tasks` | List all tasks |
| GET | `/api/tasks/{id}` | Get a task |
| PATCH | `/api/tasks/{id}` | Update a task |
| POST | `/api/tasks/{id}/status` | Change task status |
| POST | `/api/tasks/{id}/assign` | Assign task to user |
| DELETE | `/api/tasks/{id}` | Delete a task |
| POST | `/api/users` | Create a user |
| GET | `/api/users` | List all users |
| GET | `/api/users/{id}` | Get a user |
| DELETE | `/api/users/{id}` | Delete a user |
