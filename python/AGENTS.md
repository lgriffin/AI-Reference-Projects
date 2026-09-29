# AGENTS.md

Taskboard is a small Kanban API (Python 3.12+, FastAPI, SQLite). This file is the working
agreement for everyone who changes this repository, human or AI. It is short on purpose:
anything a test can check lives in `tests/architecture/`, not here.

## Verify

    pytest

One command runs the type checker (`mypy --strict`), the architecture rules, the requirement
check, and the unit, integration and API tests. Work is finished when it passes. If an
architecture test or the requirement check fails, change the code, not the test.

## Where things go

| You are adding         | It belongs in                      | It may import                |
| ---------------------- | ---------------------------------- | ---------------------------- |
| a rule about one task  | `src/taskboard/domain/`            | nothing                      |
| a data operation       | `src/taskboard/repositories/`      | domain                       |
| a use case             | `src/taskboard/services/`          | domain, repositories, events |
| a side effect          | `src/taskboard/events/handlers.py` | domain                       |
| an endpoint            | `src/taskboard/api/`               | domain, services             |
| a setting              | `src/taskboard/config.py`          | nothing                      |
| wiring                 | `src/taskboard/app.py`             | anything                     |

Tests mirror the layers: `tests/unit` (services, in-memory repository), `tests/integration`
(repository contract), `tests/api` (HTTP, real wiring), `tests/support` (shared test doubles).

## Conventions

- Services raise `DomainError` subclasses. Routes never catch them; `api/error_handlers.py`
  turns each one into an RFC 9457 problem document.
- Side effects (mail, audit, metrics) subscribe to a domain event. Services never call them.
- Collaborators arrive through constructors. Only `app.py` constructs them.
- Only `config.py` reads the environment. Every setting appears in `.env.example`.
- The API returns domain objects until the wire format has to differ from the domain.

## Requirements

Every rule of the board is one EARS sentence with an id in `REQUIREMENTS.md`; its pattern names
the layer that implements it. Every unit and API test is a scenario: its docstring opens
with the ids it covers, then given / when / then. `tests/architecture/test_requirements.py`
fails when a rule has no scenario or a scenario cites no rule.

## Adding a feature

Copy the `move_task` slice, top to bottom:

1. The rule, as an EARS sentence, in `REQUIREMENTS.md`.
2. Domain rule or error in `domain/`.
3. Repository method: the protocol, the SQLite implementation, the in-memory double, and a
   case in `tests/integration/test_task_repository_contract.py`.
4. Service method, with a unit test.
5. Route, with an API test.
6. A new error needs an entry in `STATUS_BY_ERROR`.
7. Run `pytest`.

## Ask a human first

- Adding or upgrading a dependency.
- Changing `tests/architecture/`, `REQUIREMENTS.md` rules already stated, or this file.
- Changing the database schema, or the shape of an existing endpoint.
