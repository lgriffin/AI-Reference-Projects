# AGENTS.md

Rung 5 (Reader) of the Tutors ladder: rung 4's specified workspace plus `apps/reader`, a Svelte 5 and
SvelteKit 3 reader for `tutors.json`. Tools run on Node 22.18 or later; the reader runs in a browser. This
file is the working agreement for every contributor, human or AI. Anything a test can check lives in the
tests, not here.

## Verify

    pnpm test          # tsc, svelte-check, every Vitest tier, then the reader's build
    pnpm test:e2e      # builds, then clicks through the reader in Chromium

`pnpm test` is the Single Gate. Run `pnpm test:e2e` when you change anything a learner sees, and
`pnpm test:mutation` then `pnpm check:mutation-floors` when you change `packages/` or `apps/reader/src/lib/course`.

## Behaviour starts as a sentence

1. Take an id: `pnpm test:ears:audit --next-id`. Add the EARS sentence to `REQUIREMENTS.md`, with its
   pattern and layer (`reader` for the reader).
2. Copy it, word for word, as a `Rule:` tagged `@R-NNN @ears-<pattern>` in the feature for that layer
   (`tests/bdd/features/reader/` for the reader), with a scenario. Bind the steps. See it fail.
3. Implement it in the layer the row names: reader rules in `apps/reader/src/lib/course`, plain
   TypeScript, so the scenario reaches it without a browser. Components only show what it returns.
4. Add a unit test in `tests/unit/reader` so Stryker sees it. Hold every floor.

## Where things go

| You are adding | It belongs in |
| --- | --- |
| a page | `apps/reader/src/routes/(course-reader)/<kind>/[courseid]/[...loid]/`: `+page.ts` loads, `+page.svelte` renders one component |
| finding things in a course, deciding a 404 | `apps/reader/src/lib/course` |
| a card, a layout, a content view | `src/lib/ui-components` |
| a bar, breadcrumbs, a pager, search | `src/lib/ui-navigators` |
| a small reusable piece with no data | `src/lib/ui-primitives` |
| shared state | `src/lib/runes`, as a `rune` |
| a test | `tests/<tier>/`, as `tests/TESTING.md` maps them |

Each layer imports only those listed beneath it; `tests/architecture` decides. Reader routes import
`#lib/...`, never `$lib`. Only erasable syntax.

## Escaping and accessibility

Show course text with `{text}` and course Markdown with `<Markdown markdown={...} />`, the one `{@html}`.
Never pass course text to `{@html}` or `new SafeHtml(...)`. Every page keeps one `h1`, the skip link and
`main#main-content`; mark the current item with `aria-current`; label every control.

## Rung Fence

`tests/rung-fence.test.ts` fails, naming the file and the rung that introduces the capability, if:

- a `package.json` declares a dependency outside `RUNG.md`'s Dependencies table, or a different version;
- source imports a package that is not `@ladder/*`, `svelte`, `@sveltejs/kit` or `$app/*` (reader), or
  not `node:` (everything else), or any test tool;
- the tools fetch or write client script, anything uses browser storage, or the reader gains server code.

A failure means the work belongs to a later rung. Say so, and stop. Do not edit the fence to go green.

## Never to go green

Do not skip, focus or delete a test; loosen an assertion; change a Rule's sentence without its
requirement; lower a mutation floor; or move a reader rule into a component to escape its scenario.

## Ask a human first

- Adding or upgrading any dependency, or changing `tests/rung-fence.test.ts` or `RUNG.md`'s Dependencies.
- Changing or retiring a requirement in `REQUIREMENTS.md`.
- Changing `tests/architecture/`, `tests/suite-health/`, `scripts/checks/`, `stryker.config.json`, a
  `tsconfig.json`, `vite.config.ts`, a floor other than raising it, or the port's methods.
- Changing the shared fixture or its oracle in `../fixtures/`, or the conformance tests.
- Adding a package, an app, a reader layer, or changing this file.
