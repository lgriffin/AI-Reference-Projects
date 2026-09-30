# The Assertion Ladder: reference projects

This repository is the open companion to our paper for the *Journal of Object Technology* (JOT):

> **The Assertion Ladder: Graduated Assertion for Embedding a Technical Domain in Repositories
> Shared with Coding Agents**
>
> Leigh Griffin, Paul Power and Ray Carroll (Red Hat, Waterford, Ireland); Colm Dunphy, Darrin Taylor
> and Eamonn de Leastar (South East Technological University, Waterford, Ireland)

**About the versions here.** The working draft of the paper is written and edited internally by
the authors. This repository holds the final versions, published in the open alongside the code,
data and scripts the paper reports on, so that anyone can read, rebuild and check them. The current
release is [`paper/assertion-ladder.pdf`](paper/assertion-ladder.pdf).

## Why we wrote it

Agentic AI has changed who writes software. Coding agents now read a repository, plan a change,
edit many files and run the tests before a person sees the result. They are capable, but they have
no memory: every session starts from nothing, and whatever an agent learned yesterday about a
domain's rules is gone this morning. The repository is the only thing the agent and the team
reliably share, and changes arrive faster than people can review them closely. Unless the
repository itself teaches and enforces its domain, the rules spread and erode.

We meet this from two sides of the same city. At South East Technological University (SETU),
Colm and Eamonn lead the software programme, the online
[Higher Diploma in Science in Computer Science](https://www.setu.ie/courses/higher-diploma-in-computer-science-2-years-online), where students now learn to program
alongside agents and lecturers need codebases that teach a domain to both. Darrin leads the
[Master of Business Studies in Lean Enterprise Excellence](https://www.setu.ie/courses/master-of-business-in-lean-enterprise-excellence), where lean practice is taught to
people who improve real organisations. At Red Hat in Waterford, Leigh, Paul and Ray work on
software that agents also change, and see hiring move towards graduates who can work safely in such
repositories. The
question is the same for a student, a new hire and an agent: how does a repository make its domain
rules impossible to miss and hard to break, without burying everyone in prose?

Our answer is lean before it is technical. Start from what the domain values, make the best current
method standard work that anyone can follow, look at where along the value stream a mistake is
found, and fix causes rather than symptoms. That framing is set out at book length in Leigh's
*Build High Value Software Systems* (Manning, forthcoming).

## The flow, from problem to paper

1. **Tutors, where the problem is real.** [Tutors](https://github.com/tutors-sdk/tutors-mono-repo)
   is SETU's open-source learning platform, a production TypeScript codebase that coding agents were
   already changing. We retrofitted it: architecture rules, scenarios, requirements in EARS form,
   shrink-only ratchets for legacy violations and mutation floors. Then we extracted its release
   checks into a separate, self-tested [release harness](https://github.com/tutors-sdk/tutors-release-harness)
   that the change under review cannot weaken.
2. **The pattern, named.** Abstracting what worked gave the *Assertion Ladder*: every domain rule is
   asserted at a deliberate strength, and no stronger than its risk warrants.

   | Rung | Name | The repository... |
   | --- | --- | --- |
   | L0 | Implied | says nothing; the rule lives in someone's head |
   | L1 | Shown | shows it in one worked slice |
   | L2 | Told | states it in a short manifest (`AGENTS.md`) or requirement (`REQUIREMENTS.md`) |
   | L3 | Checked | fails the single verify command when it is broken |
   | L4 | Explained | says, on failure, which rule broke and how to fix it |
   | L5 | Prevented | makes the mistake impossible to write |

   Structure, behaviour and requirements are three loads on the same ladder. The full pattern is in
   [`docs/assertion-ladder.md`](docs/assertion-ladder.md).
3. **A small service anyone can read whole.** *Taskboard*, a Kanban API with a work-in-progress
   limit, is the ladder designed in from the start. The paper walks through the TypeScript version,
   to match Tutors; the Java and Python versions are behaviourally identical and show the same rungs
   bound in other languages.
4. **Evidence.** [`evaluation/`](evaluation/) seeds fourteen canonical mistakes into each
   implementation and records what catches them: a benchmark of the repository, not of the agent. A
   pilot gave eighteen coding agents the same feature request with different rungs available.
5. **The paper.** [`paper/`](paper/) holds the released sources and PDF; [`paper-plan.md`](paper-plan.md)
   records the thesis, vocabulary, section owners and rules of evidence the authors agreed.

## The receivers

The same application is implemented three times. Each is self-contained: start from its
`AGENTS.md`, then its `REQUIREMENTS.md`, then its tests.

| Directory                    | Stack                          | Verify        | Application code |
| ---------------------------- | ------------------------------ | ------------- | ---------------- |
| [`typescript/`](typescript/) | Node 24+, Fastify, SQLite      | `npm test`    | 242 lines        |
| [`java/`](java/)             | Java 21, Spring Boot, JDBC, H2 | `mvn verify`  | 283 lines        |
| [`python/`](python/)         | Python 3.12+, FastAPI, SQLite  | `pytest`      | 223 lines        |

Every rule of the board is one EARS sentence with an id in `REQUIREMENTS.md`; every unit and API
test is a given / when / then scenario that cites those ids; and a requirement check fails when a
rule has no scenario or a scenario cites no rule.

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
what, if anything, catches them. The first iteration, at commit `8c4a74a`, enforced structure only
and caught 30 of 36; the current repository catches all 42. [`evaluation/agent_experiment/`](evaluation/agent_experiment/)
holds the pilot: eighteen coding agents given the same feature request in repositories offering one,
two or all three carriers, with the scripted audit and every agent's diff.

## How this was built

This repository is co-authored with Claude. Everything in it, the three receivers, their
manifests and rules, the evaluation scripts and the paper's sources, came out of an agentic
interchange: we set the intent, Claude drafted the templates, we reviewed and corrected them,
and the repository's own checks decided when a change was done. That is the collaborative mode
the paper examines, and the paper says so in its threats to validity.

We have left the git history as it is on purpose. The commits, their trailers and the pull
requests show who did what and in what order, and that record is part of the evidence. The
first iteration, preserved in that history, used DI containers, ORMs and two entities; a
forensic review of it, also done with Claude, motivated the smaller, invariant-first iteration
found here.

The point of working this way is that the repository can keep evolving. The capabilities are
coordinated rather than owned by one side: people decide what counts as a rule and how high it
climbs, the agent carries the rule into every receiver and keeps the templates in step, and the
single gate in each receiver checks the result. A new rung pattern, a new receiver in another
language, or a new rule in the requirements file can be added the same way, by anyone, with
the same checks deciding whether it landed.
