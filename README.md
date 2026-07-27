# AI Reference Projects

Reference implementations accompanying the paper:

> **Default Architectural Software Patterns for AI-Assisted Development: Convention over Configuration for Code Generation**
>
> Published in the *Journal of Object Technology* (JOT)

## Purpose

This repository contains three functionally equivalent reference implementations of a Task Management API, each built in a different language and framework stack. Together they demonstrate that a common set of architectural defaults can be applied consistently across languages when AI coding assistants generate production code.

The eight patterns explored are:

1. **Layered Architecture** -- strict separation of presentation, service, and data access layers.
2. **Repository Pattern** -- data access abstracted behind interfaces with concrete ORM implementations.
3. **Service Layer** -- all business logic lives in service classes; no HTTP concerns leak in.
4. **Dependency Injection** -- constructor-based injection wired through a DI container.
5. **Configuration Externalisation** -- environment-driven configuration validated at startup.
6. **Structured Error Handling** -- typed domain error hierarchies mapped to HTTP responses.
7. **Event-Driven Communication** -- in-process event bus decoupling cross-cutting side-effects.
8. **Test Scaffold** -- three-tier test suites (unit, integration, API) mirroring the architecture.

## Implementations

| Directory | Stack | Framework | ORM / Data | DI |
|-----------|-------|-----------|------------|----|
| [`java/`](java/) | Java 17 | Spring Boot | Spring Data JPA / H2 | Spring (constructor injection) |
| [`python/`](python/) | Python 3.11+ | FastAPI | SQLAlchemy 2.0 / SQLite | dependency-injector |
| [`typescript/`](typescript/) | TypeScript | Fastify 5 | Prisma 6 | tsyringe |

Each implementation has its own README with setup instructions, API endpoint documentation, and project structure details.

## Getting Started

Navigate into any implementation directory and follow its README:

```bash
# Java
cd java && mvn spring-boot:run

# Python
cd python && pip install -e ".[dev]" && uvicorn task_manager.main:app --reload

# TypeScript
cd typescript && npm install && npm run dev
```

## Licence

This project is provided as academic reference material. See individual implementation directories for any framework-specific licence requirements.
