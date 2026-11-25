# Tutors Ladder

A 12 week module, and a ladder of runnable variants, for people who want to contribute to
[Tutors](https://github.com/tutors-sdk/tutors-mono-repo). Students rebuild Tutors from its simplest form, a
script that turns a course folder into `tutors.json`, up to the full mono-repo. Each rung needs a little more
expertise and delivers a major new capability. The Assertion Ladder from the paper in this repository
([`docs/assertion-ladder.md`](../docs/assertion-ladder.md)) keeps each rung safe to work on with a coding agent:
every variant has a short manifest (L2) and a Rung Fence (L3/L4) that stops an agent from building beyond the
student's rung.

[`LADDER.md`](LADDER.md) is the governing design: the rungs, the 12 week plan, the grounding in Bloom's
taxonomy, the Lean thread, the standard version, the conventions and the upstream pins.

## The ladder: one straight line

Each variant is a copy of the rung below plus one capability. From rung 4 on, every new behaviour is specified
first as an EARS requirement with Given/When/Then scenarios.

| Rung | Variant | Track | What it adds | Weeks |
| --- | --- | --- | --- | --- |
| 1 | [`rung-1-seed`](variants/rung-1-seed) | CLI | Course folder to `tutors.json`, zero dependencies, conformance against the upstream generator | 1-2 |
| 2 | [`rung-2-lite`](variants/rung-2-lite) | UI (static) | A static website with a hand-written Markdown subset and escaping by construction | 3 |
| 3 | [`rung-3-layers`](variants/rung-3-layers) | Architecture | A pnpm workspace: model, gen behind a FileSystemPort, lite, cli; architecture tests | 4-5 |
| 4 | [`rung-4-proven`](variants/rung-4-proven) | Testing | EARS requirements, BDD, closure audit, honest doubles, properties, mutation testing | 6-7 |
| 5 | [`rung-5-reader`](variants/rung-5-reader) | UI (app) | A SvelteKit 3 / Svelte 5 reader with upstream's component and route names, browser tests | 8-9 |
| 6 | [`rung-6-guarded`](variants/rung-6-guarded) | Security | URL allow-listing with an XSS corpus, CSP, path containment, identity port, RBAC, supply-chain checks | 10 |
| 7 | [`rung-7-shipped`](variants/rung-7-shipped) | Releasing | SemVer from Conventional Commits, release claims with evidence, SLOs, a pinned container, a CI template, a readiness A3, a measured value stream | 11 |
| Summit | tutors-mono-repo | All | A contribution to the real repository, under the ladder | 12 |

## The module

[`course/`](course) is a Tutors course in the format of
[tutors-reference-course](https://github.com/tutors-sdk/tutors-reference-course): one topic per week. Every
week says which rung the class is on, teaches with talks and a long reading note grounded in the variants and
in upstream, and has exactly one lab. In all: 24 Marp talks, 17 reading notes, 12 labs, 8 assignments with
grading tests (A1 to A7) or a marking rubric (A8), and 7 standard-version zips.

- **Bloom's taxonomy.** Module outcomes M1 to M8 and every week's outcomes carry their level; lab steps and
  self-check questions are tagged; assignments are assessed at Create; the levels rise across the module.
- **Lean.** Value, standard work and waste elimination run through every week; each lab ends with a Kaizen
  step; week 5 teaches Five Whys on a red build; week 11 maps the release value stream and reads an A3.
- **Reinforcement.** Weeks 1 to 5 preview EARS in a "Name the rule" step, week 6 teaches it, and weeks 7 to
  11 open every lab with "Specify first". Every lab ends with "Build beyond".

## The standard version

Each rung's completed code ships to students as a zip in the rung's final week, so the class builds on one
standard version. `scripts/package-variants.sh` stages a clean copy, installs it, runs its gate (which
compiles and tests), runs it on the sample course, and only then writes the zip. `--check` fails if a shipped
zip no longer matches its variant.

## Checks

```bash
# The course: upstream course rules, then the upstream generator (needs Deno 2 and a tutors-mono-repo clone)
TUTORS_MONO_REPO=../tutors-mono-repo tutors/scripts/check-course.sh tutors/course

# Every variant: clean install, gate, showcase, and the zip in the course is current
tutors/scripts/package-variants.sh --check

# One variant by hand
cd tutors/variants/rung-4-proven && pnpm install && pnpm test
```

Built openly with Claude, as the rest of this repository is.
