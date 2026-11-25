# Rung 7: Shipped

Rung 6's workspace, its reader, its tests, its requirements and its defences, made releasable. A SemVer
version and a Keep a Changelog file derived from Conventional Commits, release claims that each name their
requirements and their tests, budgets the build must keep, a build identity in every site, a container
image that serves the site as a user that is not root, a CI workflow with every action pinned by SHA, a
one-page readiness A3 that says whether the release is ready to tag, and a value stream map that says how
long getting there took. It was specified first: eight new EARS requirements (`R-037` to `R-044`) and
their Given/When/Then scenarios. It adds one dev dependency, `yaml`, and nothing to the product.

## Run it in three commands

    pnpm install                   # rung 6's tools, plus yaml for the release scripts
    pnpm test                      # the Single Gate: tsc, svelte-check, every Vitest tier, then the reader's build
    pnpm release:readiness         # the readiness A3 for this version, in out/readiness.md

`pnpm start ../fixtures/ladder-sample-course out` still builds the site; `out/version.json` now says which
release and commit built it, and `pnpm start --version` prints the same.

## The release commands

| Command | What it does | Exit codes | Upstream |
| --- | --- | --- | --- |
| `pnpm release:version --from v1.0.0 [--write]` | the next SemVer version and its changelog section, from Conventional Commits (`--commits <file>` reads messages from a file) | 0, 2 on bad input | `scripts/release-changelog.ts` (drafts the changelog) |
| `pnpm release:claims` | the Closure Check: every promise in `release/claims.yaml` names evidence that exists and runs, and requirements that exist | 0, 1 with teaching messages | `scripts/checks/release-claims.ts` |
| `pnpm release:slo` | builds the reader, builds the fixture site three times, and judges `release/slo.yaml`'s budgets | 0, 1 with teaching messages | `scripts/checks/slo.ts`, `scripts/checks/bundle-budget.ts` |
| `pnpm container:smoke [--dry-run]` | builds the image, runs it read-only with no capabilities, checks `/version.json`; skips, saying why, when no Docker daemon answers | 0 (passed or skipped), 1 | `scripts/checks/container-smoke.ts` |
| `pnpm release:readiness` | writes the readiness A3, `out/readiness.md` (advisory: always 0) | 0 | the release harness's A3 (`src/a3`) |
| `pnpm release:value-stream [--with mutation] [--only a,b] [--skip a,b] [--wait step=seconds]` | runs the SOP's steps in order, times each, stops the line on a failure, and prints the value stream map with its lead time; also `out/value-stream.md` | 0, 1 when a step failed, 2 on bad input | the Budget column of `release/SOP.md`; the harness A3's value stream map |

The steps, their owners and when each is done are in [`release/SOP.md`](release/SOP.md). Docker Hub may
rate-limit pulls; `LADDER_REGISTRY=mirror.gcr.io/library pnpm container:smoke` pulls the same digests from a
mirror.

Everything from rung 6 still runs:

    pnpm start ../fixtures/ladder-sample-course out        # the sample course, as every rung builds it
    pnpm start --private tests/fixtures/private-course out # a course whose properties.yaml says auth: 1
    pnpm dev                       # the reader, serving the sample, hostile and private courses
    pnpm test:e2e                  # the built reader in Chromium (a release runs it: SOP step 4)
    pnpm test:mutation             # Stryker, now also over the release logic; then pnpm check:mutation-floors
    pnpm audit:supply-chain        # offline: lockfile, registry sources, allowances
    pnpm test:assignment           # the grading test for Assignment 7, which the gate skips

Run `pnpm exec playwright install chromium` once if you have no browser.

## What a release promises

`release/claims.yaml` holds fourteen promises. Each rests on requirements and is kept by tests:

