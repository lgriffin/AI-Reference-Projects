# AI-Assisted Development: 8 Architectural Patterns

A reference implementation accompanying the academic paper on default software patterns that AI agents should use when generating code. Built with TypeScript, Fastify, Prisma, and tsyringe.

## Domain

A **Task Management API** that supports creating, reading, updating, and deleting tasks; assigning tasks to users; and marking tasks as complete or cancelled.

## The 8 Patterns

### 1. Layered Architecture

Strict three-layer separation: **presentation** (routes and middleware in `src/presentation/`), **service** (business logic in `src/services/`), and **data access** (repositories in `src/repositories/`). Dependencies flow in one direction: presentation calls services, services call repositories. No layer bypasses another.

### 2. Repository Pattern

Data access is abstracted behind interfaces (`src/repositories/interfaces/`). Concrete Prisma implementations (`src/repositories/prisma/`) map ORM entities to domain objects. Swapping to a different data store requires only a new implementation class and a one-line change in the DI container.

### 3. Service Layer

All business logic lives in service classes (`src/services/`). Services enforce invariants (e.g. "a cancelled task cannot be completed"), validate inputs, and orchestrate repositories. No HTTP concerns (request objects, status codes) appear in the service layer.

### 4. Dependency Injection

Every dependency is injected via constructor parameters. The DI container (`src/container.ts`) binds interface tokens to concrete implementations using tsyringe. Business-logic classes never import concrete implementations directly.

### 5. Configuration Externalisation

All configuration is read from environment variables and validated at startup using Zod (`src/config/index.ts`). The application fails fast with a clear error message if any required variable is missing or has an invalid shape. No hardcoded connection strings, ports, or feature flags.

### 6. Structured Error Handling

Domain errors form a typed hierarchy (`src/domain/errors/`). Services return `Result<T, E>` types instead of throwing raw exceptions. A centralised error handler in the presentation layer (`src/presentation/middleware/error-handler.ts`) maps each error type to the appropriate HTTP status code and response envelope.

### 7. Event-Driven Communication

An in-process event bus (`src/events/event-bus.ts`) decouples cross-cutting concerns. Services publish domain events (task created, completed, assigned, cancelled); handlers in `src/events/handlers/` react asynchronously. Adding new side-effects (notifications, analytics) requires only a new handler, not changes to the service.

### 8. Test Scaffold

Three test tiers mirror the architecture:
- **Unit tests** (`tests/unit/`) test services with mocked repositories.
- **Integration tests** (`tests/integration/`) test repository implementations against a (mock) database.
- **API tests** (`tests/api/`) test routes end-to-end using Fastify's `inject` method with mocked services.

## Project Structure

```
typescript/
├── src/
│   ├── index.ts                  # Application entry point
│   ├── container.ts              # DI container setup
│   ├── config/index.ts           # Validated environment config
│   ├── domain/
│   │   ├── entities/             # Task and User domain objects
│   │   ├── errors/               # Domain error hierarchy + Result type
│   │   └── events/               # Domain event type definitions
│   ├── repositories/
│   │   ├── interfaces/           # Repository contracts
│   │   └── prisma/               # Prisma implementations
│   ├── services/                 # Business logic layer
│   ├── events/
│   │   ├── event-bus.ts          # Typed event bus
│   │   └── handlers/             # Event reaction handlers
│   └── presentation/
│       ├── routes/               # Fastify route definitions
│       ├── middleware/           # Error handler
│       └── schemas/              # Zod request/response schemas
├── prisma/schema.prisma          # Database schema
└── tests/
    ├── unit/services/            # Service unit tests
    ├── integration/repositories/ # Repository integration tests
    └── api/                      # HTTP API tests
```

## Getting Started

### Prerequisites

- Node.js 20+
- SQLite (bundled; no external database server required)

### Setup

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Generate Prisma client and set up database
npx prisma generate
npx prisma migrate dev

# Start the development server
npm run dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run only API tests
npm run test:api
```

### API Endpoints

| Method   | Path                        | Description            |
| -------- | --------------------------- | ---------------------- |
| `GET`    | `/api/tasks`                | List tasks (filterable)|
| `GET`    | `/api/tasks/:id`            | Get a single task      |
| `POST`   | `/api/tasks`                | Create a task          |
| `PATCH`  | `/api/tasks/:id`            | Update a task          |
| `POST`   | `/api/tasks/:id/complete`   | Mark task as completed |
| `POST`   | `/api/tasks/:id/cancel`     | Cancel a task          |
| `DELETE` | `/api/tasks/:id`            | Delete a task          |
| `GET`    | `/api/users`                | List users             |
| `GET`    | `/api/users/:id`            | Get a single user      |
| `POST`   | `/api/users`                | Create a user          |
| `PATCH`  | `/api/users/:id`            | Update a user          |
| `DELETE` | `/api/users/:id`            | Delete a user          |
| `GET`    | `/health`                   | Health check           |

## Technology Choices

| Concern         | Choice       | Rationale                                   |
| --------------- | ------------ | ------------------------------------------- |
| HTTP framework  | Fastify 5    | Modern, typed, high performance             |
| Validation      | Zod          | Runtime + static type inference             |
| ORM             | Prisma 6     | Widest adoption, excellent DX               |
| DI              | tsyringe     | Lightweight, decorator-based                |
| Event bus       | EventEmitter | Zero-dependency, sufficient for in-process  |
| Testing         | Vitest       | Fast, ESM-native, compatible with Jest API  |
| Language        | TypeScript   | Strict mode, no `any` types                 |
