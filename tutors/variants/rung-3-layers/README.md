# Rung 3: Layers

The same tools as rung 2, a course folder in and a static website out, rebuilt as a pnpm workspace of
layered packages that meet at ports. Nothing new for the user; everything new for the next contributor.

## Run it in three commands

    pnpm install                   # TypeScript and Node's types, the only (dev) dependencies
    pnpm test                      # the Single Gate: tsc for every package, then every node --test suite
    pnpm start ../fixtures/ladder-sample-course out

Open `out/index.html` in a browser. `out/tutors.json` holds the course the pages were made from.

## Architecture

    apps/cli ──► @ladder/gen ──► @ladder/model
        │                            ▲
        └──────► @ladder/lite ───────┘

| Package | Folder | Job | May import |
| --- | --- | --- | --- |
| `@ladder/model` | `packages/model` | The learning-object types. Types only, no run-time code. | nothing |
| `@ladder/gen` | `packages/gen` | Course folder to `Course`, read through `FileSystemPort`. | `@ladder/model` |
| `@ladder/lite` | `packages/lite` | `Course` to pages (`{ path, html }`), as data. | `@ladder/model` |
| `@ladder/cli` | `apps/cli` | The composition root: makes `NodeFileSystem`, calls gen then lite, writes files. | `@ladder/gen`, `@ladder/lite` |

Three rules hold it together, and `tests/architecture/architecture.test.ts` checks each one:

- **Dependency direction.** Arrows point inward to `model`. `gen` and `lite` never see each other, so
  `lite` can render any `tutors.json`, including the one upstream writes.
- **Ports and adapters.** `gen` reads a course only through `FileSystemPort` (`list`, `readText`,
  `exists`). `NodeFileSystem` in `apps/cli` is the real adapter; `MemoryFileSystem` in `gen` is the fast
  one for tests. One contract test runs against both (Honest Double).
- **Platform at the edge.** Only `apps/cli` touches `node:` modules, `process` or the console. Each
  package's `tsconfig.json` has no Node types, so the compiler enforces this too.

## Extension points

| To add | Change | The checks that guide you |
| --- | --- | --- |
| a learning object kind | `packages/model/src/index.ts`, then every `case` tsc asks for in `gen` and `lite`, and `preOrder` | the exhaustive switches and `Record<LoType, number>` (L5) |
| a field in `tutors.json` | the type in `model`, the builder in `gen`, `FIELDS` in `apps/cli/tests/conformance.test.ts` | conformance with the upstream oracle |
| a way to read courses (zip, browser, HTTP) | a class that `implements FileSystemPort`, added to the contract test | the Honest Double rule |
| a way to show courses (a reader app) | a new package that depends on `@ladder/model` only, wired in an app | the layering rules; add the package to `LAYERS` |
| a command | `apps/cli/src/run.ts` | the platform rule keeps `node:` here |

Rungs 4 to 7 start from a copy of this folder. Each adds its packages to `LAYERS` in the architecture test
and its dependencies to the Rung Fence, and says so in its `RUNG.md`.

See `RUNG.md` for what this rung adds and leaves out, and `AGENTS.md` for the working agreement.
