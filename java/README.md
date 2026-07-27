# Task Manager -- Java Reference Implementation

A Spring Boot application demonstrating eight architectural patterns that AI coding assistants should use as defaults when generating Java code.

## Patterns Demonstrated

| # | Pattern | Key Files |
|---|---------|-----------|
| 1 | **Layered Architecture** | `web/controller/`, `service/`, `repository/`, `domain/model/` |
| 2 | **Repository Pattern** | `TaskRepository`, `UserRepository` (Spring Data JPA interfaces) |
| 3 | **Service Layer** | `TaskService`, `UserService` (`@Service`, transactional boundaries) |
| 4 | **Dependency Injection** | Constructor injection throughout; no `@Autowired` on fields |
| 5 | **Configuration Externalisation** | `AppConfig` record with `@ConfigurationProperties` + Jakarta Validation |
| 6 | **Structured Error Handling** | `ResourceNotFoundException` hierarchy, `GlobalExceptionHandler`, RFC 9457 Problem Details |
| 7 | **Event-Driven Communication** | `TaskCreatedEvent` / `TaskCompletedEvent` records, `TaskEventHandler` with `@Async` |
| 8 | **Test Scaffold** | Unit tests (Mockito), repository tests (`@DataJpaTest`), API tests (`@WebMvcTest` + MockMvc) |

## Prerequisites

- Java 17 or later
- Maven 3.8+

## Running

```bash
cd java
mvn spring-boot:run
```

The application starts on `http://localhost:8080` with an H2 in-memory database.  
The H2 console is available at `http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:mem:taskdb`).

## Running Tests

```bash
mvn test
```

## API Endpoints

### Tasks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tasks` | List all tasks (optional `?status=OPEN`) |
| GET | `/api/tasks/{id}` | Get a task by ID |
| POST | `/api/tasks` | Create a task |
| PUT | `/api/tasks/{id}` | Update a task |
| POST | `/api/tasks/{id}/assign` | Assign a user to a task |
| POST | `/api/tasks/{id}/complete` | Mark a task as completed |
| DELETE | `/api/tasks/{id}` | Delete a task |

### Users

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users` | List all users |
| GET | `/api/users/{id}` | Get a user by ID |
| POST | `/api/users` | Create a user |
| DELETE | `/api/users/{id}` | Delete a user |

## Example Requests

```bash
# Create a user
curl -X POST http://localhost:8080/api/users \
  -H 'Content-Type: application/json' \
  -d '{"name": "Alice", "email": "alice@example.com"}'

# Create a task
curl -X POST http://localhost:8080/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title": "Write documentation", "description": "Cover all 8 patterns", "priority": "HIGH"}'

# Assign user 1 to task 1
curl -X POST http://localhost:8080/api/tasks/1/assign \
  -H 'Content-Type: application/json' \
  -d '{"userId": 1}'

# Complete task 1
curl -X POST http://localhost:8080/api/tasks/1/complete
```

## Project Structure

```
src/main/java/com/example/taskmanager/
  config/          Configuration properties (Pattern 5)
  domain/
    model/         JPA entities with domain behaviour
    exception/     Custom exception hierarchy (Pattern 6)
    event/         Domain event records (Pattern 7)
  repository/      Spring Data JPA repositories (Pattern 2)
  service/         Business logic (Patterns 3, 4)
  event/           Event listeners (Pattern 7)
  web/
    controller/    REST controllers (Pattern 1)
    dto/           Request/response records
    advice/        Global exception handler (Pattern 6)
```
