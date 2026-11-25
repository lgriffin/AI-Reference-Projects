# A map from the ladder to the mono-repo

Where each rung lives in tutors-mono-repo, what the real repository adds that no rung covers, and a look back over the whole module through Bloom, Lean and the Assertion Ladder.

Every path in this note was checked against tutors-sdk/tutors-mono-repo at the pinned commit `2b96b69`
(2026-11-25) and tutors-sdk/tutors-release-harness at 1.63.0. Upstream moves quickly. When a path here no
longer exists, that is not a mistake in your clone: it is a finding, and perhaps a first contribution to this
module.

## 1. The map

The ladder is one straight line, and each variant is a copy of the rung below plus one capability. So rung 7
holds every capability, and each one has a home upstream.

| Rung | What you built | Its home upstream | The pattern to look for there |
| --- | --- | --- | --- |
| 1 Seed | course folder in, `tutors.json` out | `packages/jsr/gen` (the builder), `packages/jsr/model` (the types), `packages/jsr/tutors` (the command) | `loTypes` and `LoType` in `packages/jsr/model/src/types/type-utils.ts`: the kinds as one list, as in your `model.ts` |
| 2 Lite | a static site from `tutors.json` | `packages/jsr/tutors-lite` | templates and escaping; `src/run.ts` takes care that "a partial html/ folder is never presented as a finished build" |
| 3 Layers | a layered workspace with ports | `pnpm-workspace.yaml`, `packages/jsr/types`, the ports in `packages/jsr/course-rules`, `.dependency-cruiser.cjs`, `tests/architecture` | layers named `foundation`, `core`, `feature`, `ui-*`, `apps`, each a `layer-<name>` rule |
| 4 Proven | tests as specification | `tests/bdd/features` and `tests/bdd/steps`, `scripts/checks/ears-audit.ts`, `guides/testing`, `stryker.config.json`, `tests/mutation` | the requirement is the `Rule:` title; ids are `@rule-NNNN` |
| 5 Reader | a SvelteKit reader | `apps/reader`, `packages/svelte/course`, `packages/svelte/ui-primitives`, `ui-navigators`, `ui-components`, `packages/svelte/runes` | the same four layers your reader keeps under `src/lib` |
| 6 Guarded | safe content, private courses, a supply chain | `packages/svelte/ui-primitives/src/utils/sanitize.ts`, `packages/jsr/identity`, `packages/svelte/utils/rbac`, `tests/security`, `SECURITY.md`, `docs/security` | identity as a port: the rule `identity-provider-only-in-adapter` in `.dependency-cruiser.cjs` |
| 7 Shipped | a versioned, gated, containerised release | `.github/workflows` (17 files), `release/` (`SOP.md`, `claims.yaml`, `slo.yaml`), `Dockerfile`, tutors-release-harness | claims checked by `pnpm check:release-claims`; SLOs by `pnpm check:slo` |

A worked example of reading the map. On rung 3 you wrote an architecture test that stops `model` importing
`gen`. Upstream's version is `tests/architecture/dependency-rules.test.ts`. It runs dependency-cruiser with
the rules in `.dependency-cruiser.cjs` and compares the result with a baseline:

~~~
# Architecture violations that predate tier A (rules in .dependency-cruiser.cjs).
# This file may only shrink: the test fails on new violations and on entries
# that no longer occur. Format: `rule: from -> to`.
layer-core: packages/svelte/course/src/course/services/lo-tree.ts -> packages/svelte/themes/src/index.ts
~~~

That is `tests/architecture/known-violations.txt`. Your rung had no baseline, because it was built clean. A
real repository had history before it had rules, so it adds one more pattern: the Ratchet. You already know
everything else in that file.

Run both tests and the comparison is concrete. From the mono-repo:

~~~bash
pnpm exec vitest run tests/architecture/dependency-rules.test.ts tests/architecture/realtime-boundary.test.ts
~~~

~~~
 Test Files  2 passed (2)
      Tests  27 passed (27)
~~~

## 2. What the real repository adds

Each variant's `RUNG.md` has a "Deliberately left out" section. Read together, those sections are a list of
what is new at the Summit. None of it changes the centre: a course folder still becomes `tutors.json`, and a
reader still renders it.

