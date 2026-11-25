# Tutors Ladder

A course, and a ladder of runnable variants, for people who want to contribute to
[Tutors](https://github.com/tutors-sdk/tutors-mono-repo). Learners rebuild Tutors from its simplest form, a
script that turns a course folder into `tutors.json`, up to the full mono-repo. Each rung needs a little more
expertise and delivers a major new capability. The Assertion Ladder from the paper in this repository
([`docs/assertion-ladder.md`](../docs/assertion-ladder.md)) keeps each rung safe to work on with a coding agent:
every variant has a short manifest (L2) and a Rung Fence (L3/L4) that stops an agent from building beyond the
learner's rung.

[`LADDER.md`](LADDER.md) is the governing design: the rungs, the course map, the conventions and the upstream pins.

## The ladder

| Rung | Variant | Track | What the learner builds | Gate |
| --- | --- | --- | --- | --- |
| 1 | [`rung-1-seed`](variants/rung-1-seed) | CLI | Course folder to `tutors.json`, zero dependencies, conformance against the upstream generator | `npm test` |
| 2 | [`rung-2-lite`](variants/rung-2-lite) | UI (static) | A static website with a hand-written Markdown subset and escaping by construction | `npm test` |
| 3 | [`rung-3-layers`](variants/rung-3-layers) | Architecture | A pnpm workspace: model, gen behind a FileSystemPort, lite, cli; architecture tests | `pnpm test` |
| 4 | [`rung-4-reader`](variants/rung-4-reader) | UI (app) | A SvelteKit 3 / Svelte 5 reader with upstream's component and route names | `pnpm test`, `pnpm test:e2e` |
| 5 | [`rung-5-proven`](variants/rung-5-proven) | Testing | EARS requirements, BDD, closure audit, honest doubles, fast-check, Stryker (93% mutation score) | `pnpm test`, `pnpm test:mutation` |
| 6 | [`rung-6-guarded`](variants/rung-6-guarded) | Security | URL allow-listing with an XSS corpus, CSP, path containment, identity port, RBAC, supply-chain checks | `pnpm test` |
| 7 | [`rung-7-shipped`](variants/rung-7-shipped) | Releasing | SemVer from Conventional Commits, release claims with evidence, SLOs, a pinned container, a CI template, a readiness A3 | `pnpm test` |
| Summit | tutors-mono-repo | All | Compose rungs 4 to 7, then contribute upstream | the repository's own gates |

Rungs 1 to 3 are a line; rungs 4 to 7 each start from rung 3.

## The course

[`course/`](course) is a Tutors course in the format of
[tutors-reference-course](https://github.com/tutors-sdk/tutors-reference-course): nine topics, 26 Marp talks,
10 labs, 8 coding assignments with grading tests, and links to the upstream files each rung mirrors.

| Topic | Rung |
| --- | --- |
| `topic-01-ladder` | Orientation: Tutors, the two ladders, setup, a first course |
| `topic-02-seed` to `topic-08-shipped` | Rungs 1 to 7 |
| `topic-09-summit` | Contributing to tutors-mono-repo with an agent, under the ladder |

## Checks

```bash
# The course: upstream course rules, then the upstream generator (needs Deno 2 and a tutors-mono-repo clone)
TUTORS_MONO_REPO=../tutors-mono-repo tutors/scripts/check-course.sh tutors/course

# A variant
cd tutors/variants/rung-3-layers && pnpm install && pnpm test
```

At the time of writing the course validates with no errors or warnings and builds to `tutors.json`, and every
variant's gate passes from a clean install.

Built openly with Claude, as the rest of this repository is.
