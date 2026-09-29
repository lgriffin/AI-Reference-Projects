# AGENTS.md

Taskboard is a small Kanban API (Node 24+, TypeScript, Fastify, SQLite). This file is the
working agreement for everyone who changes this repository, human or AI. It is short on
purpose: anything a test can check lives in `tests/architecture/`, not here.

## Verify

    npm test

One command runs the type checker (`tsc`, strict), the architecture rules, the requirement
check, and the unit, integration and API tests. Work is finished when it passes. If an
architecture test or the requirement check fails, change the code, not the test.

Node runs the TypeScript sources directly; there is no build step. Imports therefore carry
the `.ts` extension, type-only imports say `import type`, and `enum` and constructor
parameter properties are not available.

## Where things go

| You are adding         | It belongs in            | It may import                |
| ---------------------- | ------------------------ | ---------------------------- |
| a rule about one task  | `src/domain/`            | nothing                      |
| a data operation       | `src/repositories/`      | domain                       |
| a use case             | `src/services/`          | domain, repositories, events |
| a side effect          | `src/events/handlers.ts` | domain                       |
| an endpoint            | `src/api/`               | domain, services             |
| a setting              | `src/config.ts`          | nothing                      |
| wiring                 | `src/app.ts`             | anything                     |

Tests mirror the layers: `tests/unit` (services, in-memory repository), `tests/integration`
(repository contract), `tests/api` (HTTP, real wiring), `tests/support` (shared test doubles).

## Conventions

- Services throw `DomainError` subclasses. Routes never catch them; `api/error-handler.ts`
  turns each one into an RFC 9457 problem document.
- Side effects (mail, audit, metrics) subscribe to a domain event. Services never call them.
- Collaborators arrive through constructors. Only `app.ts` constructs them.
- Only `config.ts` reads the environment. Every setting appears in `.env.example`.
- The API returns domain objects until the wire format has to differ from the domain.

## Requirements

Every rule of the board is one EARS sentence with an id in `REQUIREMENTS.md`; its pattern names
the layer that implements it. Every unit and API test is a scenario: its title opens with
the ids it covers, then given / when / then. `tests/architecture/requirements.test.ts` fails
when a rule has no scenario or a scenario cites no rule.

## Adding a feature

Copy the `moveTask` slice, top to bottom:

1. The rule, as an EARS sentence, in `REQUIREMENTS.md`.
2. Domain rule or error in `domain/`.
3. Repository method: the interface, the SQLite implementation, the in-memory double, and a
   case in `tests/integration/task-repository.contract.test.ts`.
4. Service method, with a unit test.
5. Route, with an API test.
6. A new error needs a member of `ErrorCode`; the compiler then demands its HTTP status.
7. Run `npm test`.

## Ask a human first

- Adding or upgrading a dependency.
- Changing `tests/architecture/`, `REQUIREMENTS.md` rules already stated, or this file.
- Changing the database schema, or the shape of an existing endpoint.
