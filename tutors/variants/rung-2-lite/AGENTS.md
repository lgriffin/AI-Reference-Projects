# AGENTS.md

Rung 2 (Lite) of the Tutors ladder: a course folder in, a static website out. TypeScript on Node 22.18 or
later, run directly with type stripping. This file is the working agreement for every contributor, human
or AI. Anything a test can check lives in `tests/`, not here.

## Verify

    npm test

The Single Gate. Work is finished when it passes. If the Rung Fence, an escaping test or the conformance
test fails, change the code, not the test.

Only erasable syntax: no `enum`, no `namespace`, no constructor parameter properties. Imports carry the
`.ts` extension and types use `import type`.

## Where things go

| You are adding | It belongs in |
| --- | --- |
| a learning object kind or field | `src/model.ts`, then each `case` the compiler asks for |
| how a folder or file is read | `src/course-builder.ts` |
| how a kind looks, or which pages it gets | `src/site-builder.ts` (`card`, `pagesFor`) |
| Markdown syntax | `src/markdown.ts`, with a test in `tests/markdown.test.ts` |
| layout or style shared by every page | `src/html.ts` (`page`) |
| writing files, command line options | `src/main.ts` |

## Escaping

Build HTML only with the `html` tagged template; it escapes every value. Never build HTML by string
concatenation, and never pass course text to `new SafeHtml(...)`. Every new piece of course text on a page
gets a case in the escaping test of `tests/site-builder.test.ts`.

## Rung Fence

This rung uses Node and nothing else. `tests/rung-fence.test.ts` fails, naming the file and the rung that
introduces the capability, if:

- `package.json` gains any dependency (a Markdown library arrives in rung 4);
- `src/` imports anything but `node:` built-ins and relative files;
- `src/` uses the network, starts another process, or writes client-side script.

A failure means the work belongs to a later rung. Say so, and stop. Do not edit the fence to go green.

## Ask a human first

- Adding any dependency, or changing `tests/rung-fence.test.ts`.
- Weakening an escaping test, or adding a file that makes `SafeHtml`.
- Changing the shared fixture or its oracle in `../fixtures/`, or `tests/conformance.test.ts`.
- Changing this file.
