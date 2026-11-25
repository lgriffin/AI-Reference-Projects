# AGENTS.md

Rung 5 (Reader) of the Tutors ladder: rung 4's specified workspace plus `apps/reader`, a Svelte 5 and
SvelteKit 3 reader for `tutors.json`. The working agreement for every contributor, human or AI; what a test
can check lives in the tests.

## Verify

    pnpm test          # tsc, svelte-check, every Vitest tier, the build
    pnpm test:e2e      # builds, then clicks through it in Chromium

`pnpm test` is the Single Gate. Run `pnpm test:e2e` when you change what a learner sees, and
`pnpm test:mutation` then `pnpm check:mutation-floors` when you change `packages/` or `lib/course`.

## Behaviour starts as a sentence

1. `pnpm test:ears:audit --next-id`; add the EARS sentence to `REQUIREMENTS.md` (layer `reader`).
2. Copy it word for word as a `Rule:` tagged `@R-NNN @ears-<pattern>` in `tests/bdd/features/reader/`,
   with a scenario. Bind the steps. See it fail.
3. Implement it in `apps/reader/src/lib/course`, plain TypeScript the scenario reaches without a browser.
   Components show what it returns.
4. Add a unit test in `tests/unit/reader` so Stryker sees it. Hold the floors.

## Where things go

| You are adding | It belongs in |
| --- | --- |
| a page | `src/routes/(course-reader)/<kind>/...`: `+page.ts` loads, `+page.svelte` renders one component |
| finding things, deciding a 404 | `src/lib/course` |
| a card, a layout, a content view | `src/lib/ui-components` |
| breadcrumbs, a pager, search | `src/lib/ui-navigators` |
| a small piece with no data | `src/lib/ui-primitives` |
| shared state | `src/lib/runes` |
| a test | `tests/<tier>/`, as `tests/TESTING.md` maps them |

Each layer imports only those beneath it. Routes import `#lib/...`, never `$lib`. Only erasable syntax.

## Escaping and accessibility

Show course text with `{text}` and course Markdown with `<Markdown markdown={...} />`, the one `{@html}`.
Never pass course text to `{@html}` or `new SafeHtml(...)`. Every page keeps one `h1`, the skip link and
`main#main-content`; mark the current item with `aria-current`; label every control.

## Rung Fence

`tests/rung-fence.test.ts` fails, naming the file and the rung that introduces the capability, if:

- a `package.json` declares a dependency outside `RUNG.md`'s Dependencies table, or a different version;
- source imports a test tool, or a package not `@ladder/*`, `svelte`, `@sveltejs/kit` or `$app/*`
  (reader) or `node:` (everything else);
- the tools fetch or write client script, anything uses browser storage, or the reader gains server code.

A failure means the work belongs to a later rung. Say so, and stop. Never edit the fence to go green.

## Never to go green

Do not skip, focus or delete a test, loosen an assertion, change a Rule without its requirement, lower a
floor, or move a reader rule into a component to escape its scenario.

## Ask a human first

- Adding or upgrading a dependency; changing the fence or `RUNG.md`'s Dependencies.
- Changing or retiring a requirement in `REQUIREMENTS.md`.
- Changing `tests/architecture/`, `tests/suite-health/`, `scripts/checks/`, `stryker.config.json`, a
  `tsconfig.json`, `vite.config.ts`, a floor other than raising it, or the port's methods.
- Changing `../fixtures/` or the conformance tests; adding a package, an app or a reader layer; this file.
