# taskboard (Python / FastAPI)

A deliberately small Kanban API that is a complete example of a repository prepared for
human-AI development: eight default architectural patterns, a manifest that states them
([AGENTS.md](AGENTS.md)), and tests that enforce them. The same application exists in
[Java](../java), [Python](../python) and [TypeScript](../typescript); the three are
behaviourally identical. This is the code reported in version 1 of *The Assertion Ladder*,
submitted to the *Journal of Object Technology* on 2 October 2026 (see the
[root README](../README.md)).

## Run it

    python -m venv .venv && .venv/bin/pip install -e ".[dev]"    # Windows: .venv\Scripts\pip
    cp .env.example .env                                         # optional; defaults work
    .venv/bin/uvicorn taskboard.app:create_app --factory

## Verify it

    pytest

One command: `mypy --strict`, the architecture rules, and the unit, integration and API tests.

## The API

| Request                                   | Success        | Failures                                         |
| ----------------------------------------- | -------------- | ------------------------------------------------ |
| `POST /tasks` `{"title": "..."}`          | `201` the task | `400 validation_failed`                          |
| `GET /tasks`                              | `200` a list   |                                                  |
| `GET /tasks/{id}`                         | `200` the task | `404 task_not_found`                             |
| `POST /tasks/{id}/status` `{"status": …}` | `200` the task | `404`, `409 invalid_transition`, `409 wip_limit_exceeded` |

A task moves `todo -> in_progress -> done` (and back from `in_progress` to `todo`). No more
than `WIP_LIMIT` tasks may be in progress at once. Failures are RFC 9457 problem documents
(`application/problem+json`) carrying a stable `code`.

## The eight patterns, and where to find them

| # | Pattern                     | Here                                   |
| - | --------------------------- | -------------------------------------- |
| 1 | Layered architecture        | `src/taskboard/{api,services,repositories,domain}` |
| 2 | Repository                  | `repositories/task_repository.py` (a `Protocol`), `sqlite_task_repository.py` |
| 3 | Service layer               | `services/task_service.py` |
| 4 | Dependency injection        | constructors, wired once in `app.py` |
| 5 | Externalised configuration  | `config.py`, `.env.example` |
| 6 | Structured error handling   | `domain/errors.py`, `api/error_handlers.py` |
| 7 | Domain events               | `domain/events.py`, `events/bus.py`, `events/handlers.py` |
| 8 | Test scaffold               | `tests/{unit,integration,api,architecture,support}` |

How to extend the application, and what needs a human decision, is in [AGENTS.md](AGENTS.md).
