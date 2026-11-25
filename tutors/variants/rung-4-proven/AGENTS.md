# AGENTS.md

Rung 5 (Proven) of the Tutors ladder: rung 3's layered tools, specified by their tests. TypeScript on
Node 22.18 or later. This file is the working agreement for every contributor, human or AI. Anything a test
can check lives in the tests, not here.

## Verify

    pnpm test

The Single Gate: `tsc` for every package, then Vitest over every tier in `tests/TESTING.md`. Work is
finished when it passes. If you changed `packages/gen` or `packages/lite`, also run `pnpm test:mutation`
and `pnpm check:mutation-floors`.

## Behaviour starts as a sentence

1. Take an id: `pnpm test:ears:audit --next-id`.
2. Add the EARS sentence to `REQUIREMENTS.md`, with its pattern and layer.
3. Copy it, word for word, as a `Rule:` in the feature for that layer, tagged `@R-NNN @ears-<pattern>`,
   with a scenario. Bind the steps. See it fail.
4. Implement it in the layer the row names. See it pass.
5. Add a unit or property test for the new code, so the mutation run can see it: Stryker does not run
   the BDD steps (`vitest.config.mutation.ts` says why). Hold every floor.

Refactors and fixes that restore stated behaviour need no new requirement.

## Where things go

| You are adding | It belongs in |
| --- | --- |
| a requirement | `REQUIREMENTS.md`, then `tests/bdd/features/<layer>/` |
| a step binding | `tests/bdd/steps/<layer>/*.steps.ts` |
| a unit, contract, conformance or property test | `tests/<tier>/`, as `tests/TESTING.md` maps them |
| logic for a repository check | `scripts/checks`, pure, `node:` imports only |
| product code | as rung 3: `packages/model`, `gen`, `lite`, `apps/cli` |

Escaping and layering are as in rung 3: HTML only through the `html` template; `node:` only in `apps/cli`.

## Rung Fence

No runtime dependencies. `tests/rung-fence.test.ts` fails, naming the file and the rung that introduces
the capability, if:

- a package declares any dependency but `@ladder/*` (`workspace:*`), or the root adds a dev dependency
  other than `typescript`, `@types/node`, `vitest`, `@amiceli/vitest-cucumber`, `fast-check`,
  `@stryker-mutator/core` and `@stryker-mutator/vitest-runner`;
- source imports anything but `node:` built-ins, relative files and `@ladder/*`, a test tool included;
- source uses the network, starts another process, or writes client-side script.

A failure means the work belongs to a later rung. Say so, and stop. Do not edit the fence to go green.

## Never to go green

Do not skip, focus or delete a test; loosen an assertion; weaken a property; change a Rule's sentence
without its requirement; lower a mutation floor; or regenerate the golden file to hide a difference.

## Ask a human first

- Adding or upgrading any dependency, or changing `tests/rung-fence.test.ts`.
- Changing or retiring a requirement in `REQUIREMENTS.md`.
- Regenerating `tests/conformance/golden/` (`UPDATE_GOLDEN=1`), or changing the oracle in `../fixtures/`.
- Changing `tests/architecture/`, `tests/suite-health/`, `scripts/checks/`, `stryker.config.json` or a
  floor in `tests/mutation/mutation-floors.json` other than raising it with `--update`.
- Changing a package's `tsconfig.json`, the port's methods, or this file.
