# Paper plan: The Assertion Ladder

This file governs the paper that Leigh, Paul, Ray and Colm are writing from this repository. It
fixes the thesis, the vocabulary, the structure and the rules of evidence, so that four people
can write sections in parallel and the result still reads as one argument. Change this file
first, then the paper.

- Target venue: *Journal of Object Technology* (JOT)
- Companion pages: [The Assertion Ladder](https://claude.ai/artifact/Wq6vNtRcqJxYN8K1dZjSet)
  (the abstracted capability) and [Intent Harness v1](https://claude.ai/artifact/Rf259Uv9cecAs8mPh5h3V6)
  (the worked example, with file references at commit `8c4a74a`)
- Guide: [`docs/assertion-ladder.md`](docs/assertion-ladder.md), the pattern and each receiver's
  binding path, in the repository
- Status: plan not yet agreed by all four authors; owners and open decisions are open to change

## 1. Thesis

> A repository protects its technical domain from AI sprawl and cognitive erosion to the extent
> that each domain rule is asserted at the right pedagogical level: strong enough that a
> memoryless contributor cannot miss it, and no stronger than the rule's risk justifies.

Working title: **The Assertion Ladder: Graduated Assertion for Embedding Technical Domains in
Human-AI Repositories**

## 2. The governing points

Every section must serve these points. A paragraph that serves none of them is cut.

1. **The capability comes first.** The paper presents one unified capability, the Assertion
   Ladder. Structure (layers and architecture tests), behaviour (BDD) and requirements (EARS) are
   three kinds of intent the same capability carries. They are not three separate techniques.
2. **The three projects are receivers, not producers.** The Java, Python and TypeScript
   implementations do not define the capability; they receive it. Each one shows a *binding
   path* (how it binds every rung in its own idiom) and the *benefits* it gets in return. The
   paper works backwards from those benefits to the capability they have in common.
3. **Assertion is pedagogy.** The agent is a capable learner with no memory; the repository is
   the teacher. Each rung is a teaching move: shown, told, checked, explained, prevented.
4. **Compress, do not accumulate.** Domain sanctity and ease of use trade against each other.
   A rule climbs only as far as its risk warrants, and leaves the prose once a check covers it.
5. **Lean is the explanation, not decoration.** Every lean term used (waste, poka-yoke,
   jidoka, standard work, andon, kaizen) must point to a mechanism in the code.
6. **Claim no more than the evidence.** See section 6.

## 3. Fixed vocabulary

Use these terms exactly. Do not coin synonyms in individual sections.

| Term | Meaning |
| --- | --- |
| Assertion Ladder | The capability: assert each domain rule at a chosen rung, from L0 to L5 |
| Rung | One level of assertion strength (table below) |
| Rung pattern | A named pattern that realises a rung (table below) |
| Receiver | One of the three implementations, which binds the capability in its own idiom |
| Binding path | How a receiver binds each rung, with file references |
| Domain sanctity | The domain's rules live in one place, in its own words, independent of framework, database and contributor |
| Sprawl | AI output spreading one rule across many places through locally plausible changes |
| Cognitive erosion | Loss of intent because neither the reviewer nor the agent can hold enough in mind |
| Single gate | The one verify command: `mvn verify`, `pytest`, `npm test` |
| Human boundary | The short list of changes that need a person first |

| Rung | Name | Teaching move | Rung patterns |
| --- | --- | --- | --- |
| L0 | Implied | hidden curriculum | none |
| L1 | Shown | worked example | Worked Slice |
| L2 | Told | direct instruction | Short Manifest |
| L3 | Checked | assessment | Executable Rule, Closure Check, Honest Double |
| L4 | Explained | formative feedback | Teaching Failure |
| L5 | Prevented | constraint | Unrepresentable Mistake |
| all | | | Single Gate, Human Boundary |

## 4. Structure

Owners are a proposal to start from; reassign freely and record the change here.

| # | Section | Purpose and key points | Evidence and figures | Owner |
| - | --- | --- | --- | --- |
| 1 | Introduction | Memoryless contributors; the repository as the only shared contract; sprawl and cognitive erosion; the thesis; contributions | Figure 1: the ladder | Leigh |
| 2 | Background | Layered and Clean architecture; architecture testing and fitness functions; BDD; EARS; cognitive load and worked examples; lean; convention over configuration | Related work table | Paul |
| 3 | The Assertion Ladder | The pattern in catalogue form (intent, context, forces, solution, consequences); the six rungs; the nine rung patterns; compression and fading | Figure 2: rung patterns | Leigh |
| 4 | Three receivers | Taskboard, behaviourally identical in three stacks; the binding path of each receiver, rung by rung; what each gains; clean versus layered as a binding choice | Figure 3: binding-path table; Table: sizes from `evaluation/metrics.json` | Ray |
| 5 | Use cases | The twelve use cases in six families, written stack-free; the WIP-limit steel thread; task deletion as the transfer case; two illustrative domains (ledger, dosing) | Figure 4: coverage grid | Ray |
| 6 | Evaluation | Violation seeding before and after (36 structural seeds at `8c4a74a`; 42 seeds now), the agent pilot by tier | Tables from `evaluation/results.json`, `runs.json`, `usage.json` | Colm |
| 7 | Discussion | Sanctity against ease of use; where each capability stops (V8, V10); EARS as a placement oracle; lean as the explanation | | Leigh, Colm |
| 8 | Threats to validity | One run per pilot cell; one small domain; one model vendor; author-and-agent construction; text-matching rules in TypeScript | | Colm |
| 9 | Conclusion | The capability, the evidence grade of each claim, what comes next | | Leigh |

The introduction and conclusion are written last, from the finished sections 3 to 7.

## 5. How to write a receiver

Sections 4 to 6 describe the implementations only as receivers. For each one:

1. Start from a benefit it received (a seed it caught, a departure the pilot did not show).
2. Trace that benefit back to the rung and rung pattern that produced it.
3. Show the binding in that stack, with a file reference at commit `8c4a74a` or later.
4. Say which rung it could not bind and what it uses instead (for example, Python has no L5
   for error mapping and binds a Closure Check at L3).

Do not describe a receiver's framework features for their own sake.

## 6. Rules of evidence

Every claim carries one of four grades, and the prose matches the grade.

| Grade | Wording allowed | Example |
| --- | --- | --- |
| Measured | "catches", "shows" | 42 of 42 seeded mistakes caught by the single gate (30 of 36 at `8c4a74a`) |
| Demonstrated | "can", "is possible" | The compiler catches an unmapped error in Java and TypeScript |
| Suggestive | "suggests", "is consistent with" | 2 of 6 departures without a manifest, 0 of 12 with one (one run per cell) |
| Hypothesis | "we propose", "we expect" | The EARS pattern of a requirement predicts its layer |

Other rules:

- Cite code as `path:line` against a named commit.
- Nothing marked Proposed on the companion pages may be described as built until it is in the
  repository and in the evaluation.
- The first iteration and the V9 fixture episode are reported, not hidden.
- The repository was built by the authors working with an AI coding agent; the paper says so.

## 7. Work before submission

The paper claims one capability carrying three kinds of intent. These items close the gap
between that claim and the code. Done items were verified locally in all three receivers on
29 September 2026.

- [x] Behaviour: unit and API tests are given / when / then scenarios citing requirement ids, in
      all three receivers (no Gherkin runner)
- [x] Requirements: `REQUIREMENTS.md` in each receiver, ten EARS rules with ids and a
      pattern-to-layer table
- [x] Closure Check: every requirement id is cited by a scenario, and every scenario cites one
- [x] Executable Rule for V8: logging and notification only in the events layer
- [x] Executable Rule for V10: routes make no decisions (Java: controllers construct no domain
      errors)
- [x] Teaching Failure: every architecture rule and the requirement check name the rule and the
      fix
- [x] Seeding extended with V13 and V14 and re-run: 42 of 42 caught
      (`evaluation/results.json`; the first paper's run is kept in `results-8c4a74a.json`)
- [x] Each manifest under 500 words (480 / 427 / 468)
- [ ] Re-run the pilot with more than one run per cell, against the current repository, and with
      the deletion task in EARS. This needs agent runs and cannot be done from the repository
      alone.
- [x] Full draft in `paper/` (LaTeX, 20 pages, five illustrations); builds with `latexmk -pdf`
- [ ] Swap the stand-in layout `paper/jotlocal.sty` for the official JOT template
- [x] Authors and affiliations: Leigh Griffin, Paul Power, Ray Carroll (Red Hat); Colm Dunphy (SETU)
- [ ] Run a systematic related-work search, and check every entry in `paper/references.bib` against its source

## 8. Open decisions

| Decision | Recommendation | Decided |
| --- | --- | --- |
| Gherkin files or scenario-named tests | Scenario-named tests: no new dependency | |
| A follow-up to the existing JOT submission, or a replacement | Follow-up that cites it, so data is not reported twice | |
| Keep "Intent Harness" as a name | Retire it; use Assertion Ladder throughout | |
| Include the two illustrative domains | Yes, clearly marked as illustrations | |
| Paper title | "The Assertion Ladder: Graduated Assertion for Embedding a Technical Domain in Repositories Shared with Coding Agents" | Working title |
