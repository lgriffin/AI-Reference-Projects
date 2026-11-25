# Rung 4: Proven

The rung 3 tools, a course folder in and a static website out, now specified by their tests. Twelve
requirements in `REQUIREMENTS.md`, each an EARS sentence with an id; Gherkin scenarios that prove each one;
a check that keeps the two closed over each other; and tests that test the tests: an honest double,
conformance with upstream, properties, suite health and mutation testing.

## Run it in three commands

    pnpm install                   # TypeScript, Vitest, vitest-cucumber, fast-check and Stryker: dev only
    pnpm test                      # the Single Gate: tsc for every package, then every tier under tests/
    pnpm start ../fixtures/ladder-sample-course out

Open `out/index.html` in a browser. Nothing a user sees has changed since rung 3.

## The tests

| Command | What it runs | In the gate |
| --- | --- | --- |
| `pnpm test` | `pnpm typecheck`, then `vitest run`: every folder in `tests/TESTING.md` | it is the gate |
| `pnpm test:bdd` | the Gherkin features in `tests/bdd/features`, bound by `tests/bdd/steps` | yes |
| `pnpm test:ears:audit` | the Requirement Closure Check and EARS audit; `--next-id` prints the next id | yes, through `tests/suite-health` |
| `pnpm test:unit`, `test:contract`, `test:conformance` | one tier each | yes |
| `pnpm test:fuzz` | the property tests with 1000 runs each (the gate uses 40 to 500) | yes, with fewer runs |
| `pnpm test:mutation` | Stryker over `packages/gen` and `packages/lite`, about a minute | no |
| `pnpm check:mutation-floors` | each mutated file against its floor in `tests/mutation/mutation-floors.json` | no |

## From a requirement to the code

    REQUIREMENTS.md            R-010 | Event-driven | When a lab has more than one step, the site shall ... | lite
          │  the same sentence, word for word
          ▼
    tests/bdd/features/site/static-site.feature     @R-010 @ears-event-driven  Rule: When a lab has ...
          │  Scenario: Given / When / Then
          ▼
    tests/bdd/steps/site/static-site.steps.ts       binds each step; calls buildSite from @ladder/lite
          │
          ▼
    packages/lite/src/site-builder.ts               the layer the row names

`tests/suite-health/requirements.test.ts` fails, naming the id and the fix, if any link in that chain is
missing or has drifted. `REQUIREMENTS.md` says how to add a requirement.

## Architecture

Unchanged from rung 3 (`apps/cli` over `@ladder/gen` and `@ladder/lite` over `@ladder/model`, meeting at
`FileSystemPort`). Rung 4 adds two layers outside the product: `tests/`, one folder per tier, and
`scripts/checks`, the pure logic of the repository checks, which runs under plain `node`.
`tests/architecture` checks both, as well as rung 3's rules.

See `RUNG.md` for what this rung adds and leaves out, `tests/TESTING.md` for the tiers, and `AGENTS.md`
for the working agreement.

## Next on the ladder

Rung 5 (Reader) starts from a copy of this rung and adds an interactive SvelteKit reader, specified first:
its rules arrive as new EARS requirements and scenarios before any Svelte is written. Rung 6 (Guarded) and
rung 7 (Shipped) follow, each in the same way.