| Claim | Promise, in short | Rests on | Evidence from |
| --- | --- | --- | --- |
| `generator-conforms` | the same course tree and fields as upstream's build of the fixture | R-007 | conformance |
| `course-text-escaped` | course text never reaches a page unescaped | R-008 | lite |
| `no-inline-script` | no page runs inline script; the static site allows no script at all | R-023, R-034 | lite, a scenario, Chromium |
| `hostile-content-neutralised` | an address aimed at script is shown as text | R-022, R-033 | the XSS corpus, Chromium |
| `private-needs-flag` | a private course is never built without `--private` | R-028, R-029 | the command, a scenario |
| `paths-contained` | the generator reads nothing outside the course folder | R-024, R-027 | the port contract, the command |
| `reader-smoke` | a learner can click from the home page to a lab step, in a real browser | R-018, R-019, R-021 | Chromium |
| `supply-chain-pinned` | every dependency comes from the registry, pinned with a hash | R-035, R-036 | the audit |
| `build-identity` | the command and `version.json` say which release and commit, and nothing else does | R-037, R-038 | the command |
| `reproducible-site` | two builds of one course differ only in `version.json` | R-038 | the command |
| `version-and-changelog` | one SemVer version, with its changelog section | R-039 | the release files |
| `container-hardened` | bases pinned by digest, a user that is not root | R-043 | the Dockerfile |
| `ci-pinned` | actions pinned by SHA, least privilege, one required job | | the workflow |
| `site-within-budget` | the fixture site stays within its size budget | R-041 | the real build |

## From a promise to a tag

    a promise             "A private course is never built without --private."
          │
          ▼
    REQUIREMENTS.md       R-028 | Unwanted behaviour | If a course is private and the command is not given --private, then the command shall write nothing, ... | cli
          │  proved by a Rule and its scenarios (pnpm test:ears:audit)
          ▼
    release/claims.yaml   - id: private-needs-flag
          │                 requirements: [R-028, R-029]
          │                 evidence: ["tests/bdd/features/command/guarded-command.feature#A course whose properties.yaml says auth: 1", ...]
          │  every evidence id resolves to a test that exists and runs (pnpm release:claims)
          ▼
    the gate              pnpm test, pnpm test:e2e: the evidence passes
          │
          ▼
    out/readiness.md      the A3: claims, SLOs, supply chain, mutation floors, container, lead time. HOLD or READY.
          │
          ▼
    a person              reads the A3 and tags v1.0.0 (release/SOP.md, step 10). No script does.

## Defences, outside in (from rung 6, now release evidence)

| Threat | Defence | Where | Requirement and proof |
| --- | --- | --- | --- |
| Course text becomes markup (`<script>`) | Escaping by default | `html` template in `packages/lite/src/html.ts`; Svelte's `{text}` | R-008; `tests/unit/lite/xss-corpus.test.ts` |
| A link or image runs script (`javascript:`, `data:`) | Sanitising: a URL scheme allow-list | `packages/lite/src/url.ts` | R-022; the corpus, `tests/fuzz/safe-url.fuzz.test.ts` |
| A route in `tutors.json` is script | The same allow-list, as the file enters the reader | `decorateCourseTree` in `apps/reader/src/lib/course/lo-tree.ts` | R-033; `guarded-reader.feature` |
| Something slips past both | Content Security Policy | `CSP` in `packages/lite/src/html.ts`; `apps/reader/csp.ts` | R-023, R-034; `tests/e2e/guarded.e2e.ts` |
| The build reads `../../.ssh/id_ed25519` or follows a link out | Path containment in every adapter | `containedPath` in `packages/gen`, `NodeFileSystem` | R-024, R-027; the port contract, both adapters |
| A page links to files outside its folder | Warning V021, as upstream | `packages/gen/src/portable.ts` | R-025; `containment.feature` |
| A private course is published openly | RBAC policy; `--private`; pages marked; the reader's notice | `packages/rbac`, `apps/cli/src/run.ts`, the course service | R-028 to R-032; `access.feature`, `guarded-command.feature` |
| A dependency from a git URL or tarball; a stale allowance | Registry sources only, lockfile required, allowances expire | `scripts/supply-chain.ts` | R-035, R-036; `supply-chain.feature` |

