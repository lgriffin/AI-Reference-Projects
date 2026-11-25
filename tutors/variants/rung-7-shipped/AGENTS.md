# AGENTS.md

Rung 7 (Shipped) of the Tutors ladder: the rung 3 workspace made releasable. TypeScript on Node 22.18 or
later, run directly with type stripping. This file is the working agreement for every contributor, human
or AI. Anything a test can check lives in the tests, not here.

## Verify

    pnpm test

The Single Gate. Work is finished when it passes. Before a release also run `pnpm release:claims`,
`pnpm release:slo` and `pnpm container:smoke` (release/SOP.md). If a rule fails, change the code, not the test.

Only erasable syntax. Relative imports carry `.ts`, types use `import type`, packages are imported by name.

## Where things go

| You are adding | It belongs in |
| --- | --- |
| site or generator behaviour | the rung 3 layers: `packages/*`, `apps/cli` |
| a release tool | `scripts/`, its logic in `scripts/lib`, its tests in `scripts/tests` |
| a promise a release makes | `release/claims.yaml`, with the test that is its evidence |
| a budget | `release/slo.yaml`; a new measure in `scripts/lib/slo.ts`, with a test |
| a CI job | `.github/workflows/ladder-ci.yml`, in the gate's `needs` |

## Commits and versions

Write Conventional Commits: `feat(cli): ...`, `fix(lite): ...`, `feat!:` or a `BREAKING CHANGE:` footer.
Never edit a `version` by hand; `pnpm release:version --write` sets them all. Never delete a claim, skip
its test or raise a budget to make a check pass.

## Rung Fence

`tests/rung-fence.test.ts` fails, naming the file and the rung that introduces the capability, if:

- any `package.json` declares a dependency other than `@ladder/*` (`workspace:*`), or the root adds a
  dev dependency other than `typescript`, `@types/node` and `yaml`;
- packages or the cli import anything but `node:` built-ins, relative files and `@ladder/*`, or use the
  network, another process or client-side script;
- a script imports anything but `node:` built-ins, its own files and `yaml`, uses the network (only
  `scripts/container-smoke.ts` may, to reach its container), or runs `git tag` or `git push`.

A failure means the work belongs elsewhere. Say so, and stop. Do not edit the fence to go green.

## Ask a human first

- Tagging, pushing, publishing an image or creating a GitHub Release. Never do these.
- Adding or upgrading any dependency, a base image digest or an action SHA.
- Changing `tests/rung-fence.test.ts`, `tests/architecture/`, `tests/release/`, or a workflow's `permissions`.
- Removing a claim, or raising a budget in `release/slo.yaml`.
- Changing the shared fixture or its oracle in `../fixtures/`, or this file.
