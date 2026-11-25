# The Tutors Capability Ladder

This folder applies the Assertion Ladder ([`docs/assertion-ladder.md`](../docs/assertion-ladder.md)) to a real
codebase, [tutors-sdk/tutors-mono-repo](https://github.com/tutors-sdk/tutors-mono-repo). It holds two things:

- **`variants/`**: simpler, runnable versions of Tutors, one per rung. Each rung needs a little more expertise
  than the one below and delivers a major new capability. The top of the ladder is the full mono-repo.
- **`course/`**: a Tutors course (compliant with
  [tutors-sdk/tutors-reference-course](https://github.com/tutors-sdk/tutors-reference-course)) that walks a
  potential contributor up the ladder with Marp talks, labs and coding assignments.

Upstream pins, used in every "where this lives upstream" table:

| Repository | Commit | Date |
| --- | --- | --- |
| tutors-sdk/tutors-mono-repo | `2b96b69b6e99ffde04cf29a17b7e377e9d9c9510` | 2026-11-25 |
| tutors-sdk/tutors-release-harness | `5b80358d033250fcb490212198f6c2a953462c2b` (1.63.0) | 2026-11-11 |
| tutors-sdk/tutors-reference-course | `16187b2bb8f5f51c71a31412ad6e82510c409d49` | 2026-10-02 |

## Two ladders, one course

The **capability ladder** is what the learner builds. The **Assertion Ladder** (L0 Implied, L1 Shown, L2 Told,
L3 Checked, L4 Explained, L5 Prevented) is how each rung is kept safe when the learner works with a coding
agent. Every variant carries its own short manifest (`AGENTS.md`, L2) and a **Rung Fence**: an executable
rule (L3) whose failure explains itself (L4) and stops an agent from building beyond the rung, such as adding
a framework, a network call or a dependency that a later rung introduces. The fence protects the learner from
receiving code they cannot yet understand. Climbing a rung means lifting the fence on purpose.

| Pattern | Problem | Solution |
| --- | --- | --- |
| Rung Fence | How is a learner kept from receiving code above their rung? | An executable rule that lists what the rung may use, fails with the rung that introduces anything else, and is changed only by a person. |
| Rung Delta | How does a learner see what a rung adds? | Each variant's `RUNG.md` names the capability added, the expertise it needs and the upstream files it mirrors. |

## The rungs

The ladder is one straight line. Each variant starts from a copy of the rung below and adds one major
capability. Testing sits at rung 4, straight after Layers, so that every later rung is specified first: its new
capability arrives as EARS requirements and Given/When/Then scenarios in a growing `REQUIREMENTS.md`, held
together by the closure audit.

| Rung | Variant | Track | Capability delivered | New expertise | Mirrors upstream |
| --- | --- | --- | --- | --- | --- |
| 1 | `variants/rung-1-seed` | CLI | Course folder in, `tutors.json` out | TypeScript on Node, file system, the course format, discriminated unions | `packages/jsr/gen`, `packages/jsr/model`, `packages/jsr/tutors` |
| 2 | `variants/rung-2-lite` | UI (static) | A static HTML website from `tutors.json` | Markdown rendering, HTML templates, escaping, exhaustive rendering | `packages/jsr/tutors-lite` |
| 3 | `variants/rung-3-layers` | Architecture | The same tools as a layered pnpm workspace with ports | Workspaces, dependency direction, ports and adapters, architecture tests | `pnpm-workspace.yaml`, `packages/jsr/types`, `course-rules` ports, `tests/architecture` |
| 4 | `variants/rung-4-proven` | Testing | Tests as specification: EARS, BDD, closure, contracts, conformance, properties, mutation | EARS, Given/When/Then, honest doubles, golden files, property-based and mutation testing, Vitest | `tests/`, `guides/testing`, `stryker.config.json` |
| 5 | `variants/rung-5-reader` | UI (app) | An interactive SvelteKit / Svelte 5 reader, specified in EARS and BDD | Svelte 5 runes, SvelteKit routing and load, components, Vite, browser tests | `apps/reader`, `packages/svelte/ui-*` |
| 6 | `variants/rung-6-guarded` | Security | Safe content in the site and the reader, private courses, a secure supply chain | XSS and sanitising, CSP, path containment, identity ports, RBAC, supply chain | `packages/jsr/identity`, `packages/svelte/utils/rbac`, `docs/security`, `SECURITY.md` |
| 7 | `variants/rung-7-shipped` | Releasing | A versioned, gated, containerised release with checked claims | CI, SemVer, changelogs, containers, release claims, SLOs | `.github/workflows`, `release/`, `Dockerfile`, tutors-release-harness |
| Summit | tutors-mono-repo | All | The real thing | Everything above, plus Supabase, realtime and the release harness | the whole repository |

## The 12 week module (`course/`)

One topic per week. Each week opens by saying which rung of the ladder the class is on, gives a teaching
element with depth (talks plus a grounded reading note with worked examples from the variants and upstream),
and has exactly one lab. The class moves to the next variant every one to three weeks, by complexity. Every
lab ends with a "Build beyond" step, because students are expected to take each variant further than it goes.
The last week of each rung also carries that rung's coding assignment and its exit criteria.

| Week | Topic folder | Rung | Teaching focus |
| --- | --- | --- | --- |
| 1 | `topic-01-seed-format` | 1 Seed | Tutors, the two ladders, the course format as data, a first CLI |
| 2 | `topic-02-seed-types` | 1 Seed | Discriminated unions, exhaustiveness and `never`, conformance to an oracle |
| 3 | `topic-03-lite` | 2 Lite | Static sites, a Markdown subset, escaping by construction |
| 4 | `topic-04-layers-workspace` | 3 Layers | Workspaces, packages, dependency direction |
| 5 | `topic-05-layers-ports` | 3 Layers | Ports and adapters, architecture tests, the Honest Double |
| 6 | `topic-06-proven-ears` | 4 Proven | Requirements with EARS, the closure audit, test-first |
| 7 | `topic-07-proven-bdd` | 4 Proven | BDD with Given/When/Then, properties, mutation testing |
| 8 | `topic-08-reader-routes` | 5 Reader | SvelteKit routing and load, `tutors.json` as the contract |
| 9 | `topic-09-reader-components` | 5 Reader | Svelte 5 runes, components, browser tests |
| 10 | `topic-10-guarded` | 6 Guarded | Threat model, XSS, CSP, containment, identity, RBAC, supply chain |
| 11 | `topic-11-shipped` | 7 Shipped | Releases, claims and evidence, SLOs, containers, CI |
| 12 | `topic-12-summit` | Summit | From rung 7 to tutors-mono-repo; contributing with an agent under the ladder |

Concepts are reinforced, not taught once. EARS is previewed in weeks 1 to 5 (each lab's "Name the rule" step
writes the week's rule as an informal "shall" sentence), taught in week 6, and from week 7 on every lab begins
with "Specify first": an EARS requirement and a scenario for the week's capability, added to the variant's
`REQUIREMENTS.md` and features. The same holds for the Assertion Ladder: each week's reading note says which
rungs (L0 to L5) guard that week's rules.

Each week topic holds:

- `<topic>.md`, the topic descriptor: `# Week N: <Title>`, then a line `Rung R of 7: <Name>` and a summary;
- `unit-1-teach/` with a unit descriptor, one or two `talk-*` folders (each a `talk.md` and one Marp deck
  `<name>.marp` with `marp: true`, theme `default`), and one or more `note-*` reading notes with depth;
- `unit-2-practice/` with a unit descriptor, exactly one `book-lab-weekNN-*/` lab (`00.Lab-NN-<Title>.md`,
  `01.<Title>.md`, ...; step 01 is "Where we are on the ladder"; the last step is "Build beyond"), in a rung's
  final week one `book-assignment-*/`, and `web-*/` links (`weburl`, `https://` only) to the upstream files
  mirrored and to official learning resources.

## Grounded in Bloom's taxonomy

The module is designed with constructive alignment against the revised Bloom's taxonomy (Anderson and
Krathwohl, 2001): Remember, Understand, Apply, Analyse, Evaluate, Create. Every outcome, activity and
assessment names its level, and the levels line up.

- **Each week** states three to five learning outcomes, each beginning with a measurable verb tagged with its
  level, for example "(Apply) Run the seed generator on a course folder and explain each field of the output".
  Outcomes never use unmeasurable verbs such as "know" or "be aware of".
- **Within a week** the work climbs the levels: the talks and reading note serve Remember and Understand (and
  end with self-check questions tagged by level); the lab steps are tagged with their level and move through
  Apply and Analyse; "Name the rule" and "Specify first" are Evaluate-and-Create work on requirements; "Build
  beyond" is Create.
- **Within a rung** the first week leans on Understand and Apply, the last week on Analyse and Evaluate, and
  the rung's coding assignment is assessed at Create, with acceptance criteria mapped to outcomes.
- **Across the module** the centre of gravity rises: weeks 1 to 3 are mostly Remember to Apply, weeks 4 to 7
  mostly Apply to Analyse, weeks 8 to 11 mostly Analyse to Evaluate, and week 12 is Evaluate and Create on the
  real tutors-mono-repo.
- **The two ladders meet Bloom.** Reading a Rung Fence message is Understand; fixing the code it names is
  Apply; seeding a violation to see which Assertion Ladder rung catches it is Analyse; deciding how far a rule
  should climb (L2 told, L3 checked, L5 prevented) is Evaluate; writing a new fence or check is Create.

| Weeks | Rung | Dominant Bloom levels | Typical evidence |
| --- | --- | --- | --- |
| 1-2 | 1 Seed | Remember, Understand, Apply | explain the course format; run and extend the generator |
| 3 | 2 Lite | Understand, Apply | render a site; explain why escaping is by construction |
| 4-5 | 3 Layers | Apply, Analyse | restructure into packages; diagnose a layering failure |
| 6-7 | 4 Proven | Analyse, Evaluate | write and critique EARS rules; judge a test suite by mutation score |
| 8-9 | 5 Reader | Apply, Analyse, Evaluate | specify and build reader features; trace a route through the code |
| 10 | 6 Guarded | Analyse, Evaluate | model threats; judge which defence and which rung fits a risk |
| 11 | 7 Shipped | Evaluate, Create | judge release readiness from evidence; design a release claim |
| 12 | Summit | Evaluate, Create | contribute a change upstream under the ladder |

`course/course.md` carries the module-level learning outcomes, each tagged with its level, and a table showing
which weeks teach and which assignments assess each one.

## Variant conventions

- TypeScript on Node 22.18 or later (the upstream mono-repo itself needs Node 26.13 or later), run with built-in type stripping (`node src/main.ts`), so only erasable
  syntax: no `enum`, no `namespace`, no parameter properties, `import type` for types. Tests use `node --test`.
- Rungs 1 and 2 have **no runtime dependencies** and need no install. Rung 3 introduces pnpm workspaces and
  TypeScript as a dev dependency for `tsc --noEmit`. Rungs 4 to 7 may add the dependencies their capability
  needs, each named in `RUNG.md` and allowed by the fence.
- Each variant has `README.md` (run it in three commands), `RUNG.md` (Rung Delta: capability, expertise,
  upstream mirror table with paths), `AGENTS.md` (Short Manifest, under 500 words, with "Rung Fence" and
  "Ask a human first" sections), `package.json` whose `test` script is the Single Gate, and
  `tests/rung-fence.test.ts`.
- The model keeps upstream names: `Course`, `Topic`, `Unit`, `Side`, `Talk`, `Lab`, `LabStep` (upstream
  `LabStep`/`los` on a lab), `Note`, `Web`, `Archive`, and the `type` strings `"course"`, `"topic"`, `"unit"`,
  `"side"`, `"talk"`, `"lab"`, `"note"`, `"web"`, `"archive"` (see `packages/jsr/model/src/types`).
- Shared fixture: `variants/fixtures/ladder-sample-course/`, a small compliant course used by every variant's
  tests. Its upstream-generated `tutors.json` is kept beside it as `variants/fixtures/ladder-sample-course.tutors.json`.

## Checks

- `tutors/scripts/check-course.sh [folder]` validates a course with the upstream course rules and builds it
  with the upstream generator. Run it on `course/` and on the shared fixture. Zero errors is required;
  warnings are fixed unless explained here.
- Each variant: `npm test` (rungs 1 and 2) or `pnpm install && pnpm test` (rung 3 and above) from its folder.
- Assignment grading tests live in each variant's `tests/assignment/` and skip unless `LADDER_ASSIGNMENT=1`, so
  the gate stays green until a learner takes the assignment on.

## Tags

A folder per rung stands in for a tag, because this repository holds the whole ladder. When the ladder moves to
its own repository, each rung becomes a tag (`rung-1-seed` to `rung-7-shipped`) on a history that adds one rung
per commit.
