# Rung Delta: 5, Reader

## Capability

An interactive reader for `tutors.json`, in Svelte 5 and SvelteKit 3, specified before it was built:

- **A reader.** A course page of topic cards, a topic page of units and cards, talk and note pages, and
  labs you step through by link or arrow key. It is a static build: one fallback page, every load in the
  browser, the course fetched once and kept. The cli gains `--json-only`, which `pnpm course` uses to write
  the course the reader serves.
- **Specified first.** Nine requirements, `R-013` to `R-021`, continue rung 4's sequence in
  `REQUIREMENTS.md`. `the reader` joins the EARS audit's systems (layer `reader`). Each requirement is a
  `Rule:` with Given/When/Then scenarios in `tests/bdd/features/reader/reader.feature` (and R-013 in
  `command.feature`), bound over the reader's plain logic with a stand-in host. The closure audit is green.
- **Every rung 4 tier, extended.** Unit tests for `lib/course` on upstream's `tutors.json`; the reader's
  architecture rules; the reader's logic in the mutation run, with floors; a browser tier, `tests/e2e`.

## Expertise needed

Everything from rungs 1 to 4, plus:

- Svelte 5 components and runes: `$props`, `$state`, `$derived`, snippets and `{@render}`, `{#each}` with keys.
- SvelteKit 3 routing: route folders, `[param]` and `[...rest]`, `(group)` folders, `+page.ts` load
  functions, `+layout.svelte`, `+error.svelte`, `$app/navigation`, `$app/state`, `#lib` subpath imports.
- Vite as dev server and bundler, and `adapter-static` with a fallback page (a single-page app).
- `svelte-check` for types across `.svelte` files.
- Escaping in a component framework: `{text}` escapes, `{@html}` does not.
- Accessibility basics: landmarks, a skip link, `aria-current`, focus after navigation, keyboard paths.
- Specifying a user interface in EARS: which rules belong to plain logic (and a scenario), and which to a
  browser (and the smoke test).
- A browser smoke test with the `playwright` library, run by Vitest.

## Dependencies

The Rung Fence (`tests/rung-fence.test.ts`) allows exactly these, and checks that this table agrees with it.

| Package | Version | Where, and why |
| --- | --- | --- |
| `svelte` | `5.57.2` | `apps/reader` dev: the component compiler and runes. Upstream's reader pins the same. |
| `@sveltejs/kit` | `3.1.1` | `apps/reader` dev: routing, load functions, the build. Upstream pins the same. |
| `@sveltejs/vite-plugin-svelte` | `7.3.0` | `apps/reader` dev: compiles `.svelte` files inside Vite (a peer of kit). |
| `@sveltejs/adapter-static` | `4.0.1` | `apps/reader` dev: writes the build as plain files with a `200.html` fallback. |
| `vite` | `8.3.5` | `apps/reader` dev: dev server and bundler. Upstream's lockfile resolves the same. |
| `svelte-check` | `4.7.6` | `apps/reader` dev: type-checks `.svelte` files in the gate. |
| `playwright` | `1.63.0` | root dev, new: drives Chromium for `pnpm test:e2e`. The library, not upstream's `@playwright/test` runner. |
| `typescript` | `^6.0.3` | root dev, from rung 3. |
| `@types/node` | `^22.20.7` | root dev, from rung 3. |
| `vitest` | `^5.1.2` | root dev, from rung 4: the runner for every tier, the browser tier included. |
| `@amiceli/vitest-cucumber` | `^8.0.1` | root dev, from rung 4: Gherkin features bound to Vitest. |
| `fast-check` | `^4.11.0` | root dev, from rung 4: property-based tests. |
| `@stryker-mutator/core` | `^10.1.1` | root dev, from rung 4: mutation testing. |
| `@stryker-mutator/vitest-runner` | `^10.1.1` | root dev, from rung 4: Stryker's Vitest runner. |

All are build-time or test-time tools. The built reader ships Svelte's small runtime and the code in
`apps/reader/src`, `@ladder/lite` and nothing else.

## Specifying the reader

The old reader (built before testing moved to rung 4) was ported onto rung 4 in this order:

1. Nine sentences in `REQUIREMENTS.md`, one per rule a learner or a host can observe. `--json-only` is the
   command's (R-013); the rest are the reader's: fetch once (R-014), refuse odd ids (R-015) and non-courses
   (R-016), the pages and their routes (R-017), a lab's first step (R-018), step links (R-019), 404
   messages (R-020) and breadcrumbs (R-021).
