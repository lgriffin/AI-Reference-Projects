# AGENTS.md

Rung 1 (Seed) of the Tutors ladder: a course folder in, `tutors.json` out. TypeScript on Node 22.18 or
later, run directly with type stripping. This file is the working agreement for every contributor, human
or AI. Anything a test can check lives in `tests/`, not here.

## Verify

    npm test

The Single Gate. Work is finished when it passes. If the Rung Fence or the conformance test fails, change
the code, not the test.

Only erasable syntax: no `enum`, no `namespace`, no constructor parameter properties. Imports carry the
`.ts` extension and types use `import type`.

## Where things go

| You are adding | It belongs in |
| --- | --- |
| a learning object kind or field | `src/model.ts`, then the `case` the compiler asks for in `src/course-builder.ts` |
| how a folder or file is read | `src/course-builder.ts` |
| a command line option | `src/main.ts` |
| a test | `tests/`, named `*.test.ts` |

Keep upstream names: `Course`, `Topic`, `Unit`, `Side`, `Talk`, `Lab`, `LabStep`, `Note`, `Web`, `Archive`,
and their `type` strings. A new field must match what upstream writes for the shared fixture; add it to
`FIELDS` in `tests/conformance.test.ts` so the oracle checks it.

## Rung Fence

This rung uses Node and nothing else. `tests/rung-fence.test.ts` fails, naming the file and the rung that
introduces the capability, if:

- `package.json` gains any dependency;
- `src/` imports anything but `node:` built-ins and relative files;
- `src/` uses the network, starts another process, or writes HTML.

A failure means the work belongs to a later rung. Say so, and stop. Do not edit the fence to go green.

## Ask a human first

- Adding any dependency, or changing `tests/rung-fence.test.ts`.
- Changing the shared fixture or its oracle in `../fixtures/`.
- Changing `tests/conformance.test.ts` or this file.
- Changing the shape of `tutors.json` away from upstream.
