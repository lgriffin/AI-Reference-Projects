# Rung 4: Reader

The rung 3 workspace plus `apps/reader`: an interactive course reader in Svelte 5 and SvelteKit. The
command line still turns a course folder into `tutors.json`; the reader fetches that file in the browser and
shows the course as cards, topics, talks, notes and labs you can step through.

## Run it in three commands

    pnpm install                   # adds Svelte, SvelteKit and Vite to rung 3's tools
    pnpm test                      # the Single Gate: tsc, svelte-check, every node --test suite, then the build
    pnpm dev                       # builds the sample course's tutors.json and serves the reader

Open <http://localhost:5173/course/ladder-sample-course>. `pnpm test:e2e` builds the reader and clicks
through it in Chromium (Playwright); run `pnpm exec playwright install chromium` once if you have no browser.
`pnpm test:assignment` runs the grading tests for topic 5's assignment, which the gate skips.

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
reader's unit tests read the file upstream's generator wrote for the same fixture, so the reader honours
upstream's contract too.

## The reader

    src/routes/(course-reader)/<kind>/[courseid]/[...loid]/+page.ts    load: courseService, then an index lookup
                                                    +page.svelte       one component from ui-components
    src/lib/ui-components   Card, Cards, Units, Composite, Note, Lab
    src/lib/ui-navigators   TutorsShell, SecondaryNavigator (breadcrumbs)
    src/lib/ui-primitives   Icon, Markdown (the one {@html}), lo-colours
    src/lib/runes           currentCourse, currentLo: shared $state
    src/lib/course          course-service (the one fetch), lo-tree, live-lab: plain TypeScript

Each layer imports only the ones beneath it. `tests/architecture/reader-layers.test.ts` checks that, and
that only the course service fetches and only `Markdown.svelte` writes raw HTML. The names and the shape
follow upstream's `apps/reader` and `packages/svelte/ui-*`; `RUNG.md` maps each file.

| URL | Load | Component |
| --- | --- | --- |
| `/course/[courseid]` | `readCourse` | `structure/Composite.svelte` |
| `/topic/[courseid]/[...loid]` | `readCourse`, `findLo` | `structure/Composite.svelte` |
| `/talk/...`, `/note/...` | `readCourse`, `findLo` | `content/Note.svelte` |
| `/lab/[courseid]/[...loid]` | `readLab` | `content/lab/Lab.svelte` |

## Extension points

| To add | Change | The checks that guide you |
| --- | --- | --- |
| a learning object kind | `packages/model`, then each `case` tsc asks for, and `lo-colours.ts` | exhaustive switches and `Record<LoType, ...>` (L5) |
| a page for a kind | a route folder, a load that calls the course service, one component | the reader layering rules |
| a navigator (next/previous, search) | `src/lib/ui-navigators`, used by a component or the shell | the reader layering rules, a unit test for its logic, the smoke test |
| a dependency | a person's decision: `RUNG.md` and the Rung Fence together | `tests/rung-fence.test.ts` |

See `RUNG.md` for what this rung adds and leaves out, and `AGENTS.md` for the working agreement.
