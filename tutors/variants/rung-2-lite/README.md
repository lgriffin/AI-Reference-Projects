# Rung 2: Lite

A course folder in, a static website out. Rung 1's generator, plus a renderer that turns the course tree
into HTML pages: one for the course, each topic, each talk and note, and each lab step. Still no
dependencies and nothing to install.

## Run it in three commands

    node --version                 # 22.18 or later
    npm test                       # the Single Gate: every test, including the Rung Fence
    node src/main.ts ../fixtures/ladder-sample-course out

Open `out/index.html` in a browser. `out/tutors.json` holds the course the pages were made from.

## How it works

| File | Job |
| --- | --- |
| `src/model.ts` | The learning objects as a discriminated union on `type` (from rung 1). |
| `src/course-builder.ts` | Course folder to `Course` (from rung 1). |
| `src/html.ts` | `escapeHtml`, the `html` tagged template that escapes every value, and the page layout. |
| `src/markdown.ts` | A small Markdown renderer: headings, paragraphs, lists, code fences, links, images, emphasis. |
| `src/site-builder.ts` | `Course` to pages. Two exhaustive switches: how each kind looks as a card, and which pages it gets. |
| `src/main.ts` | The command line: build the course, then write the pages and `tutors.json`. |

The site builder returns pages as data (`{ path, html }`) and only `main.ts` writes files. That split is
what rung 3 turns into separate packages.

See `RUNG.md` for what this rung adds and leaves out, and `AGENTS.md` for the working agreement.
