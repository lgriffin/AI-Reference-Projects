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

| Rung | Variant | Track | Capability delivered | New expertise | Mirrors upstream |
| --- | --- | --- | --- | --- | --- |
| 1 | `variants/rung-1-seed` | CLI | Course folder in, `tutors.json` out | TypeScript on Node, file system, the course format, discriminated unions | `packages/jsr/gen`, `packages/jsr/model`, `packages/jsr/tutors` |
| 2 | `variants/rung-2-lite` | UI (static) | A static HTML website from `tutors.json` | Markdown rendering, HTML templates, escaping, exhaustive rendering | `packages/jsr/tutors-lite` |
| 3 | `variants/rung-3-layers` | Architecture | The same tools as a layered pnpm workspace with ports | Workspaces, dependency direction, ports and adapters, architecture tests | `pnpm-workspace.yaml`, `packages/jsr/types`, `course-rules` ports, `tests/architecture` |
| 4 | `variants/rung-4-reader` | UI (app) | An interactive Svelte 5 reader for `tutors.json` | Svelte 5 runes, SvelteKit routing, components, Vite | `apps/reader`, `packages/svelte/ui-*` |
| 5 | `variants/rung-5-proven` | Testing | Tests as specification: EARS, BDD, contracts, conformance, mutation | EARS, Given/When/Then, honest doubles, golden files, mutation testing | `tests/`, `guides/testing`, `stryker.config.json` |
| 6 | `variants/rung-6-guarded` | Security | Safe content, private courses, a secure supply chain | XSS and sanitising, path containment, identity ports, RBAC, CSP, supply chain | `packages/jsr/identity`, `packages/svelte/utils/rbac`, `docs/security`, `SECURITY.md` |
| 7 | `variants/rung-7-shipped` | Releasing | A versioned, gated, containerised release with checked claims | CI, SemVer, changelogs, containers, release claims, SLOs | `.github/workflows`, `release/`, `Dockerfile`, tutors-release-harness |
| Summit | tutors-mono-repo | All | The real thing | Everything above, plus Supabase, realtime and the release harness | the whole repository |

Rungs 1 to 3 form one line: each starts from a copy of the rung below. Rungs 4 to 7 each start from a copy of
rung 3, so they can be taken in any order after Layers; the Summit topic composes them in the real mono-repo.

## Course map (`course/`)

| Topic folder | Rung | Track |
| --- | --- | --- |
| `topic-01-ladder` | Orientation | Tutors, the two ladders, setup, your first course |
| `topic-02-seed` | 1 | CLI |
| `topic-03-lite` | 2 | UI (static) |
| `topic-04-layers` | 3 | Architecture |
| `topic-05-reader` | 4 | UI (app) |
| `topic-06-proven` | 5 | Testing |
| `topic-07-guarded` | 6 | Security |
| `topic-08-shipped` | 7 | Releasing |
| `topic-09-summit` | Summit | Contributing to tutors-mono-repo with an agent, under the ladder |

Each rung topic holds:

- `<topic>.md`, the topic descriptor (`# Title` then a summary);
- `unit-1-<name>/` with a unit descriptor, two or three `talk-*` folders (each a `talk.md` and one Marp deck
  `<name>.marp` with `marp: true`, theme `default`), and `note-assertion/` mapping the rung's rules to L0 to L5;
- `unit-2-<name>/` with a unit descriptor, `book-lab-*/` (a lab: `00.Lab-NN-<Title>.md`, `01.<Title>.md`,
  ...), `book-assignment-*/` (a coding assignment with acceptance criteria and a grading test), and
  `web-*/` links (`weburl`, `https://` only) to the upstream files the rung mirrors and to external resources.

## Variant conventions

- TypeScript on Node 22.18 or later, run with built-in type stripping (`node src/main.ts`), so only erasable
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
- Each variant: `npm test` (rungs 1 and 2) or `pnpm test` (rung 3 and above) from its folder.

## Tags

A folder per rung stands in for a tag, because this repository holds the whole ladder. When the ladder moves to
its own repository, each rung becomes a tag (`rung-1-seed` to `rung-7-shipped`) on a history that adds one rung
per commit; rungs 4 to 7 become branches from `rung-3-layers` until they are composed.