Each defence stands where the hostile value enters, and each is one layer of several: that is defence in
depth. `SECURITY.md` says what is out of scope. In particular, the reader's private-course notice is a
courtesy to an honest reader, not a lock: `tutors.json` is a file on the host, and only the host can refuse
to serve it.

## The tests

Everything from rung 6 still runs, and `tests/TESTING.md` maps every folder. What this rung adds:

| Command | What it runs | In the gate |
| --- | --- | --- |
| `pnpm test:bdd` | now also two `@release` features: R-037 to R-044 | yes |
| `pnpm test:unit` | now also `unit/release` (the release logic), the release scripts run as processes, and the command's build identity | yes |
| `pnpm exec vitest run tests/release` | the release's own files: claims, budgets, version and changelog, SOP, Dockerfile, workflow | yes |
| `pnpm exec vitest run tests/architecture` | now also the Scripts, Pure release logic and Build identity rules | yes |
| `pnpm test:mutation` | Stryker, now also over `scripts/lib` | no |
| `pnpm release:claims`, `pnpm release:slo` | the claims and the budgets, as commands (the claims and the site's size also run in the gate as tests) | partly, as tests |
| `pnpm container:smoke` | the image, where Docker runs | no: it needs Docker |

## Architecture

    apps/cli ──► @ladder/gen ────► @ladder/model ◄──── @ladder/reader
        │                            ▲   ▲                 │
        ├──────► @ladder/lite ───────┘   │ ◄───────────────┤
        ├──────► @ladder/rbac ───────────┘ ◄───────────────┤
        │              │ (types only)                      │
        └──────► @ladder/identity ◄──┘ ◄───────────────────┘

| Package | Folder | Job | May import |
| --- | --- | --- | --- |
| `@ladder/model` | `packages/model` | The learning-object types, now with `properties` and `enrollment`. | nothing |
| `@ladder/identity` | `packages/identity` | `Actor` and `SessionPort`: who is reading, verified. `AnonymousSession`, `FakeSession`. | nothing |
| `@ladder/rbac` | `packages/rbac` | A pure policy: roles, permissions, `accessOf`, `canView`. | types of `model` and `identity` |
| `@ladder/gen` | `packages/gen` | Course folder to `Course`, through a contained `FileSystemPort`. | `@ladder/model` |
| `@ladder/lite` | `packages/lite` | `Course` to pages, sanitised and under a CSP; `renderMarkdown`, `safeUrl`; `versionFile`, the build identity as data. | `@ladder/model` |
| `@ladder/cli` | `apps/cli` | The composition root: adapters, the policy decision, the files. `--json-only`, `--private`, `--version`; reads the build identity in `build-identity.ts`. | all of the above |
| `@ladder/reader` | `apps/reader` | `tutors.json` to an interactive site, in the browser, guarded. | `model`, `lite`, `identity`, `rbac` |

Rules from rungs 3 to 6 still hold. Rung 7 adds no layer to the product. It adds tools at the edge:

    scripts/*.ts        the release commands: read files, run the command, git, docker and pnpm
    scripts/lib/*.ts    their judgements, as pure functions (the next version, a claim's problems, a budget,
                        the A3, the image's facts, the value stream)
    release/            claims.yaml, slo.yaml, SOP.md: data and standard work
    CHANGELOG.md  Dockerfile  .github/workflows/ladder-ci.yml (a template: inactive here)

and three rules, in `tests/architecture/release.test.ts`: the **Scripts rule** (a script judges the
workspace from outside and nothing imports a script), the **Pure release logic rule** (`scripts/lib`
touches no process, clock or network) and the **Build identity rule** (only `build-identity.ts` reads
`GIT_SHA` and `BUILD_DATE`; lite takes the identity as a value). The Build identity rule is not rung 6's
Identity rule, which keeps `packages/identity` free of imports.

## The reader

    src/routes/(course-reader)/<kind>/[courseid]/[...loid]/+page.ts    load: requestLo or requestLab, then found()
                                                    +page.svelte       one component from ui-components
    src/lib/ui-components   Card, Cards, Units, Composite, Note, Lab
    src/lib/ui-navigators   TutorsShell, SecondaryNavigator (breadcrumbs)
    src/lib/ui-primitives   Icon, Markdown (the one {@html}), lo-colours
    src/lib/runes           currentCourse, currentLo: shared $state
    src/lib/course          course-service (the one fetch, and the policy's answer), lo-tree (guards every route), live-lab: plain TypeScript
    csp.ts                  the reader's Content Security Policy, handed to SvelteKit by vite.config.ts

Each layer imports only the ones beneath it. `tests/architecture/reader-layers.test.ts` checks that, and
that only the course service fetches and only `Markdown.svelte` writes raw HTML. A route decides nothing:
the course service answers with the page, with a 404 message (R-020) or with a private-course notice
(R-032), and `found.ts` turns those into SvelteKit's `error(404, ...)` and `error(403, ...)`. So every rule a scenario proves lives in `lib/course`, where Vitest and
Stryker reach it without a browser.

| URL | Load | Component |
| --- | --- | --- |
| `/course/[courseid]` | `requestLo("course", ...)` | `structure/Composite.svelte` |
| `/topic/[courseid]/[...loid]` | `requestLo("topic", ...)` | `structure/Composite.svelte` |
| `/talk/...`, `/note/...` | `requestLo("talk" or "note", ...)` | `content/Note.svelte` |
| `/lab/[courseid]/[...loid]` | `requestLab(...)` | `content/lab/Lab.svelte` |

## Extension points

| To add | Change | The checks that guide you |
| --- | --- | --- |
| a security behaviour | `REQUIREMENTS.md` first (`pnpm test:ears:audit --next-id`), a Rule and an adversarial scenario, then the layer where the hostile value enters | the closure audit, vitest-cucumber |
| a hostile input | a row in `tests/unit/lite/xss-corpus.test.ts`, or a file in `tests/fixtures/hostile-course` | the corpus, the browser test |
| an allowed URL scheme | a person's decision: `ALLOWED` in `url.ts`, with a corpus row for its abuses | the properties, the Sanitising rule |
| a source of identity (real sign-in) | a `SessionPort` adapter in `apps/`, added to the session contract, handed to `requestLo` | the Honest Double rule |
| a rule about who may do what | `packages/rbac`, pure, with a row in `tests/unit/rbac/policy.test.ts` | the Purity rule, `Record<Role, ...>` |
| a promise a release makes | `release/claims.yaml`: the promise, the requirements it rests on, the tests that are its evidence | `pnpm release:claims`, the Coverage rule |
| a budget | `release/slo.yaml`; a new measure in `scripts/lib/slo.ts`, with a unit test | `pnpm release:slo`, the Budget rule |
| a release behaviour | `REQUIREMENTS.md` first ("The release shall ..."), a Rule and a scenario, then a pure function in `scripts/lib` | the closure audit, the Pure release logic rule, Stryker |
| a release command | `scripts/`, a `package.json` script, a step in `release/SOP.md` | the Standard work rules, the Scripts rule, the fence |
| a CI job | `.github/workflows/ladder-ci.yml`, in the gate's `needs` | `tests/release/workflow.test.ts` |
| a dependency | a person's decision: `RUNG.md` and the Rung Fence together | `tests/rung-fence.test.ts`, `pnpm audit:supply-chain` |

## Next on the ladder

The Summit is [tutors-mono-repo](https://github.com/tutors-sdk/tutors-mono-repo) itself. Everything this
rung does by hand upstream does with the release harness: release candidates, an A/B comparison of
production and candidate, a confidence score, a reviewer's glance and a kaizen register.

See `RUNG.md` for what this rung adds and leaves out, `release/SOP.md` for the standard work of a release,
`tests/TESTING.md` for the tiers, `AGENTS.md` for the working agreement and `SECURITY.md` for how to
report a problem.