2. A `Rule:` per sentence in `reader.feature`, with scenarios a reader of the course can follow.
3. One refactor made them testable without a browser. The old routes decided what was missing and called
   SvelteKit's `error()` themselves; now `requestLo` and `requestLab` in `course-service.ts` answer with the
   page or with the 404 message, and `routes/(course-reader)/found.ts` only turns the message into a 404.
4. The rung 4 tiers on the new code: unit tests, the reader's architecture rules, mutation and floors.

What a scenario cannot see (that a click reaches the page, that the 404 is a 404 page, that the arrow key
moves) is proved by `tests/e2e/smoke.e2e.ts`. Its test titles cite the requirements they exercise, and the
EARS audit checks those citations too.

## Mutation testing

`pnpm test:mutation` now also mutates `apps/reader/src/lib/course` (course-service, lo-tree, live-lab). The
whole run took about 40 seconds on 4 cores.

| Run | Reader files | All files |
| --- | --- | --- |
| first run, the old reader's tests ported to Vitest plus tests for `requestLo` and `requestLab` | course-service 93.55, lo-tree 92.00, live-lab 100 | 93.17% |
| after four tests added in this rung for the survivors | course-service 96.77, lo-tree 100, live-lab 100 | **94.28%** |

The two survivors left in `course-service.ts` are equivalent: `typeof json === "object"` made `true`
(anything that is not an object has no `type` of `"course"` either), and `/\/$/` made `/\//` on a step id,
which never holds a slash. Floors: `course-service.ts` 96, `lo-tree.ts` 100, `live-lab.ts` 100; the rung 4
floors are unchanged. As in rung 4, the BDD steps stay out of the mutation run (`vitest.config.mutation.ts`
says why), so the reader's unit tests in `tests/unit/reader` are what Stryker runs.

## Where this lives upstream

Pinned at tutors-mono-repo `2b96b69`. Upstream paths are from the repository root; `ui-*` is
`packages/svelte/ui-*`.

| Here | Upstream | What is mirrored |
| --- | --- | --- |
| `REQUIREMENTS.md` R-014 to R-021, `tests/bdd/features/reader/reader.feature` | `tests/bdd/features/course/course-loading.feature`, `course-navigation.feature` | the reader's rules as EARS `Rule:`s: fetch tutors.json once, replace the course URL placeholder, a lab opens at its first step, breadcrumbs |
| `apps/reader/vite.config.ts` | `apps/reader/vite.config.ts`, `packages/svelte/app-config/src/vite.js`, `svelte.js` | SvelteKit 3 options in the Vite plugin; `staticAdapter` with `fallback: "200.html"` |
| `apps/reader/package.json` `imports` | `apps/reader/package.json` `"#lib/*"` | `#lib` replaces `$lib` in SvelteKit 3 |
| `src/routes/+layout.ts` | `apps/reader/src/routes/+layout.ts` | `ssr = false`, a universal (not server) root layout |
| `src/routes/(course-reader)/+layout.svelte` | `apps/reader/src/routes/(course-reader)/+layout.svelte` | the shell around every course page; focus to `#main-content` after navigation |
| `src/routes/(course-reader)/course/[courseid]/` | the same path | load the course, then `<Composite>` |
| `src/routes/(course-reader)/topic/[courseid]/[...loid]/` | the same path | `readTopic` (here `requestLo("topic")`), then `<Composite>` |
| `src/routes/(course-reader)/talk/...`, `note/...` | the same paths | `readLo`, then `<Note>` (upstream shows talks as PDF or Marp) |
| `src/routes/(course-reader)/lab/[courseid]/[...loid]/` | the same path | `readLab`, first step or the step in the URL, then `<Lab>` |
| `src/lib/course/course-service.ts` | `packages/svelte/course/src/course/services/course.svelte.ts` | `readCourse`, `readLo`, `readLab`, the course cache |
| `src/lib/course/lo-tree.ts` | `packages/svelte/course/src/course/services/lo-tree.ts` | `decorateCourseTree`, `injectCourseUrl`, `loIndex`, breadcrumbs |
| `src/lib/course/live-lab.ts` | `packages/svelte/course/src/course/services/live-lab.ts` | `LiveLab`: current step, `nextStep`, `prevStep` |
| `src/lib/runes/index.svelte.ts` | `packages/svelte/runes/src/index.svelte.ts` | `rune`, `currentCourse`, `currentLo` |
| `src/lib/ui-primitives/Icon.svelte`, `lo-colours.ts` | `ui-primitives/src/components/Icon.svelte`, `packages/svelte/themes/src/styles/lo-colours.ts` | an icon and a colour per kind |
| `src/lib/ui-navigators/TutorsShell.svelte`, `SecondaryNavigator.svelte` | `ui-navigators/src/TutorsShell.svelte`, `SecondaryNavigator.svelte` | the page frame; breadcrumbs |
| `src/lib/ui-components/layout/Card.svelte`, `Cards.svelte`, `Units.svelte` | `ui-components/src/learning-objects/layout/` | `cardDetails`, the card grid, units as boxes |
| `src/lib/ui-components/structure/Composite.svelte` | `ui-components/src/learning-objects/structure/Composite.svelte` | one component for course and topic, sides in a column |
| `src/lib/ui-components/content/Note.svelte`, `lab/Lab.svelte` | `ui-components/src/learning-objects/content/Note.svelte`, `content/lab/Lab.svelte` | Markdown pages; the step pager and arrow keys |
| `tests/architecture/reader-layers.test.ts` | `tests/architecture/dependency-rules.test.ts` (`layer-ui-*`, `ui-primitives-no-data-features`) | ui layering, with teaching messages |
| `tests/e2e/serve.ts`, `smoke.e2e.ts`, `vitest.config.e2e.ts` | `apps/reader/tests/e2e/static-reader.spec.ts`, `apps/reader/playwright.static.config.ts`, `tests/fixtures/static-reader/serve.mjs` | the static build on a plain file server with a `200.html` fallback, walked in Chromium |

