# Rung Delta: 4, Reader

## Capability

An interactive reader for `tutors.json`, in Svelte 5 and SvelteKit: a course page of topic cards, a topic
page of units and cards, talk and note pages, and labs you step through by link or arrow key. It is a static
build: one fallback page, every load in the browser, the course fetched once and kept. The cli gains
`--json-only`, which `pnpm course` uses to write the course the reader serves.

## Expertise needed

Everything from rungs 1 to 3, plus:

- Svelte 5 components and runes: `$props`, `$state`, `$derived`, snippets and `{@render}`, `{#each}` with keys.
- SvelteKit 3 routing: route folders, `[param]` and `[...rest]`, `(group)` folders, `+page.ts` load
  functions, `+layout.svelte`, `+error.svelte`, `$app/navigation`, `$app/state`, `#lib` subpath imports.
- Vite as dev server and bundler, and `adapter-static` with a fallback page (a single-page app).
- `svelte-check` for types across `.svelte` files.
- Escaping in a component framework: `{text}` escapes, `{@html}` does not.
- Accessibility basics: landmarks, a skip link, `aria-current`, focus after navigation, keyboard paths.
- A browser smoke test with Playwright.

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
| `typescript` | `^6.0.3` | root dev, from rung 3. |
| `@types/node` | `^22.20.7` | root dev, from rung 3. |
| `playwright` | `1.63.0` | root dev: drives Chromium for `pnpm test:e2e`. The library, not the `@playwright/test` runner (rung 5). |

All are build-time tools. The built reader ships Svelte's small runtime and the code in `apps/reader/src`,
`@ladder/lite` and nothing else.

## Where this lives upstream

Pinned at tutors-mono-repo `2b96b69`. Upstream paths are from the repository root; `ui-*` is
`packages/svelte/ui-*`.

| Here (`apps/reader/...`) | Upstream | What is mirrored |
| --- | --- | --- |
| `vite.config.ts` | `apps/reader/vite.config.ts`, `packages/svelte/app-config/src/vite.js`, `svelte.js` | SvelteKit 3 options in the Vite plugin; `staticAdapter` with `fallback: "200.html"` |
| `package.json` `imports` | `apps/reader/package.json` `"#lib/*"` | `#lib` replaces `$lib` in SvelteKit 3 |
| `src/routes/+layout.ts` | `apps/reader/src/routes/+layout.ts` | `ssr = false`, a universal (not server) root layout |
| `src/routes/(course-reader)/+layout.svelte` | `apps/reader/src/routes/(course-reader)/+layout.svelte` | the shell around every course page; focus to `#main-content` after navigation |
| `src/routes/(course-reader)/course/[courseid]/` | the same path | `readCourse`, then `<Composite>` |
| `src/routes/(course-reader)/topic/[courseid]/[...loid]/` | the same path | `readTopic` (here `readCourse` and `findLo`), then `<Composite>` |
| `src/routes/(course-reader)/talk/...`, `note/...` | the same paths | `readLo`, then `<Note>` (upstream shows talks as PDF or Marp) |
| `src/routes/(course-reader)/lab/[courseid]/[...loid]/` | the same path | `readLab`, first step or the step in the URL, then `<Lab>` |
| `src/lib/course/course-service.ts` | `packages/svelte/course/src/course/services/course.svelte.ts` | `readCourse`, `readLo`, `readLab`, the course cache |
| `src/lib/course/lo-tree.ts` | `packages/svelte/course/src/course/services/lo-tree.ts` | `decorateCourseTree`, `injectCourseUrl`, `loIndex`, breadcrumbs |
| `src/lib/course/live-lab.ts` | `packages/svelte/course/src/course/services/live-lab.ts` | `LiveLab`: current step, `nextStep`, `prevStep` |
| `src/lib/runes/index.svelte.ts` | `packages/svelte/runes/src/index.svelte.ts` | `rune`, `currentCourse`, `currentLo` |
| `src/lib/ui-primitives/Icon.svelte`, `lo-colours.ts` | `ui-primitives/src/components/Icon.svelte`, `packages/svelte/themes/src/styles/lo-colours.ts` | an icon and a colour per kind |
| `src/lib/ui-navigators/TutorsShell.svelte` | `ui-navigators/src/TutorsShell.svelte` | the page frame |
| `src/lib/ui-navigators/SecondaryNavigator.svelte` | `ui-navigators/src/SecondaryNavigator.svelte` | breadcrumbs |
| `src/lib/ui-components/layout/Card.svelte`, `Cards.svelte`, `Units.svelte` | `ui-components/src/learning-objects/layout/` | `cardDetails`, the card grid, units as boxes |
| `src/lib/ui-components/structure/Composite.svelte` | `ui-components/src/learning-objects/structure/Composite.svelte` | one component for course and topic, sides in a column |
| `src/lib/ui-components/content/Note.svelte`, `lab/Lab.svelte` | `ui-components/src/learning-objects/content/Note.svelte`, `content/lab/Lab.svelte` | Markdown pages; the step pager and arrow keys |
| `tests/architecture/reader-layers.test.ts` | `tests/architecture/dependency-rules.test.ts` (`layer-ui-*`, `ui-primitives-no-data-features`) | ui layering, with teaching messages |
| `tests/e2e/smoke.e2e.ts` | `apps/reader/tests/e2e/static-reader.spec.ts`, `apps/reader/playwright.static.config.ts`, `tests/fixtures/static-reader/serve.mjs` | the static build on a plain file server with a `200.html` fallback, walked in Chromium |

## Deliberately left out

- Sign-in, presence, time tracking, locks and roles (rung 6 and the Summit), and every server route.
- Search, walls, the calendar, videos, PDFs and Marp talks, notebooks, quizzes, panels.
- Themes, card styles, Tailwind and Skeleton, Iconify icons, i18n. The reader has light and dark tokens and
  English text only; talk 3 of the topic shows where upstream keeps each.
- markdown-it, Shiki, KaTeX and Mermaid. `renderMarkdown` from `@ladder/lite` does the rendering.
- Images and archives: only `tutors.json` is published, so an archive card has no link.
- Fetching a course from another host. Upstream's `determineCourseUrl` turns an id into a Netlify host;
  here an id is a folder under `static/courses/`.

## Assertion Ladder

| Rule | Rung | Where |
| --- | --- | --- |
| Every kind has a colour, a card and (for pages) a route | L5 Unrepresentable Mistake | `Record<LoType, string>` in `lo-colours.ts`, checked by `svelte-check` |
| The reader never imports `gen` or `node:` | L3/L4 Teaching Failure | Layering and Browser rules, `tests/architecture/architecture.test.ts` |
| UI layers point down; primitives import no data | L3/L4 Teaching Failure | Reader layering and Framework rules, `reader-layers.test.ts` |
| One place fetches, one place writes raw HTML | L3/L4 Teaching Failure | Loader and Raw HTML rules |
| Course text is escaped | L5 by default, L3 checked | Svelte's `{text}`; `renderMarkdown` escapes first |
| The reader reads upstream's `tutors.json` | L3 Executable Rule | `apps/reader/tests/lo-tree.test.ts` on the upstream oracle |
| A learner can click from the course to a lab step | L3 Executable Rule | `pnpm test:e2e` |
| Only the listed dependencies, no server code | L3/L4 Teaching Failure | `tests/rung-fence.test.ts` |
| Rules from rung 3 | as in rung 3 | `tests/architecture/architecture.test.ts` |
