# The Assertion Ladder

A pattern for embedding a technical domain in a repository that people and coding agents change
together, so that AI-generated volume (sprawl) and the limits of human attention (cognitive
erosion) do not wear the domain away. The three implementations in this repository are its
receivers: each binds every rung in its own idiom. The paper that this guide supports is planned
in [`paper-plan.md`](../paper-plan.md).

## The pattern

| | |
| --- | --- |
| **Name** | Assertion Ladder (also: Graduated Assertion) |
| **Intent** | Keep a technical domain intact when AI agents contribute, by asserting each domain rule at the weakest level that still covers its risk. |
| **Context** | A repository shared by people and coding agents that start every session with no memory. Code arrives faster than anyone can review it closely. |
| **Problem** | How do a domain's rules survive contributors who cannot remember them and reviewers who cannot read everything? |
| **Forces** | A rule nobody wrote down is lost at the next session. Written guidance grows until nobody reads it. Every check costs effort to write and time in the gate. The strongest assertions depend on the language. Too much constraint makes the repository hard to change. A check an agent can edit is a check an agent can weaken. |
| **Solution** | For each domain rule, pick a rung. Climb until the rule's risk is covered, then stop. When a rule reaches a checked rung, take it out of the prose. Put every check behind one gate, and the checks themselves behind a human boundary. |
| **Consequences** | Early, specific feedback; a short manifest; intent that can be reviewed apart from code. In exchange: more tests to maintain, an L5 that differs per language, and a risk of rigidity if rules climb further than their risk warrants. |
| **Related** | Layered Architecture, Hexagonal Architecture, Repository, Specification by Example (BDD), EARS, architecture fitness functions, Convention over Configuration, poka-yoke. |

## The rungs

| Rung | Name | Teaching move | What the contributor experiences |
| --- | --- | --- | --- |
| L0 | Implied | hidden curriculum | nothing; it guesses |
| L1 | Shown | worked example | a pattern to imitate |
| L2 | Told | direct instruction | a rule it may follow, forget or misread |
| L3 | Checked | assessment | a red suite |
| L4 | Explained | formative feedback | a red suite whose message names the rule, the offender and the fix |
| L5 | Prevented | constraint | the wrong form does not compile |

## The rung patterns

| Rung | Pattern | Problem | Solution |
| --- | --- | --- | --- |
| L1 | Worked Slice | How does a newcomer learn the shape of a feature? | Keep one complete vertical slice, small enough to read whole. |
| L2 | Short Manifest | How is what cannot be tested passed on? | One file under 500 words, loaded at the start of every session. |
| L3 | Executable Rule | How is a structural rule kept when nobody remembers it? | A test that fails when the rule is broken. |
| L3 | Closure Check | How do two lists stay in step? | Assert that every X has a Y. |
| L3 | Honest Double | How do fast tests stay truthful? | Run one contract against the real implementation and its stand-in. |
| L4 | Teaching Failure | How does a red build lead to the right fix? | Name the rule, the offender and the remedy in the failure. |
| L5 | Unrepresentable Mistake | How is a mistake stopped before any test runs? | Types that make the wrong form fail to compile. |
| all | Single Gate | When is work finished? | One command runs every rung; green means done. |
| all | Human Boundary | Who may change the ladder itself? | A short list of changes that need a person first. |

## Three kinds of intent, one ladder

| Intent | Declared | Exemplified | Enforced |
| --- | --- | --- | --- |
| Structure: where code may live | placement table in `AGENTS.md` | the move-task slice | architecture rules |
| Behaviour: what the board does | scenario convention in `AGENTS.md` | given / when / then scenarios citing ids | the scenarios, and the repository contract |
| Requirements: why | `REQUIREMENTS.md`, one EARS sentence per rule | the ten taskboard rules | the requirement closure check |

The EARS pattern of a rule names the layer that implements it; the table at the end of each
`REQUIREMENTS.md` gives the mapping.

## Binding paths: the three receivers

| Rung pattern | Java | Python | TypeScript |
| --- | --- | --- | --- |
| Worked Slice | `TaskService.moveTask` and `TaskController` | `move_task` in `services/task_service.py` and `api/task_routes.py` | `moveTask` in `src/services/task-service.ts` and `src/api/task-routes.ts` |
| Short Manifest | `java/AGENTS.md` | `python/AGENTS.md` | `typescript/AGENTS.md` |
| Executable Rule | `ArchitectureTest` (ArchUnit, bytecode) | `tests/architecture/test_architecture.py` (AST) | `tests/architecture/architecture.test.ts` (source text) |
| Closure Check | errors: the compiler (L5); requirements: `RequirementsTest` | errors: `test_every_domain_error_has_an_http_status`; requirements: `test_requirements.py` | errors: the compiler (L5); requirements: `requirements.test.ts` |
| Honest Double | `TaskRepositoryContract`, run against JDBC and in-memory | `tests/integration/test_task_repository_contract.py` | `tests/integration/task-repository.contract.test.ts` |
| Teaching Failure | `because(...)` on every rule | assertion messages on every rule | assertion messages on every rule |
| Unrepresentable Mistake | sealed `DomainException`, exhaustive `switch` | not available; bound at L3 instead | `Record<ErrorCode, number>` |
| Single Gate | `mvn verify` | `pytest` | `npm test` |
| Human Boundary | "Ask a human first" in each `AGENTS.md` | same | same |

## Evidence

Violation seeding (`evaluation/results.json`) plants fourteen mistakes in each receiver and
records the earliest mechanism that objects.

| Receiver | Compiler (L5) | Architecture test (L3/L4) | Requirement check (L3) | Behavioural test | Not caught |
| --- | --- | --- | --- | --- | --- |
| Java | 1 | 8 | 2 | 3 | 0 |
| Python | 0 | 10 | 2 | 2 | 0 |
| TypeScript | 1 | 8 | 2 | 3 | 0 |

At commit `8c4a74a`, before the requirement capability and the V8 and V10 rules, the same
receivers caught 30 of 36 structural seeds and missed V8 and V10 in every language
(`evaluation/results-8c4a74a.json`). Application code did not change between the two runs; only
tests, manifests and `REQUIREMENTS.md` did. Manifests grew from 397 / 347 / 388 to 480 / 427 / 468
words (Java / Python / TypeScript, `evaluation/metrics.json`).

## Use cases

Twelve stack-free use cases in six families, each with its level today and its target, are set out
in the companion page and summarised here.

| Family | Use cases |
| --- | --- |
| Placement | a memoryless agent adds a feature; a side effect is added to a use case; a business rule drifts to the edge |
| Contamination | a framework type enters the domain; an outside capability leaks into a service |
| Contract integrity | a new failure mode is introduced; a test double lies |
| Harness erosion | the agent edits a rule to go green; a dependency is added |
| Cognitive load | a reviewer faces a large AI diff; an agent starts cold |
| Transfer | a new domain is embedded |
