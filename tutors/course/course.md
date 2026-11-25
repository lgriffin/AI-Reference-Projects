# Tutors Ladder

A 12 week module that rebuilds Tutors, the open learning toolkit, from its simplest working version up to the
full [tutors-mono-repo](https://github.com/tutors-sdk/tutors-mono-repo). It is for people who would like to
contribute to Tutors and want to understand it by building it, with a coding agent beside them if they wish.

## Two ladders

| Ladder | What it is | Where you meet it |
| --- | --- | --- |
| The **capability ladder** | Seven runnable versions of Tutors on one straight line. Each starts as a copy of the rung below, needs a little more expertise, and delivers one major new capability. The Summit is the real repository. | Every week says which rung you are on. |
| The **Assertion Ladder** | Six levels at which a rule can be kept: L0 Implied, L1 Shown, L2 Told, L3 Checked, L4 Explained, L5 Prevented. | Every rung carries a short manifest (`AGENTS.md`), one gate, and a **Rung Fence**: a test that stops a coding agent building beyond the rung you are on. Every reading note says which levels guard that week's rules. |

## How the ladder works

- **One straight line.** 1 Seed, 2 Lite, 3 Layers, 4 Proven, 5 Reader, 6 Guarded, 7 Shipped, then the Summit.
  Whatever is true on a rung stays true on every rung above it.
- **One rung every one to three weeks,** by complexity. A small rung takes a week; a large one takes two.
- **Testing sits at rung 4.** From then on every new capability is specified first, as EARS requirements and
  Given/When/Then scenarios, before any code.
- **The standard version.** Each rung's completed code ships as a zip in its final week ("Rung N: the standard
  version"). It is proven before it is written: it installs, passes its gate and runs on the sample course.
  The first week of a rung starts from the standard version of the rung below; the last week compares your
  work with the rung's own standard version.
- **Build beyond.** You are expected to take every variant further than it goes. Every lab ends with a "Build
  beyond" step of open extensions. Stay inside the fence: building beyond a rung is welcome; climbing past it
  by accident is not.
- **Climbing is a decision.** Lifting a fence is a person's decision, made on purpose, in its own commit.

## The twelve weeks

One topic per week: talks and a reading note with depth, then exactly one lab. The last week of each rung
also carries its coding assignment and exit criteria.

| Week | Rung | Topic | Teaching focus | Assessed |
| --- | --- | --- | --- | --- |
| 1 | 1 Seed | The course format as data | Tutors, the two ladders, the course format as data, a first CLI | |
| 2 | 1 Seed | Types that refuse mistakes | Discriminated unions, exhaustiveness and `never`, conformance to an oracle | A1: the github kind |
| 3 | 2 Lite | A static site, escaped by construction | Static sites, a Markdown subset, escaping by construction | A2: Markdown tables |
| 4 | 3 Layers | Workspaces | Workspaces, packages, dependency direction | |
| 5 | 3 Layers | Ports and adapters | Ports and adapters, architecture tests, the Honest Double | A3: rung 3 |
| 6 | 4 Proven | Requirements with EARS | Requirements with EARS, the closure audit, test-first | |
| 7 | 4 Proven | BDD, properties and mutation | Given/When/Then, properties, mutation testing | A4: rung 4 |
| 8 | 5 Reader | Routes and load | SvelteKit routing and load, `tutors.json` as the contract | |
| 9 | 5 Reader | Components | Svelte 5 runes, components, browser tests | A5: rung 5 |
| 10 | 6 Guarded | Guarded | Threat model, XSS, CSP, containment, identity, RBAC, supply chain | A6: rung 6 |
| 11 | 7 Shipped | Shipped | Releases, claims and evidence, SLOs, containers, CI | A7: rung 7 |
| 12 | Summit | The Summit | From rung 7 to tutors-mono-repo; contributing with an agent under the ladder | A8: a contribution upstream |

EARS and the Assertion Ladder are reinforced every week, not taught once. Weeks 1 to 5 each end their lab
with "Name the rule", writing the week's rule as an informal "shall" sentence. Week 6 teaches EARS properly.
From week 7 every lab opens with "Specify first": an EARS requirement and a Given/When/Then scenario added to
the variant before any code.

## Learning outcomes

The module is designed against the revised Bloom's taxonomy. Each outcome names its level. Each week states
three to five outcomes of its own, every lab step names its level, and every assignment maps its acceptance
criteria to these outcomes and is assessed at Create.

On completing the module you will be able to:

| Id | Outcome | Level |
| --- | --- | --- |
| M1 | Explain the Tutors course format and its data model, and how the generator, validator and reader each use it. | Understand |
| M2 | Work with a coding agent under the two ladders: start from the manifest, keep to the Rung Fence, finish on the Single Gate, and respect the Human Boundary. | Apply |
| M3 | Extend a variant with a new capability, using types (discriminated unions, exhaustive switches) and tests to keep it correct. | Apply |
| M4 | Analyse a variant against its upstream counterpart with oracles, conformance tests and architecture tests, and diagnose why a check fails. | Analyse |
| M5 | Restructure code into layers and ports, and justify where each rule belongs on the Assertion Ladder. | Analyse |
| M6 | Specify behaviour with EARS requirements and Given/When/Then scenarios, and judge a test suite by closure and mutation score. | Evaluate |
| M7 | Evaluate the safety and release readiness of a system from evidence: escaping and sanitising, threats, supply chain, release claims. | Evaluate |
| M8 | Contribute an improvement to tutors-mono-repo under the ladder, using standard work and Kaizen. | Create |

| Outcome | Taught in weeks | Assessed by |
| --- | --- | --- |
| M1 | 1, 2, 3, 8 | A1, A2 |
| M2 | 1, 2, 3, every week's lab | A1, A2, A8 |
| M3 | 2, 3, 4, 5, 9 | A1, A2, A3, A5 |
| M4 | 2, 3, 4, 5, 6, 7 | A1, A2, A3, A4 |
| M5 | 4, 5 | A3 |
| M6 | 6, 7, 8, 9 | A4, A5 |
| M7 | 3, 10, 11 | A2, A6, A7 |
| M8 | 11, 12, every week's Kaizen | A7, A8 |

The centre of gravity rises through the module: weeks 1 to 3 are mostly Remember to Apply, weeks 4 to 7
Apply to Analyse, weeks 8 to 11 Analyse to Evaluate, and week 12 Evaluate and Create on the real repository.

## A Lean thread

Lean runs gently through the module, and stays about software: value first, standard work, and the
elimination of waste.

- **Value.** Week 1 maps the Tutors value stream, from a lecturer's folder to a student's screen, and names
  what the student, the lecturer and the contributor each value. Every rung says which step of that stream it
  improves.
- **Standard work.** The Single Gate, each variant's `AGENTS.md` and each rung's standard version are the
  agreed baseline. Labs ask you to improve them, not only follow them.
- **Waste.** AI sprawl is overproduction, and the Rung Fence stops it. A teaching failure removes relearning;
  a closure check stops lists drifting apart; a fast gate removes waiting. Every "Build beyond" extension
  starts from the value it adds, so it is pulled work, not overproduction.
- **Kaizen every week.** Every lab ends with a short Kaizen step: name one waste, find its root cause,
  propose one improvement.

## Working with an agent

You are welcome to work with a coding agent. Ask it to read the variant's `AGENTS.md` and `RUNG.md` first,
name the rung in every request, run the gate before you read its diff, and never let it edit the fence or the
tests to go green. If you cannot explain a line it wrote, it is not yet your work.
