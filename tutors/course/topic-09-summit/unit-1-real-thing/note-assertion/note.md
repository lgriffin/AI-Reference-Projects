# Assertion levels in tutors-mono-repo

Where the real repository keeps its rules on the Assertion Ladder, so you know which level will catch your
agent, and where you must supply a level yourself. Paths are at the pinned commit `2b96b69`.

## The repository, level by level

| Level | Pattern | In tutors-mono-repo |
| --- | --- | --- |
| L0 Implied | - | conventions nobody wrote down; your reviewer may still mention them, which is how they climb |
| L1 Shown | Worked Slice | `docs/COURSE-PAGE-WALKTHROUGH.md` follows one page through about a dozen files; the reference course shows every learning-object kind |
| L2 Told | Short Manifest | `CONTRIBUTING.md`, `guides/`, `.github/PULL_REQUEST_TEMPLATE.md`, and `.claude/skills/ears-gherkin-dev/SKILL.md`; there is no `AGENTS.md` or `CLAUDE.md` |
| L3 Checked | Executable Rule | `tests/architecture/dependency-rules.test.ts` with `.dependency-cruiser.cjs`; `tests/architecture/realtime-boundary.test.ts`; EARS Rules run by `pnpm test:bdd` |
| L3 Checked | Closure Check | `pnpm check:release-claims` fails on a claim whose Rule id no feature defines; `pnpm check:slo` fails when the alerts drift from `release/slo.yaml` |
| L3 Checked | Ratchet | nine baselines that may only shrink, such as `tests/architecture/known-violations.txt` (listed in `guides/testing/TESTING-OVERVIEW.md`) |
| L4 Explained | Teaching Failure | `course-rules` messages that name the folder and the fix; the changelog hint check, which on a fork "fails and its log gives the exact title to use" (CONTRIBUTING.md) |
| L5 Prevented | Unrepresentable Mistake | TypeScript, checked by `pnpm check` (svelte-check) and Deno; `packages/jsr/types` imports nothing outside itself |
| all | Single Gate | the **CI success** job in `.github/workflows/ci.yml`; locally, `pnpm lint`, `pnpm test`, `pnpm check` |
| all | Human Boundary | `.github/CODEOWNERS`; `approvedBy` on a broad release claim, "a person, never a bot"; the release SOP's step 8 |

## What you add for each session

| Gap | What you add | Level |
| --- | --- | --- |
| No short manifest for agents | your session manifest, under 500 words | L2 |
| No rung fence | the manifest's "May touch" and "Must not touch" lists, checked by you against `git diff --stat` before every commit | L2, checked by a person |
| Agents edit tests to go green | "Ask a human first" before any change to a test, a baseline or a floor | Human Boundary |

## Climbing a rule

If your reviewer asks for something that no check would have caught, that rule is at L0 or L2. A good second
contribution is to move it one level up: a sentence in a guide, a test with a message that names the fix, or
a type that makes the mistake impossible. Climb until the risk is covered, then stop.
