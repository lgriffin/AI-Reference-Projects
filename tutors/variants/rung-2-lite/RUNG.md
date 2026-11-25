# Rung Delta: 2, Lite

## Capability

`node src/main.ts <courseFolder> <outDir>` writes a static website for a course: `index.html`, a page per
topic (with its units and sides shown inside it), a page per talk and note, and a page per lab step, at the
paths upstream `tutors-lite` uses. Web links point out; archives are named.

## Expertise needed

Everything from rung 1, plus:

- HTML and a little CSS.
- Markdown, and how a renderer turns it into HTML line by line.
- Escaping: which characters matter in element content and in attribute values, and why escaping comes
  before any tag is added.
- The Auto-escaping Template: a tagged template literal that escapes by default.
- Exhaustive rendering: a `switch` on `lo.type` that the compiler checks.

## Where this lives upstream

Pinned at tutors-mono-repo `2b96b69`.

| Here | Upstream | What is mirrored |
| --- | --- | --- |
| `src/main.ts` | `packages/jsr/tutors-lite/main.ts`, `packages/jsr/tutors-lite/src/run.ts` | the `tutors-lite` command: parse, then generate a static course |
| `src/site-builder.ts` | `packages/jsr/gen/src/services/course-emitter.ts` | which pages exist and where: `<topic>/<lo>/index.html`, `<lab>/<step>.html` |
| `src/site-builder.ts` `card` | `packages/jsr/gen/src/templates/vento/components/cards/*.vto` | a card per learning object; units and sides as groups of cards |
| `src/html.ts` `page` | `packages/jsr/gen/src/templates/vento/layouts/main.vto` | one layout for every page |
| `src/markdown.ts` | `packages/jsr/model/src/utils/markdown-utils.ts` (`convertMdToHtml`, markdown-it) | Markdown to HTML |
| `src/model.ts`, `src/course-builder.ts` | as in rung 1 | |

## Deliberately left out

- A full Markdown library (tables, math, Mermaid, syntax highlighting, the `::video` directive). It
  arrives in rung 4 (Reader). The small renderer shows anything it does not know as text.
- Sanitising. Every character is escaped, so no tag or attribute can be injected, but a
  `[link](javascript:...)` keeps its URL. Rung 6 (Guarded) closes that.
- Copying images and archives into the site, so Markdown images and archive files are not served.
- Marp rendering. A deck is split into slides on `---` lines and each slide is rendered as Markdown.
- Templates (upstream uses Vento), Tailwind, walls, the table of contents and the breadcrumb trail.

## Assertion Ladder

| Rule | Rung | Where |
| --- | --- | --- |
| Every kind has a card and pages | L5 Unrepresentable Mistake | the two `switch` statements in `src/site-builder.ts` |
| Course text is escaped on every page | L3 Executable Rule | `tests/markdown.test.ts`, `tests/html.test.ts`, `tests/site-builder.test.ts` |
| Only `html.ts` and `markdown.ts` make `SafeHtml` | L3/L4 Teaching Failure | `tests/html.test.ts` |
| No dependency, package import, network or client script | L3/L4 Teaching Failure | `tests/rung-fence.test.ts` |
| The generator agrees with upstream | L3 Executable Rule | `tests/conformance.test.ts` |

As in rung 1, L5 fires in your editor, and `assertNever` throws if a kind is reached at run time. The gate
runs `tsc --noEmit` from rung 3.