**Supabase.** Signed-in use needs data that outlives a page. `supabase/migrations/` holds nine SQL migrations
at the pinned commit, the first `20260822_create_app_errors.sql`. `guides/MIGRATIONS.md` sets the rules:
changes expand before they contract, so that a rolling release never breaks the version still running, and
"a merged migration is never edited, deleted or renamed". `pnpm check:migrations` checks a new one. Browser
code may reach personal data only through `packages/svelte/data-api`, and
`tests/architecture/browser-data-access.test.ts` holds that line. With `PUBLIC_ANON_MODE=TRUE`, the default in
`.env.example`, none of it runs, which is why the quick start needs no backend.

**Realtime and live.** `packages/jsr/realtime` is a port. `packages/svelte/realtime-supabase` is its one
adapter. `apps/live` is the live classroom built on it. `tests/architecture/realtime-boundary.test.ts`
searches the code for anything that opens a channel and allows exactly two files. This is rung 3's ports and
adapters, used on something that costs money when it is misused.

**The catalogue, time and the validator.** `apps/catalogue` lists courses. `apps/time` shows student
activity, on the library in `packages/jsr/time`. `apps/validator` checks a published course or a local
archive with the same `packages/jsr/course-rules` that `check-course.sh` has run for you since week 1; rule
V020 ("Older generator format") lives in `apps/validator/src/lib/published.ts`. In anonymous mode the
catalogue, live and time apps start but show nothing, and CONTRIBUTING.md says so: "An empty page is
expected, not a broken setup."

**JSR publishing.** The libraries in `packages/jsr` are published to JSR by
`.github/workflows/jsr-publish.yml` when a final release is published: every library whose version JSR does
not yet serve, "each before the libraries that import it" (Rule 0775). `deno publish` signs in with GitHub's
OIDC token, so no token is stored. This is how the validator reaches a lecturer's `netlify.toml`.

**The release harness.** Rung 7's claims were promises that tests keep. Upstream's claims are intended
differences. A separate repository, tutors-release-harness, runs the candidate's images beside production's,
sends the same traffic through both, and fails "unless each diff hunk is claimed by a changelog entry or a
Rule". Because it is separate it "cannot be quietly weakened by the PR it is judging". `release/SOP.md` is
the standard work around it: three roles, twelve steps, each with an owner and a done-when.

**Service level objectives.** `release/slo.yaml` states what each app aims for over 28 days; the reader's
availability target is `0.995`. Grafana's alerts are generated from that file, and `pnpm check:slo` fails
when the two differ. `docs/slo.md` explains the targets and is careful to call them indicative.

**The OpenSSF Scorecard.** `.github/workflows/scorecard.yml` runs weekly, on Mondays at 07:20 UTC, and on
branch protection changes. `codeql.yml` scans the code, `zizmor.yml` audits the workflows, and
`image-build.yml` signs every image with cosign from GitHub's OIDC identity.

One more difference is practical. The variants run on Node 22.18 or later. Upstream's `package.json` asks for
Node 26.13.0 or later and pnpm 11.24.0, and `.nvmrc` pins the Node that CI uses. Install that before the lab.

## 3. Looking back through the Assertion Ladder

Each week's note has said which levels guard that week's rules. Here is the same question asked of the whole
upstream repository. Every path is real; open each one.

| Level | Pattern | How tutors-mono-repo keeps rules at this level |
| --- | --- | --- |
| L0 Implied | none | conventions nobody wrote down. When a reviewer mentions one, it has just climbed to L2 for you, and you can carry it higher |
| L1 Shown | Worked Slice | `docs/COURSE-PAGE-WALKTHROUGH.md` follows one page through the code; `tests/fixtures/tutors-json-history/` keeps real `tutors.json` files from earlier generators; the reference course shows every kind |
| L2 Told | Short Manifest | `CONTRIBUTING.md`, `guides/`, `.github/PULL_REQUEST_TEMPLATE.md`, `release/SOP.md`, and one agent skill, `.claude/skills/ears-gherkin-dev/SKILL.md`. There is no `AGENTS.md` and no `CLAUDE.md` |
| L3 Checked | Executable Rule | `tests/architecture/dependency-rules.test.ts`; `tests/architecture/realtime-boundary.test.ts`; 441 EARS Rules in 85 feature files, run by `pnpm test:bdd` |
| L3 Checked | Closure Check | `pnpm check:release-claims` (a claim must cite a Rule that exists); `pnpm check:slo` (alerts match objectives); `pnpm check:generator-diff` (a change in generated output must match `tests/generator/claims.yaml`) |
| L3 Checked | Ratchet | nine baselines that may only shrink, listed in `guides/testing/TESTING-OVERVIEW.md`, and floors in `tests/suite-health/coverage-floors.json` |
| L4 Explained | Teaching Failure | `scripts/checks/ears-audit.ts`, whose every finding names the rule and the fix; `packages/jsr/course-rules`, whose messages are "written for a lecturer" (`src/finding.ts`); the changelog hint job, which on a fork "fails and its log gives the exact title to use" |
| L5 Prevented | Unrepresentable Mistake | `LoType` derived from the one list `loTypes`; `permissions: contents: read` at the top of `ci.yml`, so a job cannot write whatever its steps try; row level security in `supabase/migrations/20260924_enable_rls_public_tables.sql`, where the database itself refuses |
| all | Single Gate | the **CI success** job in `.github/workflows/ci.yml`; locally `pnpm lint`, `pnpm test`, `pnpm check` |
| all | Human Boundary | `.github/CODEOWNERS`; `approvedBy` on a broad claim, "a person, never a bot" (`release/README.md`); the reviewer's glance, step 8 of the SOP |

