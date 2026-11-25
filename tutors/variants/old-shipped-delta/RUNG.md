# Rung Delta: 7, Shipped

## Capability

A versioned, gated, containerised release with checked claims. Rung 3's tools, unchanged in what they
build, plus everything it takes to say "this is release 1.1.0, built from this commit, and it keeps these
promises":

- a SemVer version and `CHANGELOG.md` (Keep a Changelog), derived from Conventional Commit messages by
  `scripts/release-version.ts` and curated by a person;
- `release/claims.yaml`: each promise tied to the tests that are its evidence, and a Closure Check that
  fails when a promise has none;
- `release/slo.yaml`: budgets for build time and site size, and a check that fails, teaching, when one is exceeded;
- build identity: `--version` on the cli, `version.json` in every site, nowhere else;
- a two-stage Dockerfile, bases pinned by digest, served by a user that is not root, and a smoke check;
- a CI workflow template with pinned actions, read-only permissions and one Single Gate;
- a readiness A3 that lays the facts out on one page.

## Expertise needed

Everything from rung 3, plus:

- Semantic Versioning 2.0.0, Conventional Commits 1.0.0, Keep a Changelog 1.1.0.
- GitHub Actions: triggers, jobs, `needs`, `permissions`, pinning actions by commit SHA, branch protection.
- Dockerfiles: multi-stage builds, `USER`, digests, OCI labels, `HEALTHCHECK`; running a container
  read-only with capabilities dropped.
- `node:child_process` (`execFileSync`, `spawnSync`) for git and docker; reading git's files directly.
- Release claims as promises with evidence; service level objectives as budgets; the Lean A3.

## Where this lives upstream

Pinned at tutors-mono-repo `2b96b69` and tutors-release-harness `5b80358` (1.63.0).

| Here | Upstream | What is mirrored |
| --- | --- | --- |
| `CHANGELOG.md` | `CHANGELOG.md`; `guides/Release-Strategy.md` "Changelog Discipline" | a curated changelog per version. Upstream groups by app (`## Reader`, `### v17.0.0 (2026-10)`); its strategy's example and this file use Keep a Changelog headings |
| `scripts/release-version.ts`, `scripts/lib/conventional.ts` | `scripts/release-changelog.ts` | Conventional Commit types to headings (`feat` Features, `fix` and `perf` Fixes, `!` or `BREAKING CHANGE` Breaking). Upstream drafts the changelog and leaves the bump to the author ("Apply semver rules"); here the bump is derived too |
| `package.json` and `apps/*/package.json` in lockstep | root and `apps/*` all at `17.1.0`; JSR packages versioned on their own (`packages/jsr/gen/deno.json` 5.3.0) | one version for what ships |
| `release/claims.yaml`, `scripts/check-release-claims.ts` | `release/claims.yaml`, `scripts/checks/release-claims.ts` (`pnpm check:release-claims`) | a claims file checked on every release, failing on a reference that does not resolve (upstream: a Rule id no feature under `tests/bdd/features` defines). Upstream's claims are intended differences the release harness matches; these are promises tests keep |
| `release/slo.yaml`, `scripts/check-slo.ts` | `release/slo.yaml`, `scripts/checks/slo.ts`; the harness's `slo/floors.yaml` | objectives written once, checked per release, floors as a ratchet. Upstream's are availability and latency per app over 28 days |
| `release/SOP.md` | `release/SOP.md` | standard work: roles, steps with owner and done-when, stop the line, deviations. Upstream has twelve steps; this has eight |
| `packages/lite/src/version.ts`, `apps/cli/src/build-identity.ts` | `packages/svelte/utils/runtime/src/version.ts` (`versionInfo`, `GET /version`); `scripts/checks/build-identity.ts` | `{app, version, revision, built}` from `GIT_SHA` and `BUILD_DATE`, answered in one place and nowhere else |
| `Dockerfile` | `Dockerfile` | multi-stage, base pinned by digest (upstream Rule 0667), OCI `version` and `revision` labels, `USER` not root, `HEALTHCHECK`, `GIT_SHA` as a build argument, a mirror override (upstream `NODE_IMAGE`, here `REGISTRY`) |
| `scripts/container-smoke.ts` | `scripts/checks/container-smoke.ts` | run the image read-only with no capabilities, ask `/version` |
| `.github/workflows/ladder-ci.yml` | `.github/workflows/ci.yml`, `zizmor.yml` | SHAs copied from upstream's `ci.yml` (`actions/checkout`, `pnpm/action-setup`, `actions/setup-node`), `permissions: contents: read`, `persist-credentials: false`, timeouts, and the `CI success` job that needs every job |
| `tests/release/workflow.test.ts` | `zizmor.yml` (zizmor audits the workflows); `deploy-pin-pr.yml` cites zizmor's `dangerous-triggers` | the same concerns, as a text check |
| `scripts/release-readiness.ts`, `scripts/lib/a3.ts` | harness `src/a3` (the daily A3), `src/readiness` (the readiness page), `docs/lean.md` | one advisory page: background, current condition, goal, root cause, countermeasures, plan, follow-up |

## Deliberately left out

- **Release candidates and promotion.** Upstream tags `vX.Y.Z-rc.N` on each push to `release/**`
  (`release-dispatch.yml`), judges the rc images with the release harness, and promotes the last rc's
  digest to `X.Y.Z` without rebuilding (`image-build.yml`, `scripts/promote-image.ts`). A static site with
  no harness has nothing to judge between rc and final, so this rung tags once.
- **The release harness** (A/B diffing of production and candidate, noise runs, the Release Confidence
  Score, the reviewer's glance, kaizen register). The talks walk through it; nothing here runs it.
- **Deploy pins** (`release/deployed.json`, `pnpm deploy:pin`, `deploy-pin-pr.yml`, Kubernetes overlays).
- **Signing and attestation**: cosign signatures, SPDX SBOM and SLSA provenance attestations, Trivy scans,
  and `release/openvex.json`. They need a registry and an identity provider; the talks show upstream's.
- **Publishing**: no registry push, no GitHub Release, no npm or JSR publish. No script tags or pushes.
- **Running zizmor.** `tests/release/workflow.test.ts` checks five of its concerns by reading text; a real
  repository should run zizmor itself, as upstream does.

## Assertion Ladder

| Rule | Rung | Where |
| --- | --- | --- |
| Every claim names a test that exists and runs | L3 Closure Check, L4 Teaching Failure | `pnpm release:claims`; `scripts/tests/claims.test.ts` runs it in the gate |
| Every SLO is within budget | L3 Executable Rule, L4 | `pnpm release:slo`; the size budget also in the gate |
| One version, with a changelog section | L3, L4 | `tests/release/release-files.test.ts` |
| Actions pinned, permissions read-only, one gate | L3, L4 | `tests/release/workflow.test.ts` |
| Bases pinned by digest, user not root | L3, L4 | `tests/release/dockerfile.test.ts`; `pnpm container:smoke` on the image |
| Build identity read in one place, shown in one file | L3, L4 | the Identity rule; `apps/cli/tests/release.test.ts` |
| Scripts judge from outside | L3, L4 | the Scripts rule in `tests/architecture` |
| A person tags the release | L2 Told, Human Boundary; partly L3 | `release/SOP.md` step 8; the fence fails a script that runs `git tag` or `git push` |
| The readiness A3 | L1 Shown | `out/readiness.md`: shows, never decides |
| No runtime dependency, network or process in the packages | L3/L4 Rung Fence | `tests/rung-fence.test.ts` |
