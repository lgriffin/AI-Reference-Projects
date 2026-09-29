# AI Reference Projects

Reference implementations accompanying the paper:

> **Convention over Configuration for Coding Agents: A Repository Standard of Default
> Architectural Patterns for Human-AI Software Development**
>
> Submitted to the *Journal of Object Technology* (JOT)

and a follow-up in preparation, *The Assertion Ladder*, governed by [`paper-plan.md`](paper-plan.md)
(thesis, fixed vocabulary, section owners, rules of evidence). The pattern itself, and how each
implementation binds it, is described in [`docs/assertion-ladder.md`](docs/assertion-ladder.md).
The first paper's numbers were produced at commit `8c4a74a`; later commits add the requirement
capability described below.

## Purpose

When a human and an AI coding agent work in the same repository, the agent starts every session
with no memory of the last one. The repository is the only contract the two share. This
repository shows what such a contract can look like: eight default architectural patterns,
carried in three ways.

| Carrier         | What it is                                                   | Where            |
| --------------- | ------------------------------------------------------------ | ---------------- |
| **Exemplified** | one complete vertical slice, small enough to read whole      | `src/`           |
| **Declared**    | a manifest of under 500 words, including what needs a human  | `AGENTS.md`      |
| **Enforced**    | architecture rules as tests, behind one verify command       | the test suite   |

The same three carriers hold two further kinds of intent. Every rule of the board is one EARS
sentence with an id in `REQUIREMENTS.md`, every unit and API test is a given / when / then
scenario that cites those ids, and a requirement check fails when a rule has no scenario or a
scenario cites no rule.

The same application, *taskboard*, a small Kanban API with a work-in-progress limit, is
implemented three times. The three are behaviourally identical.

| Directory                    | Stack                          | Verify        | Application code |
| ---------------------------- | ------------------------------ | ------------- | ---------------- |
| [`java/`](java/)             | Java 21, Spring Boot, JDBC, H2 | `mvn verify`  | 283 lines        |
| [`python/`](python/)         | Python 3.12+, FastAPI, SQLite  | `pytest`      | 223 lines        |
| [`typescript/`](typescript/) | Node 24+, Fastify, SQLite      | `npm test`    | 242 lines        |

## The eight patterns, as invariants

1. **Layered Architecture**: code lives in `api`, `services`, `repositories` or `domain`; imports
   point only downwards; the domain imports no framework.
2. **Repository**: persistence sits behind an interface the application owns; only its
   implementation speaks SQL.
3. **Service Layer**: every use case is a service method; rules about one entity live on the
   entity, rules that need collaborators live in the service.
4. **Dependency Injection**: collaborators arrive through constructors; exactly one composition
   root constructs them. No container is required.
5. **Configuration Externalisation**: one typed, validated object reads the environment at
   start-up; nothing else does.
6. **Structured Error Handling**: failures are typed domain errors; one handler maps every error
   to an RFC 9457 problem document; routes catch nothing.
7. **Event-Driven Communication**: side effects subscribe to immutable domain events; a failing
   handler never fails the use case.
8. **Test Scaffold**: tests mirror the layers; one command runs them all, with the architecture
   rules.

## Evaluation

[`evaluation/`](evaluation/) contains the scripts behind the paper's numbers: `measure.py` (size)
and `seed_violations.py`, which plants fourteen canonical mistakes in each implementation
(twelve structural, two that break the trace between requirements and scenarios) and records
what, if anything, catches them. [`evaluation/agent_experiment/`](evaluation/agent_experiment/)
holds the pilot experiment: eighteen coding agents given the same feature request in repositories
offering one, two or all three carriers, with the scripted audit and every agent's diff.

## How this was built

The implementations and the evaluation were developed by the author working with an AI coding
agent, in the collaborative mode the paper examines. The first iteration (preserved in this
repository's history) used DI containers, ORMs and two entities; a forensic review of it
motivated the smaller, invariant-first second iteration found here.
