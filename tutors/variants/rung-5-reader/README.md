# Rung 5: Reader

Rung 4's workspace, its tests and its requirements, plus `apps/reader`: an interactive course reader in
Svelte 5 and SvelteKit 3. The command line still turns a course folder into `tutors.json`; the reader fetches
that file in the browser and shows the course as cards, topics, talks, notes and labs you can step through.
The reader was specified first: nine new EARS requirements (`R-013` to `R-021`) and their Given/When/Then
scenarios came before its code, and the closure audit holds them together.

## Run it in three commands

    pnpm install                   # adds Svelte, SvelteKit, Vite and playwright to rung 4's tools
    pnpm test                      # the Single Gate: tsc, svelte-check, every Vitest tier, then the reader's build
    pnpm dev                       # builds the sample course's tutors.json and serves the reader

Open <http://localhost:5173/course/ladder-sample-course>. `pnpm test:e2e` builds the reader and clicks
through it in Chromium; run `pnpm exec playwright install chromium` once if you have no browser.
`pnpm test:assignment` runs the grading tests for week 9's assignment, which the gate skips.

## The tests

Everything from rung 4 still runs, and `tests/TESTING.md` maps every folder. What this rung adds:

| Command | What it runs | In the gate |
| --- | --- | --- |
| `pnpm test:bdd` | now also `tests/bdd/features/reader`: R-014 to R-021 on the reader's plain logic, and R-013 for `--json-only` | yes |
| `pnpm test:unit` | now also `tests/unit/reader`: the course service, `lo-tree` and `live-lab` on upstream's `tutors.json` | yes |
| `pnpm exec vitest run tests/architecture` | now also the reader's layers, the Browser rule, the Loader rule and the Raw HTML rule | yes |
| `pnpm build` | `pnpm course`, then `vite build` with adapter-static | yes, last |
| `pnpm test:e2e` | builds, then `tests/e2e/smoke.e2e.ts` in Chromium | no: it needs a browser |
| `pnpm test:mutation` | Stryker over gen, lite and the reader's `lib/course` | no |

## From a requirement to the page

    REQUIREMENTS.md       R-018 | Event-driven | When a lab is opened without a step in its URL, the reader shall ... | reader
          │  the same sentence, word for word
          ▼
    tests/bdd/features/reader/reader.feature     @R-018 @ears-event-driven  Rule: When a lab is opened ...
          │  Scenario: Given a host that serves ... / When a learner opens ... / Then the reader shows step 1 of 3
          ▼
    tests/bdd/steps/reader/reader.steps.ts      calls requestLab, as the lab route's +page.ts does
          │
          ▼
    apps/reader/src/lib/course/course-service.ts, live-lab.ts     the plain logic the row names
          │
          ▼
    src/routes/(course-reader)/lab/[courseid]/[...loid]/+page.ts → <Lab>     proved in Chromium by pnpm test:e2e

## Architecture

    apps/cli ──► @ladder/gen ──► @ladder/model ◄── @ladder/reader
        │                            ▲                │
        └──────► @ladder/lite ───────┘◄───────────────┘

| Package | Folder | Job | May import |
| --- | --- | --- | --- |
| `@ladder/model` | `packages/model` | The learning-object types. Types only. | nothing |
| `@ladder/gen` | `packages/gen` | Course folder to `Course`, through `FileSystemPort`. | `@ladder/model` |
| `@ladder/lite` | `packages/lite` | `Course` to static pages; `renderMarkdown` and escaping. | `@ladder/model` |
| `@ladder/cli` | `apps/cli` | The composition root. `--json-only` writes just `tutors.json`. | `@ladder/gen`, `@ladder/lite` |
| `@ladder/reader` | `apps/reader` | `tutors.json` to an interactive site, in the browser. | `@ladder/model`, `@ladder/lite` |

`tutors.json` is the contract between the two halves. `pnpm course` runs the cli at build time and writes
`apps/reader/static/courses/ladder-sample-course/tutors.json`; the reader never sees `gen` or `node:`. The
reader's tests and scenarios read the file upstream's generator wrote for the same fixture, so the reader
honours upstream's contract too.

## The reader

    src/routes/(course-reader)/<kind>/[courseid]/[...loid]/+page.ts    load: requestLo or requestLab, then found()
                                                    +page.svelte       one component from ui-components
    src/lib/ui-components   Card, Cards, Units, Composite, Note, Lab
    src/lib/ui-navigators   TutorsShell, SecondaryNavigator (breadcrumbs)
    src/lib/ui-primitives   Icon, Markdown (the one {@html}), lo-colours
    src/lib/runes           currentCourse, currentLo: shared $state
    src/lib/course          course-service (the one fetch), lo-tree, live-lab: plain TypeScript

Each layer imports only the ones beneath it. `tests/architecture/reader-layers.test.ts` checks that, and
that only the course service fetches and only `Markdown.svelte` writes raw HTML. A route decides nothing:
the course service answers with the page or with a 404 message (R-020), and `found.ts` turns that into
SvelteKit's `error(404, ...)`. So every rule a scenario proves lives in `lib/course`, where Vitest and
Stryker reach it without a browser.

| URL | Load | Component |
| --- | --- | --- |
| `/course/[courseid]` | `requestLo("course", ...)` | `structure/Composite.svelte` |
| `/topic/[courseid]/[...loid]` | `requestLo("topic", ...)` | `structure/Composite.svelte` |
| `/talk/...`, `/note/...` | `requestLo("talk" or "note", ...)` | `content/Note.svelte` |
| `/lab/[courseid]/[...loid]` | `requestLab(...)` | `content/lab/Lab.svelte` |

## Extension points

| To add | Change | The checks that guide you |
| --- | --- | --- |
| a reader behaviour | `REQUIREMENTS.md` first (`pnpm test:ears:audit --next-id`), a Rule and scenario in `reader.feature`, then `lib/course` | the closure audit, vitest-cucumber |
| a learning object kind | `packages/model`, then each `case` tsc asks for, and `lo-colours.ts` | exhaustive switches and `Record<LoType, ...>` (L5) |
| a page for a kind | a route folder, a load that calls the course service, one component | the reader layering rules |
| a navigator (next/previous, search) | logic in `lib/course`, a component in `src/lib/ui-navigators` | the layering rules, a unit test, a scenario, the smoke test |
| a dependency | a person's decision: `RUNG.md` and the Rung Fence together | `tests/rung-fence.test.ts` |

## Next on the ladder

Rung 6 (Guarded) starts from a copy of this rung: safe content in the site and the reader, private courses
and a secure supply chain, each specified first in the same way. Rung 7 (Shipped) follows.

See `RUNG.md` for what this rung adds and leaves out, `tests/TESTING.md` for the tiers, and `AGENTS.md` for
the working agreement.
