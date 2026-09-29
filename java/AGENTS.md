# AGENTS.md

Taskboard is a small Kanban API (Java 21, Spring Boot, JDBC, H2). This file is the working
agreement for everyone who changes this repository, human or AI. It is short on purpose:
anything a test can check lives in `ArchitectureTest`, not here.

## Verify

    mvn verify

One command compiles the code and runs the architecture rules (ArchUnit), the requirement
check, and the unit, integration and API tests. Work is finished when it passes. If an
architecture test or the requirement check fails, change the code, not the test.

## Where things go

Packages live under `src/main/java/com/example/taskboard/`.

| You are adding         | It belongs in  | It may depend on            |
| ---------------------- | -------------- | --------------------------- |
| a rule about one task  | `domain`       | the JDK only                |
| a data operation       | `repository`   | domain                      |
| a use case             | `service`      | domain, repository, config  |
| a side effect          | `events`       | domain                      |
| an endpoint            | `api`          | domain, service             |
| a setting              | `config`       | nothing                     |

Spring is the composition root: it constructs every collaborator and passes it through a
constructor. Tests mirror the packages: `service` (plain JUnit, in-memory repository),
`repository` (contract, run against both implementations), `api` (HTTP, real wiring),
`support` (shared test doubles).

## Conventions

- Services throw `DomainException` subclasses. Controllers never catch them;
  `ApiExceptionHandler` turns each one into an RFC 9457 problem document.
- Side effects (mail, audit, metrics) listen for a domain event with
  `@TransactionalEventListener`. Services never call them.
- Collaborators arrive through constructors. No field injection, no `new` on a component.
- Settings are fields of `AppProperties`, mapped from the environment in `application.yml`.
  No `@Value`, no `System.getenv`.
- The API returns domain records until the wire format has to differ from the domain.
- Classes are package-private unless another package needs them.

## Requirements

Every rule of the board is one EARS sentence with an id in `REQUIREMENTS.md`; its pattern names
the layer that implements it. Every unit, API and event test is a scenario: its `@DisplayName`
opens with the ids it covers, then given / when / then. `RequirementsTest` fails when a rule has
no scenario or a scenario cites no rule.

## Adding a feature

Copy the `moveTask` slice, top to bottom:

1. The rule, as an EARS sentence, in `REQUIREMENTS.md`.
2. Domain rule or exception in `domain`.
3. Repository method: the interface, `JdbcTaskRepository`, `InMemoryTaskRepository`, and a
   case in `TaskRepositoryContract`.
4. Service method, with a unit test.
5. Controller method, with an API test.
6. A new exception is a nested class of the sealed `DomainException`; the compiler then
   demands its HTTP status in `ApiExceptionHandler`.
7. Run `mvn verify`.

## Ask a human first

- Adding or upgrading a dependency.
- Changing `ArchitectureTest`, `RequirementsTest`, a rule already in `REQUIREMENTS.md`, or this file.
- Changing `schema.sql`, or the shape of an existing endpoint.
