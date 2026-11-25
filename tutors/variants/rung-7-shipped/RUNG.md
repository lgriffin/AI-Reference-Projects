# Rung Delta: 7, Shipped

## Capability

Rung 6's workspace, made releasable, and specified first: eight new requirements, `R-037` to `R-044`.
Nothing it builds changes. What is added is everything it takes to say "this is release 1.1.0, built from
this commit, and it keeps these promises":

- **Build identity (R-037, R-038).** `--version` on the command, and `version.json` in every site,
  nowhere else, so two builds of one course differ in one file.
- **Version and changelog (R-039).** A SemVer version and `CHANGELOG.md` (Keep a Changelog), derived from
  Conventional Commit messages by `pnpm release:version` and curated by a person.
- **Release claims (R-040).** `release/claims.yaml`: fourteen promises across the generator, the site,
  the command, the reader and the security rules, each naming the requirements it rests on and the tests
  that are its evidence, and a Closure Check that fails when a promise has none.
- **Service level objectives (R-041).** `release/slo.yaml`: budgets for build time, site size and the
  reader's size, and a check that fails, teaching, when one is exceeded or was not measured.
- **Readiness A3 (R-042).** One page that lays the facts out: changelog, claims, SLOs, the supply-chain
  audit, the mutation floors, the container, the lead time. It says HOLD, READY, or READY with checks not run.
- **Container (R-043).** A two-stage Dockerfile, bases pinned by digest, served by a user that is not
  root, and a smoke check that runs it read-only with no capabilities.
- **CI.** A workflow template with pinned actions, read-only permissions and one required job that needs
  the gate, the browser tier, mutation, the release checks and the container.
- **Value stream (R-044).** `pnpm release:value-stream` runs the steps of the SOP in order, times each
  one, stops the line on a failure, and prints the map with its lead time.

## Expertise needed

Everything from rungs 1 to 6, plus:

- Semantic Versioning 2.0.0, Conventional Commits 1.0.0, Keep a Changelog 1.1.0.
- Release claims as promises with evidence; closing claims over tests and requirements.
- Service level objectives as budgets; a budget as a ratchet.
- GitHub Actions: triggers, jobs, `needs`, `permissions`, pinning actions by commit SHA, branch protection.
- Dockerfiles: multi-stage builds, `USER`, digests, OCI labels, `HEALTHCHECK`; running a container
  read-only with capabilities dropped.
- `node:child_process` (`execFileSync`, `spawnSync`) for git, docker and pnpm; reading git's files directly.
- Lean for a release: standard work (the SOP), value stream mapping (process time, waiting, lead time,
  flow efficiency), the A3, stopping the line.
- Writing a requirement about what a tool reports and decides, never about what a person does.

## Dependencies

Rung 7 adds **one dev dependency**, `yaml`, to the root. The product is untouched: the packages, the
command and the reader depend on exactly what rung 6 allowed. The Rung Fence (`tests/rung-fence.test.ts`)
allows exactly this list, and checks that this table agrees with it.

| Package | Version | Where, and why |
| --- | --- | --- |
| `svelte` | `5.57.2` | `apps/reader` dev: the component compiler and runes. Upstream's reader pins the same. |
| `@sveltejs/kit` | `3.1.1` | `apps/reader` dev: routing, load functions, the build. Upstream pins the same. |
| `@sveltejs/vite-plugin-svelte` | `7.3.0` | `apps/reader` dev: compiles `.svelte` files inside Vite (a peer of kit). |
| `@sveltejs/adapter-static` | `4.0.1` | `apps/reader` dev: writes the build as plain files with a `200.html` fallback. |
| `vite` | `8.3.5` | `apps/reader` dev: dev server and bundler. Upstream's lockfile resolves the same. |
| `svelte-check` | `4.7.6` | `apps/reader` dev: type-checks `.svelte` files in the gate. |
| `playwright` | `1.63.0` | root dev, from rung 5: drives Chromium for `pnpm test:e2e`. The library, not upstream's `@playwright/test` runner. |
| `typescript` | `^6.0.3` | root dev, from rung 3. |
| `@types/node` | `^22.20.7` | root dev, from rung 3. |
| `vitest` | `^5.1.2` | root dev, from rung 4: the runner for every tier, the browser tier included. |
| `@amiceli/vitest-cucumber` | `^8.0.1` | root dev, from rung 4: Gherkin features bound to Vitest. |
| `fast-check` | `^4.11.0` | root dev, from rung 4: property-based tests. |
| `@stryker-mutator/core` | `^10.1.1` | root dev, from rung 4: mutation testing. |
| `@stryker-mutator/vitest-runner` | `^10.1.1` | root dev, from rung 4: Stryker's Vitest runner. |
| `yaml` | `2.9.1` | root dev, new in rung 7: the release scripts and the release tests read `release/claims.yaml`, `release/slo.yaml` and the CI workflow with it. No package or app imports it. |

