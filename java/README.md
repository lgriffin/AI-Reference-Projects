# taskboard (Java / Spring Boot)

A deliberately small Kanban API that is a complete example of a repository prepared for
human-AI development: eight default architectural patterns, a manifest that states them
([AGENTS.md](AGENTS.md)), and tests that enforce them. The same application exists in
[Java](../java), [Python](../python) and [TypeScript](../typescript); the three are
behaviourally identical.

## Run it

    mvn spring-boot:run

Requires Java 21. Settings (`WIP_LIMIT`, `PORT`, `DATABASE_URL`, `LOG_LEVEL`) are read from the
environment; `src/main/resources/application.yml` lists them with their defaults.

## Verify it

    mvn verify

One command: compilation, the ArchUnit architecture rules, and the unit, integration and API tests.

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
| 1 | Layered architecture        | packages `api`, `service`, `repository`, `domain` |
| 2 | Repository                  | `repository/TaskRepository`, `JdbcTaskRepository` |
| 3 | Service layer               | `service/TaskService` |
| 4 | Dependency injection        | constructors, wired by Spring |
| 5 | Externalised configuration  | `config/AppProperties`, `application.yml` |
| 6 | Structured error handling   | `domain/DomainException` (sealed), `api/ApiExceptionHandler` |
| 7 | Domain events               | `domain/TaskCompleted`, `events/CompletionAnnouncer` |
| 8 | Test scaffold               | `src/test/java/.../{service,repository,api,support}`, `ArchitectureTest` |

How to extend the application, and what needs a human decision, is in [AGENTS.md](AGENTS.md).