Here is L4 at work. This Rule was written badly on purpose and checked with
`pnpm test:ears:audit --strict <file>`:

~~~gherkin
  @rule-0786 @ears-ubiquitous
  Rule: The walkthrough should be accurate and shall name files and shall be up to date.
~~~

~~~
obligation-keyword: Rule title uses "should"; the obligation keyword is "shall".
shall-count: Rule title has 2 "shall"; a requirement has exactly one.
system-name: The word before "shall" must be a system name: tutors, the reader, the catalogue, the live dashboard, the time dashboard, the data API.
FAIL: 1 feature file(s), 1 Rule(s), 4 new violation(s), 0 baselined, 0 stale baseline entries.
~~~

(The fourth finding, `unbound-feature`, says no steps file loads the feature yet.) You met `shall-count` and
`system-name` on rung 4, in a smaller audit with the same names. That was not a coincidence: rung 4 mirrors
this file.

Two gaps matter to you this week. First, the repository gives an agent a great deal to obey at L3 and L4 but
little to read first at L2, and nothing that fences it. Your session manifest supplies both, and you check
the fence by eye with `git diff --stat`. Second, some rules sit lower than their risk deserves. The
walkthrough is the example: section 2 names `apps/reader/src/routes/+layout.server.ts`, and the file in the
repository is `apps/reader/src/routes/+layout.ts`. The completeness tier does check documentation
(`tests/completeness/completeness.test.ts` "flags dead file links and dead anchors, ignoring URLs and code"),
but a path in backticks is code to that check, so the drift passed. "The walkthrough names only files that
exist" is told, not checked. Whether it should climb is an Evaluate question, and the capstone asks it.

## 4. Looking back through Bloom

The module was designed so that its centre of gravity rises. Here is what you can now do at each level, with
the evidence you already hold.

| Level | You can now | Your evidence |
| --- | --- | --- |
| Remember | list the learning-object kinds and the files each needs; name the six levels of the Assertion Ladder and the five EARS patterns | weeks 1 and 6 |
| Understand | explain how a course folder becomes `tutors.json` and then a page; explain why escaping is by construction; read a Rung Fence message | weeks 1 to 3, and the map above |
| Apply | extend a generator, a site and a reader inside a fence; work test-first; run a release's checks | assignments A1, A2, A5 |
| Analyse | diagnose a red architecture test with Five Whys; trace a requirement to its Rule, steps and code; compare a variant with its oracle | weeks 5, 6 and 8; assignments A3, A4 |
| Evaluate | critique a requirement; judge a suite by its mutation score; decide which defence and which level fits a risk; judge release readiness from an A3 | weeks 7, 10 and 11; assignments A6, A7 |
| Create | specify a capability before building it; write a new check with a teaching message; design a release claim | every "Specify first" since week 7, and A8 this week |

Week 12 sits at Evaluate and Create because a contribution to someone else's repository is mostly judgement:
what is worth changing, how small it can be, which rule it touches, what evidence would convince a reviewer.
The typing is the small part, and it is the part an agent does well. The judgement is yours.

## 5. Looking back through Lean

**Value.** Week 1 mapped the Tutors value stream from a lecturer's folder to a student's screen. Every rung
improved one step of it: the generator (1), a site with no server (2), a codebase that can be changed safely
(3 and 4), the reader students actually use (5), content they can trust (6), and a release a lecturer can
rely on (7). This week's customer is new: the next contributor, and the maintainer who reviews your pull
request.