## Deliberately left out

- Everything rung 4 left out except browser tests, which arrive here as one smoke test.
- Sign-in, presence, time tracking, locks and roles (rung 6 and the Summit), and every server route.
- Search, walls, the calendar, videos, PDFs and Marp talks, notebooks, quizzes, panels.
- Themes, card styles, Tailwind and Skeleton, Iconify icons, i18n. The reader has light and dark tokens and
  English text only.
- markdown-it, Shiki, KaTeX and Mermaid. `renderMarkdown` from `@ladder/lite` does the rendering.
- Images and archives: only `tutors.json` is published, so an archive card has no link.
- Fetching a course from another host. Upstream's `determineCourseUrl` turns an id into a Netlify host;
  here an id is a folder under `static/courses/` (R-015).
- `@playwright/test`, `@ui` Rules and axe: upstream's browser suite, left to the Summit.
- Rung 4's "Hidden topics" assignment test. Each rung carries its own assignment; this rung's is the
  next and previous navigator in `tests/assignment/`.

## Assertion Ladder

| Rule | Rung | Where |
| --- | --- | --- |
| Every reader requirement is proved, every citation is known | L3/L4 Closure Check | `tests/suite-health/requirements.test.ts`, `pnpm test:ears:audit` |
| Every kind has a colour, a card and (for pages) a route | L5 Unrepresentable Mistake | `Record<LoType, string>` in `lo-colours.ts`, checked by `svelte-check` |
| The reader never imports `gen` or `node:` | L3/L4 Teaching Failure | Layering and Browser rules, `tests/architecture/architecture.test.ts` |
| UI layers point down; primitives import no data | L3/L4 Teaching Failure | Reader layering and Framework rules, `reader-layers.test.ts` |
| One place fetches, one place writes raw HTML, nothing in the reader makes SafeHtml | L3/L4 Teaching Failure | Loader and Raw HTML rules; Trusted HTML rule |
| Course text is escaped | L5 by default, L3 checked | Svelte's `{text}`; `renderMarkdown` escapes first |
| The reader reads upstream's `tutors.json` | L3 Executable Rule | `tests/unit/reader/lo-tree.test.ts` and the scenarios, on the upstream oracle |
| A learner can click from the course to a lab step; a bad URL is a 404 | L3 Executable Rule | `pnpm test:e2e` |
| The suite notices changes to the reader's logic | L3 | `pnpm test:mutation`, `pnpm check:mutation-floors` |
| Only the listed dependencies, no server code | L3/L4 Teaching Failure | `tests/rung-fence.test.ts` |
| Rules from rungs 3 and 4 | as before | `tests/architecture`, `tests/suite-health`, `tests/mutation` |