All are build-time or test-time tools. The built reader ships Svelte's small runtime and the code in
`apps/reader/src`, `@ladder/lite`, `@ladder/rbac`, `@ladder/identity` and nothing else. `dompurify`,
`better-auth` and `@supabase/*` arrive at the Summit, and so, if ever, do release tools such as
`semantic-release`, `@changesets/*` and `release-please`: the fence says so when one is added.

The fence is lifted in three places, all outside the product:

| Lifted | For | Kept narrow by |
| --- | --- | --- |
| the root dev dependency `yaml` | reading `release/*.yaml` and the workflow | only `scripts/` (not `scripts/checks`) and `tests/` may import it |
| `node:child_process` in five release scripts | running the command, git, docker and the SOP's steps | `RELEASE_SCRIPTS` in the fence names each file and its reason |
| `fetch` in `scripts/container-smoke.ts` | asking the container it started, on 127.0.0.1 | one file; every other script stays offline |

And one rule is added: no script tags, pushes or publishes.

## Specifying the release

The old Shipped rung (built on rung 3, before testing moved to rung 4) was ported onto rung 6 in this order:

1. Eight sentences in `REQUIREMENTS.md`. One system joined the EARS audit: `the release` (the tools in
   `scripts/`). A release requirement says what the release reports and decides, never what a person
   does: tagging is not a requirement of this code.
2. A `Rule:` per sentence, in two features tagged `@release`: `command/version.feature` (R-037, R-038)
   and `release/release.feature` (R-039 to R-044). Their Givens are a set of commits, a claims file, a
   build, an image, a run of the steps.
3. The code, ported from the old rung, with the judgements moved into pure functions in `scripts/lib` so
   that a scenario and Stryker can reach them: `smoke.ts` (what the smoke check makes of an image) and
   `value-stream.ts` are new.
4. The rung 4 tiers on the new code: unit tests of the release logic (`tests/unit/release`), the scripts
   run as processes (`tests/unit/scripts`), the release's own files held to their rules
   (`tests/release`), three architecture rules, and mutation with floors.

Three things the port found:

- **A claim is now a claim about the whole line.** On rung 3 every claim cited a unit test of gen, lite or
  the command. Here evidence may also be a `Scenario` in a feature file or a browser test, a claim names
  the requirements it rests on, and `tests/release/claims-file.test.ts` fails if the claims stop drawing
  evidence from any part of the line. The old `no-script` claim ("the site has no script") became
  `no-inline-script`, resting on R-023 and R-034, with a unit test, a scenario and Chromium as evidence.
- **Two rules wanted the same name.** Rung 6's Identity rule keeps `packages/identity` free of imports
  (who a reader is). The old Shipped rung's Identity rule kept `GIT_SHA` in one file (which build this
  is). The second is now the **Build identity rule**, and its failure message says it is not the first.
- **The fence's import check read strings as imports.** `flag === "--from"` in `release-version.ts`
  looked like `from "..."`. The check now anchors on import and export statements, as the old rung's did.

## Mutation testing

