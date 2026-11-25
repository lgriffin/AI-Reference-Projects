# Rung 7: Shipped

The rung 3 tools, a course folder in and a static website out, made releasable: a SemVer version and a
Keep a Changelog file derived from Conventional Commits, release claims that each name their test, budgets
the build must keep, a build identity in every site, a container image that serves the site as a user that
is not root, a CI workflow with every action pinned by SHA, and a one-page readiness A3 that says whether
the release is ready to tag.

## Run it in three commands

    pnpm install                   # TypeScript, Node's types and yaml: dev dependencies only
    pnpm test                      # the Single Gate: tsc, then every node --test suite
    pnpm release:readiness         # the readiness A3 for this version, in out/readiness.md

`pnpm start ../fixtures/ladder-sample-course out` still builds the site; `out/version.json` now says which
release and commit built it, and `node apps/cli/src/main.ts --version` prints the same.

## The release commands

| Command | What it does | Exit codes | Upstream |
| --- | --- | --- | --- |
| `pnpm release:version --from v1.0.0 [--write]` | the next SemVer version and its changelog section, from Conventional Commits (`--commits <file>` reads messages from a file) | 0, 2 on bad input | `scripts/release-changelog.ts` (drafts the changelog) |
| `pnpm release:claims` | the Closure Check: every promise in `release/claims.yaml` names a test that exists and runs | 0, 1 with teaching messages | `scripts/checks/release-claims.ts` |
| `pnpm release:slo` | builds the fixture three times and judges `release/slo.yaml`'s budgets | 0, 1 with teaching messages | `scripts/checks/slo.ts` |
| `pnpm container:smoke [--dry-run]` | builds the image, runs it read-only with no capabilities, checks `/version.json`; skips, saying why, when no Docker daemon answers | 0 (passed or skipped), 1 | `scripts/checks/container-smoke.ts` |
| `pnpm release:readiness` | writes the readiness A3, `out/readiness.md` (advisory: always 0) | 0 | the release harness's daily A3 (`src/a3`) |

The steps, their owners and when each is done are in [`release/SOP.md`](release/SOP.md). Docker Hub may
rate-limit pulls; `LADDER_REGISTRY=mirror.gcr.io/library pnpm container:smoke` pulls the same digests from a
mirror.

## Architecture

    apps/cli ──► @ladder/gen ──► @ladder/model          scripts/ (release tools, at the edge)
        │                            ▲                     │  run the cli as a process,
        └──────► @ladder/lite ───────┘                     │  read files, git and docker
                                                           ▼
                                               release/ CHANGELOG.md Dockerfile .github/

| Folder | Job | May use |
| --- | --- | --- |
| `packages/model`, `packages/gen`, `packages/lite` | unchanged from rung 3; `lite` adds `versionFile`, the build identity as data | `@ladder/model` only; no platform |
| `apps/cli` | the composition root; adds `--version` and reads `GIT_SHA`, `BUILD_DATE` and the git HEAD (as files) in `src/build-identity.ts` | `node:` modules except processes and the network |
| `scripts/` | the release tools and their pure cores in `scripts/lib` | any `node:` module and `yaml`; never imports the packages or the cli |
| `release/` | claims, objectives and the SOP | data |
| `.github/workflows/ladder-ci.yml` | a **template**: inactive here, copy it to the repository root to run it | |

The rung 3 rules still hold (`tests/architecture`), plus two: the Scripts rule (scripts judge the
workspace from outside and nothing imports them) and the Identity rule (only `build-identity.ts` reads
`GIT_SHA` and `BUILD_DATE`). `tests/release` holds the workflow, the Dockerfile and the release files to
their rules.

See `RUNG.md` for what this rung adds and leaves out, and `AGENTS.md` for the working agreement.
