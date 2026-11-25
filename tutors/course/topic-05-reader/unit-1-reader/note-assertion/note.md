# Assertion levels at rung 4

How the reader's rules are kept, from L0 to L5, what the Rung Fence allows, and what lifting it means.

## The levels, briefly

| Level | Name | What the contributor experiences |
| --- | --- | --- |
| L0 | Implied | nothing; it guesses |
| L1 | Shown | a pattern to imitate |
| L2 | Told | a rule it may follow, forget or misread |
| L3 | Checked | a red suite |
| L4 | Explained | a red suite whose message names the rule, the offender and the fix |
| L5 | Prevented | the wrong form does not compile |

## The rules of rung 4

Everything in `variants/rung-4-reader` runs behind one gate, `pnpm test`: `tsc` for each package,
`svelte-check` for the reader, every `node --test` suite, then `vite build`.

| Rule | Level | Where it is kept |
| --- | --- | --- |
| Every kind of learning object has a colour (and every `switch` a case) | L5 Unrepresentable Mistake | `Record<LoType, string>` in `apps/reader/src/lib/ui-primitives/lo-colours.ts`, checked by `svelte-check` |
| Course text is escaped | L5 by default | Svelte escapes `{text}`; `renderMarkdown` escapes before it adds tags |
| Only `Markdown.svelte` writes raw HTML | L4 Teaching Failure | Raw HTML rule, `tests/architecture/reader-layers.test.ts` |
| The reader never imports `@ladder/gen` or `node:` | L4 | Layering and Browser rules, `tests/architecture/architecture.test.ts` |
| UI layers point down; primitives import no data | L4 | Reader layering rule, mirroring upstream's `ui-primitives-no-data-features` |
| `lib/course`, `lib/runes` and `ui-primitives` do not use SvelteKit | L4 | Framework rule |
| `lib/course` is plain TypeScript | L4 | Plain logic rule |
| Only the course service fetches | L4 | Loader rule |
| A `package.json` declares exactly what its source imports | L3 Closure Check | Closure rule, from rung 3 |
| The reader reads upstream's `tutors.json` | L3 Executable Rule | `apps/reader/tests/lo-tree.test.ts` runs on `fixtures/ladder-sample-course.tutors.json` |
| A learner can click from the course to a lab step | L3 | `pnpm test:e2e`, Playwright in Chromium; run it when you change what a learner sees |
| Every page keeps a skip link, `main#main-content`, `aria-current` | L2 Told, L3 in part | `AGENTS.md`, "Accessibility"; the smoke test checks `aria-current` |
| Where a new page, card or navigator goes | L2, L1 | `AGENTS.md` "Where things go"; the four routes as worked examples |
| Generator and reader meet only in `tutors.json` | L1 Shown | `pnpm course`, and the README's Architecture section |

Each L4 rule fails with a message that names the rule, the file and the fix. Try one: put
`{@html cardDetails.summary}` in `Card.svelte` and run `pnpm test`.

## The Rung Fence

`tests/rung-fence.test.ts` allows exactly what `RUNG.md`'s Dependencies table names:

- in `apps/reader` dev dependencies: `svelte 5.57.2`, `@sveltejs/kit 3.1.1`,
  `@sveltejs/vite-plugin-svelte 7.3.0`, `@sveltejs/adapter-static 4.0.1`, `vite 8.3.5`, `svelte-check 4.7.6`;
- at the root: `typescript`, `@types/node`, and `playwright 1.63.0` for the smoke test.

It also fails if reader source imports anything but its own files, `@ladder/*`, `$app/*`, `svelte` or
`@sveltejs/kit`; if the tools fetch or write client script; if anything uses browser storage; or if the
reader gains a `*.server.ts` file. A last test checks that the fence and `RUNG.md` agree, so a learner can
trust the table.

Each failure names the rung where the thing arrives: `@playwright/test` and `vitest` in rung 5 (Proven),
`isomorphic-dompurify` and `better-auth` in rung 6 (Guarded), Tailwind and markdown-it at the Summit.

## What lifting the fence means

Lifting the fence is a person's decision, written in `AGENTS.md` under "Ask a human first". When an agent
meets the fence, the right answer is "this belongs to rung N", not an edit to the fence. If you decide to
lift it, do it in its own commit: add the package to `READER_DEV` or `ALLOWED_DEV` and to `RUNG.md` in the
same change, so the last fence test stays green, and say in `RUNG.md` what it adds and which upstream file
it mirrors. That is how the Summit assignment composes rungs 4 to 7: one widening per commit, made by you.
