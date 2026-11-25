# Assertion levels in rung 7

How rung 7 (Shipped) keeps each of its release rules, from L0 to L5, and what its Rung Fence allows.
Read it before the lab: when a check turns red, this page tells you which level caught it and why that
level was chosen.

## The rules of this rung

| Rule | Level | Pattern | Where it is kept |
| --- | --- | --- | --- |
| Every release claim names a test that exists and runs | L3, L4 | Closure Check, Teaching Failure | `pnpm release:claims`; `scripts/tests/claims.test.ts` runs the check on the real file inside the gate |
| Every SLO is within its budget | L3, L4 | Executable Rule, Teaching Failure | `pnpm release:slo`; the size budget also in the gate (`scripts/tests/slo.test.ts`) |
| The root and every app share one SemVer version, and the changelog has its section | L3, L4 | Executable Rule | `tests/release/release-files.test.ts` |
| A version is derived from Conventional Commits, and a released version is never released again | L3 | Executable Rule | `scripts/lib/conventional.ts` and its golden-file tests |
| Every action is pinned by SHA; permissions are read-only; one job is the gate | L3, L4 | Executable Rule, Single Gate | `tests/release/workflow.test.ts` |
| Base images are pinned by digest; the image runs as a user that is not root | L3, L4 | Executable Rule | `tests/release/dockerfile.test.ts`; `pnpm container:smoke` on the built image |
| Build identity is read in one file and shown in one file | L3, L4 | Executable Rule | the Identity rule in `tests/architecture`; `apps/cli/tests/release.test.ts` |
| Release scripts judge the workspace from outside | L3, L4 | Executable Rule | the Scripts rule in `tests/architecture` |
| `BuildIdentity` always has all four fields | L5 | Unrepresentable Mistake | the type in `packages/lite/src/version.ts`; `buildIdentity()` fills `unknown` |
| Commit messages are Conventional | L2, partly L3 | Short Manifest | `AGENTS.md`; `pnpm release:version` warns on each message it cannot read |
| The changelog is curated, not pasted | L2 | Short Manifest | `release/SOP.md` step 3 |
| A person tags the release | Human Boundary, partly L3 | Human Boundary | `release/SOP.md` step 8; the fence fails a script that runs `git tag` or `git push` |
| Where the release stands | L1 | Worked Slice | the readiness A3, `out/readiness.md`: it shows and never decides |

## Why these levels

- **Claims are L3, not L5.** A YAML file cannot be made to fail to compile. The Closure Check is the next
  best thing: every reference must resolve, and the message says how to make it.
- **The time budget stays out of the gate.** Build time depends on the machine, so a gate that judged it
  would fail at random and teach people to ignore it. The size budget is deterministic, so it is in the
  gate; time is judged by `pnpm release:slo` and in CI.
- **Tagging stays a person's act.** It cannot be undone (upstream: "Tags are immutable release
  artifacts"). The fence catches the obvious script; the SOP and `AGENTS.md` say the rest.
- **The A3 is L1 on purpose.** Like the release harness's A3, it is advisory: if a page could pass a
  release, people would argue with the page instead of fixing the gap.

## The Rung Fence

`tests/rung-fence.test.ts` starts from rung 3's and lifts it in three named places:

| Allowed now | Why | Still refused |
| --- | --- | --- |
| the dev dependency `yaml` | to read `release/claims.yaml` and `release/slo.yaml` | any runtime dependency; release tools such as `semantic-release`, `release-please`, `@changesets/*`, `conventional-changelog` |
| any `node:` module in `scripts/`, including `node:child_process` | release scripts run git and docker | `node:child_process` in the packages or the cli |
| `fetch` in `scripts/container-smoke.ts` only | to ask the container it started for `/version.json` | the network anywhere else |

A release tool would do in one dependency what rung 7's scripts do in about 900 lines you can read, comments included. The fence
refuses it so that you read every step once. Lifting it, for a real repository, is a decision for a person:
it adds a dependency with access to your tags and your token, which is exactly what talk 3 asks you to
count.

## When an agent meets the fence

The failure names the rule, the file and where the capability belongs. Two examples, seeded on purpose:

~~~
Rung Fence, rung 7 (Shipped): apps/cli/src/build-identity.ts uses other processes or threads
(""node:child_process""). The command is one process that reads files and writes files. It reads the
git commit as files (apps/cli/src/build-identity.ts); running git or docker belongs to the release
scripts in scripts/. Remove it from this rung.

Rung Fence, rung 7 (Shipped): scripts/release-version.ts uses git push or git tag ("git", ["tag"").
Tagging and pushing a release is a person's act (release/SOP.md, step 8: the Human Boundary). A script
prints the command; a person runs it.
~~~

An agent that meets it should say so and stop. Changing the fence is on the "Ask a human first" list.
