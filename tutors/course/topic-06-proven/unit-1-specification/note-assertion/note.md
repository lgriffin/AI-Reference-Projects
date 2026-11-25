# Assertion levels in rung 5

How rung 5 (Proven) keeps its rules, from L0 to L5, what its Rung Fence allows, and what lifting it means.

## The rules of this rung

| Rule | Level | Where it is kept |
| --- | --- | --- |
| Every requirement has a scenario; every Rule and test cites a known id | L4 Closure Check | `tests/suite-health/requirements.test.ts`, `pnpm test:ears:audit`; each finding names the id and the fix |
| A Rule's title is its requirement's sentence, word for word | L4 | the same audit (`rule-title-drift`) |
| Each requirement is in EARS form, names its system and its layer | L4 | the same audit (`shall-count`, `ears-form`, `layer-mismatch`, ...) |
| A scenario's steps match its feature | L3 | vitest-cucumber's own errors, such as `RuleNotCalledError`; they name the Rule but not the fix |
| The test double tells the truth | L4 Honest Double | `tests/contract/file-system-port.contract.test.ts` and its property twin in `tests/fuzz` |
| Every adapter runs the contract | L4 | rung 3's Honest Double rule in `tests/architecture` |
| The generator agrees with upstream | L3 Executable Rule | `tests/conformance/tutors-json.test.ts` (a deep-equal diff, no remedy) |
| One page matches its golden file | L4 | `tests/conformance/golden-html.test.ts`, which shows the first difference and what to do |
| Each property can fail | L4 | suite health's `no-negative-fixture` finding |
| No focused, skipped or uncollected test | L4 | `tests/suite-health/suite-health.test.ts` |
| Every tier is on the map | L4 | `tests/architecture/test-tiers.test.ts` |
| The suite notices changes to gen and lite | L3, outside the gate | `pnpm test:mutation`, then `pnpm check:mutation-floors` |
| Every kind has a builder and a page | L5 Unrepresentable Mistake | rung 3's exhaustive switches, unchanged |
| Behaviour starts as a sentence a person approves | L2 and Human Boundary | `AGENTS.md`, "Behaviour starts as a sentence" and "Ask a human first" |
| Never skip, loosen or regenerate to go green | L2, partly L4 | `AGENTS.md`; suite health catches skips and focus, not a loosened assertion |

Why mutation testing stays at L3 outside the gate: it takes about a minute, and its findings need a person
to judge (a survivor may be equivalent). Upstream runs it nightly and on pull requests, not in `pnpm test`.

Why "never loosen an assertion" stays at L2: no check can tell a weaker assertion from a better one. Mutation
testing is the closest thing: a loosened assertion lets mutants survive, and the floor check fails.

## What the Rung Fence allows

Rung 5 adds test tools, and only as dev dependencies of the root `package.json`:

| Package | Why |
| --- | --- |
| `vitest` | the runner; Stryker's vitest runner needs it |
| `@amiceli/vitest-cucumber` | binds Gherkin features to Vitest, as upstream's `tests/bdd` |
| `fast-check` | property-based tests, as upstream's `tests/fuzz` |
| `@stryker-mutator/core`, `@stryker-mutator/vitest-runner` | mutation testing, as upstream's `stryker.config.json` |

Runtime dependencies are still none. The fence adds two new messages:

~~~
Rung Fence, rung 5 (Proven): packages/gen/package.json declares the test tool "fast-check" in dependencies.
Rung 5's test tools are dev dependencies of the root package.json only: tests run them, and nothing that
runs the command or builds the site may need them. Move it to the root devDependencies.

Rung Fence, rung 5 (Proven): packages/lite/src/html.ts imports the test tool "fast-check". Source never
imports a test tool; tests import the source. Put the test under tests/ (see tests/TESTING.md for the tier).
~~~

Playwright and axe are refused with "the Summit, where rung 4's reader meets rung 5's tests"; cucumber-js,
Jest and Mocha with "no rung: rung 5 (Proven) chose vitest and @amiceli/vitest-cucumber, as upstream does".

## What lifting the fence means

Lifting it to add a browser test runner means there is a browser app to test: that is rung 4's reader
composed with this rung, at the Summit. Lifting it to add a second BDD runner means two ways to bind a
feature, which upstream decided against (its `ears-gherkin-dev` skill: "Do not add cucumber-js or a second
runner"). Either is a person's decision, made in its own commit, with the reason in `RUNG.md`.
