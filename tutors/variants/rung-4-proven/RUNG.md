# Rung Delta: 5, Proven

## Capability

The rung 3 tools, unchanged for the user, with tests as their specification:

- **Requirements you can check.** `REQUIREMENTS.md` states twelve rules as EARS sentences with ids
  (`R-001` to `R-012`), each naming the layer that implements it.
- **Scenarios.** Each sentence is a Gherkin `Rule:` in `tests/bdd/features`, proved by Given/When/Then
  scenarios bound with `@amiceli/vitest-cucumber`.
- **A Requirement Closure Check.** `pnpm test:ears:audit` (and the gate) fails when a requirement has no
  scenario, a Rule or test cites an unknown id, a Rule's title drifts from its sentence, or a sentence is
  not in EARS form.
- **Tests that test the tests.** The `FileSystemPort` contract, extended (Honest Double); conformance with
  upstream's `tutors.json` and a golden HTML page; fast-check properties, each with a negative fixture that
  proves it can fail; suite-health checks; and mutation testing with per-file score floors.

## Expertise needed

Everything from rungs 1 to 3, plus:

- EARS (Easy Approach to Requirements Syntax): the five patterns and one "shall" per sentence.
- Gherkin: `Feature`, `Rule`, `Scenario`, Given/When/Then, tags; binding steps with vitest-cucumber.
- Vitest: `test`, `describe`, `expect`, configs, `include`, aliases.
- Test doubles, and contract tests that keep a double honest.
- Golden files and oracles (differential testing).
- Property-based testing with fast-check: arbitraries, shrinking, seeds and replay.
- Mutation testing with StrykerJS: mutants, killed and survived, equivalent mutants, mutation score.

## Why Vitest, and why vitest-cucumber

Rung 3 ran its tests with `node --test`. Stryker has no `node:test` runner; its `command` runner could run
the whole suite once per mutant, with no coverage analysis and no per-test results. Upstream uses Vitest
with Stryker's vitest runner, and its BDD tier uses vitest-cucumber, so this rung switched to Vitest. The
rung 3 tests kept their `node:assert` assertions and changed only their import of `test`; new tests use
`expect`. `@amiceli/vitest-cucumber@8` installed cleanly on Node 22 (pnpm warns that the package's CLI
binary is missing from its tarball; the library is unaffected and no script uses the CLI), so no home-made
Gherkin helper was needed.

## Mutation testing

`pnpm test:mutation` mutates the six source files of `packages/gen` and `packages/lite` (StringLiteral and
ObjectLiteral mutators off, as upstream). The run took about 45 seconds on 4 cores.

| Run | Score | What it taught |
| --- | --- | --- |
| BDD steps in the mutation run, the When step doing the work | 85.37% | `course-builder.ts` 72%: mutants a Then step would kill survived |
| BDD steps in, each Then doing the work | 93.29% | inflated: kills came from Then steps crashing without their Given |
| BDD steps out, rung 3's tests plus contract, conformance and fuzz | 82.49% | the honest baseline |
| the same, after the tests added in rung 5 | **93.05%** | the floors in `tests/mutation/mutation-floors.json` |

The first two rows are one finding. vitest-cucumber makes each Given, When and Then a vitest test of its
own, and Stryker's vitest runner always measures coverage per test (it ignores `coverageAnalysis: "off"`
and `"all"`) and reruns only the tests that executed a mutant. So a mutant reached in a When step is
retried without its Then, and one reached in a Then is retried without its Given. Upstream's targeted
`vitest.config.mutation.ts` holds unit and fuzz suites and no steps; this rung does the same and states
why in `vitest.config.mutation.ts`. The scenarios still prove the requirements in `pnpm test`.

Floors at the honest run: `course-builder.ts` 94, `site-builder.ts` 92, `markdown.ts` 87, and 100 for
`lo-kinds.ts`, `memory-file-system.ts` and `html.ts`. Stryker's `break` is 90 for all files together, as
upstream. The survivors left are listed in `reports/mutation/index.html` after a run; several are
equivalent (the `IGNORED` set in `course-builder.ts` repeats what `folderKind` already does), and the
paragraph-break survivors in `markdown.ts` are left for the topic's lab.

## Where this lives upstream

Pinned at tutors-mono-repo `2b96b69`.