`pnpm test:mutation` now also mutates the release logic: `scripts/lib/conventional.ts` (the next version
and the changelog), `claims.ts` (the Closure Check), `slo.ts` (the budgets), `a3.ts` (the verdict),
`smoke.ts` (the image's facts) and `value-stream.ts` (the arithmetic and the stop-the-line rule).

| File | First run | After the tests the survivors asked for | Floor |
| --- | --- | --- | --- |
| `scripts/lib/a3.ts` | 88.89% | 98.52% | 98 |
| `scripts/lib/claims.ts` | 80.54% | 97.06% | 97 |
| `scripts/lib/conventional.ts` | 88.69% | 95.98% | 95 |
| `scripts/lib/slo.ts` | 90.72% | 98.97% | 98 |
| `scripts/lib/smoke.ts` | 100.00% | 100.00% | 100 |
| `scripts/lib/value-stream.ts` | 93.06% | 97.22% | 97 |
| all mutated files | 91.40% | 95.67% | break at 90 |

The first run is the port with its example tests only. The survivors were table rows nobody had asserted:
the A3's gap wording, the near-match hint of a claim, the changelog headings. Each got a row-by-row test.
The floors for files from earlier rungs did not move. A full run takes about two and a half minutes.

Three defects came out of this work, recorded here because a test or a walk-through found each, not a reader:

- `perf(security): ...` landed under no changelog heading. A table test over every type and scope found it;
  the Fixed section now takes every `perf` commit and every `fix` outside the `security` scope.
- `pnpm release:version --from v1.0.0 --write`, run twice, released the same commits twice: the second run
  read 1.1.0 from `package.json` and wrote 1.2.0. Walking the week 11 lab found it. The next version is now
  counted from the release `--from` names, so the second run asks for 1.1.0 again and is refused.
- The fuzz oracle in `tests/fuzz/markdown.fuzz.test.ts` listed the tags the renderer may emit and had no
  `span`. Rung 6 shows a refused address as `<span class="blocked">`, so the property failed now and then
  (counterexample `![](javascript:alert(1)`). Stryker's dry run met it. Rung 7 adds
  `span`; rungs 5 and 6 still carry the old list.

## Where this lives upstream

Pinned at tutors-mono-repo `2b96b69` and tutors-release-harness `5b80358` (1.63.0).

| Here | Upstream | What is mirrored |
| --- | --- | --- |
| `REQUIREMENTS.md` R-037 to R-044, features tagged `@release` | `tests/bdd/features/developer/release-changelog.feature` (Rules 0190 to 0195), and the Rules `release/README.md` cites for its checks | release tooling specified as Rules with scenarios |
| `CHANGELOG.md` | `CHANGELOG.md`; `guides/Release-Strategy.md` "Changelog Discipline" | a curated changelog per version. Upstream groups by app; its strategy's example and this file use Keep a Changelog headings |
| `scripts/release-version.ts`, `scripts/lib/conventional.ts` | `scripts/release-changelog.ts` (`pnpm release:changelog`) | Conventional Commit types to headings (`feat` Features, `fix` and `perf` Fixes, `!` or `BREAKING CHANGE` Breaking). Upstream drafts the changelog and leaves the bump to the author ("Apply semver rules"); here the bump is derived too |
| `package.json` and `apps/*/package.json` in lockstep | root and `apps/*` all at `17.1.0`; JSR packages versioned on their own (`packages/jsr/gen/deno.json` 5.3.0) | one version for what ships |
| `release/claims.yaml`, `scripts/check-release-claims.ts`, `scripts/lib/claims.ts` | `release/claims.yaml`, `scripts/checks/release-claims.ts` (`pnpm check:release-claims`), `release/README.md` | a claims file checked on every release, failing on a reference that does not resolve (upstream: a Rule id no feature under `tests/bdd/features` defines). Upstream's claims are intended differences from production that the release harness matches; these are promises that tests keep |
| `requirements:` on a claim | the `rule:` field of an upstream claim (harness contract 1.3.0) | a claim names the Rule it rests on, and the check resolves it |
| `release/slo.yaml`, `scripts/check-slo.ts`, `scripts/lib/slo.ts` | `release/slo.yaml`, `scripts/checks/slo.ts`; the harness's `slo/floors.yaml`; `scripts/checks/bundle-budget.ts` | objectives written once, checked per release, floors as a ratchet. Upstream's are availability and latency per app over 28 days; its bundle budgets are the nearer twin of `reader-bytes` |
| `release/SOP.md` | `release/SOP.md` | standard work: roles, steps with owner and done-when, stop the line, deviations. Upstream has twelve steps and a budget per step; this has ten |
| `packages/lite/src/version.ts`, `apps/cli/src/build-identity.ts` | `packages/svelte/utils/runtime/src/version.ts` (`versionInfo`, `GET /version`); `scripts/checks/build-identity.ts` | `{app, version, revision, built}` from `GIT_SHA` and `BUILD_DATE`, answered in one place and nowhere else |
| `Dockerfile` | `Dockerfile` | multi-stage, base pinned by digest (upstream Rule 0667), OCI `version` and `revision` labels, `USER` not root, `HEALTHCHECK`, `GIT_SHA` as a build argument, a mirror override (upstream `NODE_IMAGE`, here `REGISTRY`) |
| `scripts/container-smoke.ts`, `scripts/lib/smoke.ts` | `scripts/checks/container-smoke.ts` | run the image read-only with no capabilities, ask `/version` |
| `.github/workflows/ladder-ci.yml` | `.github/workflows/ci.yml`, `zizmor.yml` | SHAs copied from upstream's `ci.yml` (`actions/checkout`, `pnpm/action-setup`, `actions/setup-node`), `permissions: contents: read`, `persist-credentials: false`, timeouts, the Chromium install line, and the `CI success` job that needs every job |
| `tests/release/workflow.test.ts` | `zizmor.yml` (zizmor audits the workflows); `deploy-pin-pr.yml` cites zizmor's `dangerous-triggers` | the same concerns, as a text check |
| `scripts/release-readiness.ts`, `scripts/lib/a3.ts` | harness `src/a3` (`harness a3`), `src/readiness`, `docs/lean.md` ("The A3") | one advisory page: background, current condition, goal, root cause, countermeasures, plan, follow-up. "What was not read says not measured" |
| `scripts/value-stream.ts`, `scripts/lib/value-stream.ts` | the "Budget" column of `release/SOP.md` ("Active time is about three hours; wall time is a day and a half"); the value stream map in the harness's A3 (`docs/lean.md`) | the release as a stream of steps with process time and waiting. Upstream budgets each step and maps a change from merge to verified in production; this times each step on your machine |
| mutation score and supply-chain audit on the A3 | `scripts/checks/release-quality.ts`, the harness's "Test signal" dimension (`docs/lean.md`) | the suite's strength and the dependencies' state as release evidence |

## Deliberately left out

- **Release candidates and promotion.** Upstream tags `vX.Y.Z-rc.N` on each push to `release/**`
  (`release-dispatch.yml`), judges the rc images with the release harness, and promotes the last rc's
  digest to `X.Y.Z` without rebuilding (`image-build.yml`, `scripts/promote-image.ts`). A static site with
  no harness has nothing to judge between rc and final, so this rung tags once.
- **The release harness** (A/B diffing of production and candidate, noise runs, the Release Confidence
  Score, the reviewer's glance, the kaizen register). The talks and the note walk through it; nothing
  here runs it. Upstream's claims are differences the harness observed; these are promises tests keep.
- **The reader in the image.** The image serves the static site, which builds with no install. The reader
  needs `pnpm install` inside the build stage; its release evidence is the browser tier and its size
  budget. Putting it in the image is a "Build beyond" extension.
- **A build identity for the reader.** `version.json` belongs to the site the command builds. The
  reader's build carries SvelteKit's own `_app/version.json`.
- **Availability and latency objectives.** They need a running service and traffic. These objectives are
  budgets on the build.
- **Deploy pins** (`release/deployed.json`, `pnpm deploy:pin`, `deploy-pin-pr.yml`, Kubernetes overlays).
- **Signing and attestation**: cosign signatures, SPDX SBOM and SLSA provenance attestations, Trivy scans,
  and `release/openvex.json`. They need a registry and an identity provider; the talks show upstream's.
- **Publishing**: no registry push, no GitHub Release, no npm or JSR publish. No script tags or pushes,
  and the fence fails one that tries.
- **Running zizmor.** `tests/release/workflow.test.ts` checks five of its concerns by reading text; a real
  repository should run zizmor itself, as upstream does.
- Rung 6's raw HTML and locks assignment test. Each rung carries its own assignment.

## Assertion Ladder

| Rule | Rung | Where |
| --- | --- | --- |
| Every release requirement is proved, every citation is known | L3/L4 Closure Check | `pnpm test:ears:audit`, `tests/suite-health/requirements.test.ts` |
| Every claim names evidence that exists and runs, and requirements that exist | L3 Closure Check, L4 Teaching Failure | `pnpm release:claims`; `tests/release/claims-file.test.ts` runs it in the gate |
| The claims draw evidence from every part of the line | L3/L4 | the Coverage rule in `tests/release/claims-file.test.ts` |
| Every SLO is within budget, and was measured | L3 Executable Rule, L4 | `pnpm release:slo`; the site's size also in the gate (`tests/release/budgets.test.ts`) |
| One version, with a changelog section | L3/L4 | `tests/release/release-files.test.ts` |
| Every command a release runs has a step in the SOP, and the value stream times those steps | L3/L4 Closure Check | the Standard work rules in `tests/release/release-files.test.ts` |
| Actions pinned, permissions read-only, one gate, the whole line | L3/L4 | `tests/release/workflow.test.ts` |
| Bases pinned by digest, user not root | L3/L4 | `tests/release/dockerfile.test.ts`; `pnpm container:smoke` on the image |
| The container cannot write its files or gain privileges | L5 Prevented, by the kernel | `--read-only --cap-drop ALL --security-opt no-new-privileges` in `scripts/lib/smoke.ts` |
| Build identity read in one place, shown in one file | L3/L4 | the Build identity rule; `tests/unit/cli/release.test.ts` |
| Scripts judge from outside; release logic is pure | L3/L4 | the Scripts and Pure release logic rules in `tests/architecture/release.test.ts` |
| A check that did not run is never shown as passed | L3 | `skipped` and `not run` in the smoke check, the A3 and the value stream, each with a test |
| The suite notices changes to the release logic | L3 | `pnpm test:mutation`, `pnpm check:mutation-floors` |
| A person tags the release | L2 Told, Human Boundary; partly L3 | `release/SOP.md` step 10; the fence fails a script that tags, pushes or publishes |
| The readiness A3 and the value stream map | L1 Shown | `out/readiness.md`, `out/value-stream.md`: they show, never decide |
| No runtime dependency, network or process in the product | L3/L4 Rung Fence | `tests/rung-fence.test.ts` |
| Rules from rungs 3 to 6 | as before | `tests/architecture`, `tests/suite-health`, `tests/mutation`, the `@security` features |
