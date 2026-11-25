# AGENTS.md

Rung 4 (Reader) of the Tutors ladder: the rung 3 workspace plus `apps/reader`, a Svelte 5 and SvelteKit 3
reader for `tutors.json`. Tools run on Node 22.18 or later with type stripping; the reader runs in a
browser. This file is the working agreement for every contributor, human or AI. Anything a test can check
lives in the tests, not here.

## Verify

    pnpm test          # tsc, svelte-check, every node --test suite, then the reader's build
    pnpm test:e2e      # builds, then clicks through the reader in Chromium

`pnpm test` is the Single Gate. Run `pnpm test:e2e` too when you change anything a learner sees. If an
architecture rule, the Rung Fence or a conformance test fails, change the code, not the test.

Only erasable syntax. Relative imports carry their extension (`.ts`, `.svelte`); reader routes import
`#lib/...`, never `$lib`.

## Where things go

| You are adding | It belongs in |
| --- | --- |
| a learning object kind or field | `packages/model`, then each `case` tsc or svelte-check asks for |
| reading a course folder | `packages/gen`; the reader gets courses only as `tutors.json` |
| a page | `apps/reader/src/routes/(course-reader)/<kind>/[courseid]/[...loid]/`: `+page.ts` loads, `+page.svelte` renders one component |
| finding things in a course | `apps/reader/src/lib/course`, plain TypeScript, with a test in `apps/reader/tests` |
| a card, a layout, a content view | `src/lib/ui-components` |
| a bar, breadcrumbs, a pager, search | `src/lib/ui-navigators` |
| a small reusable piece with no data | `src/lib/ui-primitives` |
| shared state | `src/lib/runes`, as a `rune` |

Each layer imports only those listed beneath it; `tests/architecture/reader-layers.test.ts` decides.

## Escaping

Show course text with `{text}`. Show course Markdown with `<Markdown markdown={...} />`, the one `{@html}`
in the reader. Never pass course text to `{@html}` or to `new SafeHtml(...)`.

## Accessibility

Every page keeps one `h1`, the shell's skip link and `main#main-content`, and links you can reach by
keyboard. Mark the current item with `aria-current`. Give every new control a visible label.

## Rung Fence

`tests/rung-fence.test.ts` fails, naming the file and the rung that introduces the capability, if:

- a `package.json` declares a dependency outside `RUNG.md`'s Dependencies table, or a different version;
- source imports a package that is not `@ladder/*`, `svelte`, `@sveltejs/kit` or `$app/*` (reader), or
  not `node:` (everything else);
- the tools fetch or write client script, anything uses browser storage, or the reader gains server code.

A failure means the work belongs to a later rung. Say so, and stop. Do not edit the fence to go green.

## Ask a human first

- Adding or upgrading any dependency, or changing `tests/rung-fence.test.ts` or `RUNG.md`'s Dependencies.
- Changing `tests/architecture/`, a `tsconfig.json`, `vite.config.ts`, or the port's methods.
- Changing the shared fixture or its oracle in `../fixtures/`, or the conformance test.
- Adding a package, an app, a reader layer, or changing this file.