| Here | Upstream | What is mirrored |
| --- | --- | --- |
| `REQUIREMENTS.md` | the `Rule:` titles in `tests/bdd/features/**`; `AI-Reference-Projects/typescript/REQUIREMENTS.md` | one EARS sentence per id; upstream keeps the sentence only in the feature, tagged `@rule-NNNN` |
| `tests/bdd/features`, `tests/bdd/steps` | `tests/bdd/features/generator/course-json.feature`, `tests/bdd/steps/generator/course-json.steps.ts` | `Rule:` blocks with `@ears-*` tags, bound with `loadFeature` and `describeFeature` |
| `scripts/checks/ears-audit.ts`, `scripts/checks/lib/gherkin.ts` | `scripts/checks/ears-audit.ts`, `scripts/checks/lib/gherkin-rules.ts` | one "shall", system names, EARS form, tags, `--next-id`; plus the closure with `REQUIREMENTS.md` |
| `tests/bdd/retired-requirement-ids.txt` | `tests/bdd/ears-retired-rule-ids.txt` | ids are never reused |
| `tests/suite-health/requirements.test.ts` | `tests/suite-health/ears-audit.test.ts`; `typescript/tests/architecture/requirements.test.ts` | negative fixtures, then the repository |
| `scripts/checks/suite-health.ts`, `tests/suite-health/suite-health.test.ts` | the same paths | `.only`, skips, uncollected files; cut down from upstream's findings |
| `tests/contract/file-system-port.contract.test.ts` | the `course-rules` suite over `packages/jsr/course-rules/src/adapters/memory-fs.ts` | one contract, two adapters (Honest Double) |
| `tests/contract/package-api.test.ts` | `tests/contract/gen-lib-api.test.ts`, `model-lib-api.test.ts` | export names as a contract (upstream snapshots them) |
| `tests/conformance/tutors-json.test.ts`, `golden-html.test.ts` | `tests/generator/generator-compare.test.ts`, `tests/generator/claims.yaml` | the generator held to a committed output; upstream's `tests/conformance` is platform conformance (tier J), a different job |
| `tests/fuzz/*.fuzz.test.ts`, `tests/support/arbitraries/course-tree.ts`, `tests/support/fuzz.ts` | `tests/fuzz/*.fuzz.test.ts`, `tests/support/arbitraries/course-tree.ts` | fast-check properties, a shared course arbitrary, `FUZZ_SEED`/`FUZZ_PATH`/`FUZZ_RUNS`, negative fixtures |
| `stryker.config.json`, `vitest.config.mutation.ts`, `vitest.aliases.ts` | the same paths | Stryker with the vitest runner, aliases so the sandbox tests mutated source |
| `scripts/checks/mutation-floors.ts`, `tests/mutation/mutation-floors.json` | the same paths | per-file floors, stale floors, `--update` |
| `tests/TESTING.md` | `tests/TESTING.md`, `guides/testing/TESTING.md` | a map from folder to tier and command |

## Deliberately left out

- Everything rung 3 left out. Nothing changed for the user.
- Browser tests (Playwright, `@ui` Rules, axe). There is no browser app on this rung; they meet the reader
  at the Summit (upstream `apps/reader/tests/e2e`).
- Ratchet baselines (`known-findings.txt`, `ears-audit-baseline.txt`). A new suite starts clean, so this
  rung fails on every finding instead of only new ones.
- Coverage floors, test-time budgets, the timezone matrix, the no-network setup file, schema contracts
  (Zod) and the nightly and per-pull-request mutation runs.
- A separate fuzz config: the properties are fast enough to stay in the gate.

## Assertion Ladder

| Rule | Rung | Where |
| --- | --- | --- |
| Every requirement is proved, every citation is known, every sentence is EARS | L3/L4 Closure Check | `tests/suite-health/requirements.test.ts`, `pnpm test:ears:audit` |
| A scenario's steps match its feature | L3 | vitest-cucumber's own errors (`RuleNotCalledError`, unknown step) |
| The test double tells the truth | L3/L4 Honest Double | the contract test, and its property twin in `tests/fuzz` |
| The generator agrees with upstream; one page is byte for byte | L3/L4 Executable Rule | `tests/conformance` |
| Each property can fail | L3 Teaching Failure | the "can fail" negative fixtures, required by suite health |
| No focused, skipped or uncollected test | L3/L4 | `tests/suite-health/suite-health.test.ts` |
| The suite notices changes to the code | L3 | `pnpm test:mutation`, `pnpm check:mutation-floors` (outside the gate) |
| Test tools stay out of the product | L3/L4 Rung Fence | `tests/rung-fence.test.ts` |
| Rung 3's layering, plus `scripts/checks` and the tier map | L3/L4 | `tests/architecture` |
