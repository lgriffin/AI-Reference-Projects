# AGENTS.md

Rung 3 (Layers) of the Tutors ladder: a course folder in, a static website out, as a layered pnpm
workspace. TypeScript on Node 22.18 or later, run directly with type stripping. This file is the working
agreement for every contributor, human or AI. Anything a test can check lives in the tests, not here.

## Verify

    pnpm test

The Single Gate: `tsc` for every package, then every `node --test` suite. Work is finished when it passes.
If an architecture rule, the Rung Fence or the conformance test fails, change the code, not the test.

Only erasable syntax: no `enum`, no `namespace`, no constructor parameter properties. Relative imports
carry the `.ts` extension, types use `import type`, and packages are imported by name (`@ladder/gen`).

## Where things go

| You are adding | It belongs in |
| --- | --- |
| a learning object kind or field | `packages/model`, then each `case` tsc asks for |
| reading a course folder | `packages/gen`, through `FileSystemPort` only |
| a new source of files | a `FileSystemPort` adapter, added to the contract test |
| Markdown, HTML, page layout | `packages/lite` |
| `node:` modules, `process`, writing files | `apps/cli` |
| a test | `<package>/tests/*.test.ts`; rules about the whole workspace in `tests/` |

The layering, the port rule and the README's Architecture section say the same thing; the tests decide.

## Escaping

Build HTML only with the `html` tagged template in `packages/lite/src/html.ts`. Never pass course text
to `new SafeHtml(...)`. Every new piece of course text on a page gets a case in the escaping test.

## Rung Fence

This rung has no runtime dependencies. `tests/rung-fence.test.ts` fails, naming the file and the rung
that introduces the capability, if:

- any `package.json` declares a dependency other than `@ladder/*` (`workspace:*`), or the root adds a
  dev dependency other than `typescript` and `@types/node`;
- source imports anything but `node:` built-ins, relative files and `@ladder/*`;
- source uses the network, starts another process, or writes client-side script.

A failure means the work belongs to a later rung. Say so, and stop. Do not edit the fence to go green.

## Ask a human first

- Adding or upgrading any dependency, or changing `tests/rung-fence.test.ts`.
- Changing `tests/architecture/`, a package's `tsconfig.json`, or the port's methods.
- Changing the shared fixture or its oracle in `../fixtures/`, or the conformance test.
- Adding a package or app, or changing this file.