**Standard work.** You have followed standard work all module: the Single Gate, each `AGENTS.md`, each rung's
standard version, and from week 7 the weekly rhythm of specify first, see red, make green, run the gate,
reflect. Upstream has its own: `CONTRIBUTING.md`, the eight steps of the EARS skill, the pull request
template, and `release/SOP.md`, which says of itself that "skipping a step is not a fast release; it is a
deviation, and it is logged".

**Waste the ladder removed.**

| Waste | What removed it | Upstream counterpart |
| --- | --- | --- |
| Extra features (AI sprawl is overproduction) | the Rung Fence | none: your session manifest |
| Relearning | Teaching Failures that name the fix | `scripts/checks/ears-audit.ts`; `course-rules` messages |
| Lists drifting apart | the closure audit (rung 4), `package-variants.sh --check` | `pnpm check:release-claims`, `pnpm check:slo` |
| Defects found late | escaping by construction (rung 2), sanitising (rung 6), the gate | types, the Rules, the harness |
| Waiting | a gate fast enough to run on every change | three local checks; the rest in CI |
| Handoffs | one manifest and one gate that people and agents share | the pull request template |
| Partially done work | "done" means the gate is green | **CI success** |

**Root cause.** Five Whys on the walkthrough drift, as a model for your A3. Why does the walkthrough name a
file that does not exist? Because the code changed and the document did not: the root load is now
"universal, not a server load (Rule 0771)", as the comment at the top of `+layout.ts` says. Why was the document not
changed in the same pull request? Because nothing told the author it mentions that file. Why did nothing
tell them? Because the documentation check reads links, not paths in backticks. Why? Because backticks
usually hold code, which cannot be looked up. The root cause is a rule kept at L2 that one small check could
keep at L3. Notice what the chain did not say: it never blamed a person. The SOP puts it well: "Human error"
is never an answer; it is the prompt for the next why.

**Kaizen upstream.** The countermeasure comes in two sizes. The small one corrects the line. The lasting one
makes the drift fail a build. Kaizen prefers the small one first, done properly and merged, and then the
next. One small improvement that lands is worth more than a large one that waits in review. That is this
week's lab, and the capstone.

## Which levels guard this week's rules

| Rule | Level |
| --- | --- |
| A behavioural change starts as an EARS Rule the human approves | L2 (`SKILL.md`, `CONTRIBUTING.md`), then L4 (`pnpm test:ears:audit`) |
| The agent changes only the files on the "May touch" list | L2 (your session manifest), checked by you with `git diff --stat` |
| Baselines and floors are never loosened to go green | L3 Ratchet, and "Ask a human first" in your manifest |
| A pull request merges only when every CI job passes and a person approves | Single Gate and Human Boundary (`ci.yml`, `CODEOWNERS`) |
| Documentation names files that exist | L2 today for backticked paths; L3 for links (`tests/completeness`) |

## Self-check

1. **(Remember)** Which upstream folders does rung 1 mirror, and which rung mirrors `packages/jsr/tutors-lite`?
2. **(Understand)** Explain why upstream's quick start needs no Supabase, naming the variable and the file
   that sets it.
3. **(Understand)** Rung 7's claims and upstream's claims use the same file name. Explain the difference in
   what a claim means.
4. **(Apply)** A pull request changes `apps/reader/src/routes/(course-reader)/+layout.svelte` and
   `packages/svelte/utils/rbac/src/permissions.ts`. Which rungs must its author have finished?
5. **(Analyse)** `tests/architecture/known-violations.txt` has a line your fix makes untrue. What happens in
   CI if you leave the line in, and why is that the right behaviour?
6. **(Analyse)** For each, name the Assertion Ladder level and the file that keeps it: "only the Supabase
   adapter opens a realtime channel"; "a broad claim is approved by a person"; "a Rule has exactly one shall".
7. **(Evaluate)** Should "the walkthrough names only files that exist" climb from L2 to L3? Give one argument
   for and one against, and say what the check would cost to maintain.
8. **(Evaluate)** Upstream has no `AGENTS.md`. Would proposing one be a good first contribution? Consider who
   owns standard work, and how `release/SOP.md` says it may be changed.
9. **(Create)** Write an EARS Rule, in upstream's style with a system name from the audit's list, for one
   behaviour of the reader that you can observe in the browser, and one scenario beneath it.
