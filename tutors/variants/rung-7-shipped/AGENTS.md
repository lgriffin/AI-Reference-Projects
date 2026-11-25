# AGENTS.md

Rung 7 (Shipped) of the Tutors ladder: rung 6's guarded workspace, made releasable. The working
agreement for every contributor, human or AI. What a test can check lives in the tests.

## Verify

    pnpm test                  # the Single Gate
    pnpm test:e2e              # the reader in Chromium
    pnpm release:claims        # every promise has evidence
    pnpm release:slo           # every budget is kept

Work is finished when `pnpm test` passes. Before a release, follow `release/SOP.md`. Run
`pnpm test:mutation` then `pnpm check:mutation-floors` after changing `packages/`, `lib/course` or
`scripts/lib`. If a check fails, change the code.

## Behaviour starts as a sentence

1. `pnpm test:ears:audit --next-id`; add the EARS sentence to `REQUIREMENTS.md`. A release rule says
   what the release reports ("The release shall ..."), never what a person does.
2. Copy it as a `Rule:` tagged `@R-NNN @ears-<pattern>` in `tests/bdd/features/`, with a scenario. See it fail.
3. Implement it. Add a unit row so Stryker sees it.

## Where things go

| You are adding | It belongs in |
| --- | --- |
| site, generator, reader or policy behaviour | the layers in `README.md` |
| a judgement a release makes | a pure function in `scripts/lib`, tests in `tests/unit/release` |
| a release command | `scripts/`, a `package.json` script and a step in `release/SOP.md` |
| a promise a release makes | `release/claims.yaml`: requirements and evidence |
| a budget | `release/slo.yaml`; a new measure in `scripts/lib/slo.ts` |
| a CI job | `.github/workflows/ladder-ci.yml`, in the gate's `needs` |

## Commits and versions

Write Conventional Commits: `feat(cli): ...`, `fix(lite): ...`, `feat!:` or a `BREAKING CHANGE:` footer.
Never edit a `version` by hand; `pnpm release:version --write` sets them all. Never delete a claim, skip
its test, lower a floor or raise a budget to make a check pass. A check that did not run is reported
as not run.

## Rung Fence

`tests/rung-fence.test.ts` fails, naming the file and the rung that introduces the capability, if:

- a `package.json` declares a dependency outside `RUNG.md`'s table (rung 7 adds `yaml`, root dev only);
- a package, the command or the reader imports `yaml`, a test tool, or anything rung 6 did not allow;
- a script not named in the fence starts a process, or any script but `container-smoke.ts` uses the network;
- a script tags, pushes or publishes;
- anything weakens a CSP, uses browser storage, adds server code or adds a package.

Release tools (`semantic-release`, `@changesets/*`), `dompurify`, `better-auth` and `@supabase/*` arrive
at the Summit. Say so, and stop.

## Ask a human first

- Tagging, pushing, publishing or creating a release. Never do these.
- Adding or upgrading a dependency, a base image digest or an action SHA; changing the fence.
- Removing a claim, raising a budget, lowering a mutation floor, or changing a workflow's `permissions`.
- The CSPs, `safeUrl`'s schemes, `containedPath`, the policy, an audit allowance.
- Changing a requirement, `tests/architecture/`, `tests/suite-health/`, `tests/release/`,
  `scripts/checks/`, a golden file, a port, `../fixtures/`, this file or `SECURITY.md`.
