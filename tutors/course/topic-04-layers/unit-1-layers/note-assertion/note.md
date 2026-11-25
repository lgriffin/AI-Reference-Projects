# Assertion levels in rung 3

Where each rule of the Layers variant is kept on the Assertion Ladder, what the Rung Fence allows, and what
lifting it would mean. Paths are relative to `tutors/variants/rung-3-layers/`.

## The rules, level by level

| Rule | Level | Pattern | Where it is kept |
| --- | --- | --- | --- |
| Every kind has a builder, an order, a card and pages | L5 Prevented | Unrepresentable Mistake | the exhaustive switches and `Record<LoType, number>`, now checked by `pnpm typecheck` inside the gate |
| Only `apps/cli` touches the platform | L5 Prevented, and L4 | Unrepresentable Mistake, Teaching Failure | `"types": []` in each package's `tsconfig.json`; the Port rule in `tests/architecture/architecture.test.ts` |
| Dependencies point inward to `model` | L4 Explained | Teaching Failure | the Layering rule, whose message carries each layer's reason from `LAYERS` |
| A relative import stays inside its package | L4 Explained | Teaching Failure | the Package boundary rule |
| `model` holds types only and imports nothing | L4 Explained | Teaching Failure | the Model rule |
| `package.json` declares exactly what the source imports | L3 Checked | Closure Check | the Closure rule |
| The test double tells the truth | L3 Checked | Honest Double | `apps/cli/tests/file-system-port.contract.test.ts`, run against `NodeFileSystem` and `MemoryFileSystem` |
| Every adapter runs the contract | L4 Explained | Closure Check, Teaching Failure | the Honest Double rule in the architecture test |
| The real wiring agrees with upstream | L3 Checked | Executable Rule | `apps/cli/tests/conformance.test.ts` (`NodeFileSystem` plus `gen`, against the oracle) |
| Escaping, as in rung 2 | L3 and L4 | Executable Rule, Teaching Failure | `packages/lite/tests/` |
| No runtime dependency, no network, no other process, no client-side script | L4 Explained | Teaching Failure | `tests/rung-fence.test.ts` |
| What goes where | L1 Shown and L2 Told | Worked Slice, Short Manifest | the four packages themselves; README's Architecture and Extension points; `AGENTS.md`, "Where things go" |
| `tests/architecture/`, a `tsconfig.json`, the port's methods, a new package: a person decides | Human Boundary | Human Boundary | `AGENTS.md`, "Ask a human first" |
| One command says the work is done | all | Single Gate | `pnpm test`: `tsc` for every package, then every `node --test` suite |

## How the levels stack here

The Port rule is the clearest case of two levels guarding one rule. Put `import { readFileSync } from
"node:fs"` in `packages/gen`, and `pnpm typecheck` fails first (TS2591, L5: no Node types in that package),
then the architecture test fails with the Port rule's message (L4: what to do instead). The compiler stops
the mistake; the test explains it. Either alone would leave a gap: the compiler's message does not say
"use the port", and the test cannot see a `process` reached through a global it does not list.

The layering rules stop at L4 rather than L5 because TypeScript has no notion of "this package may not
import that one". A `package.json` without the dependency makes pnpm refuse to resolve it, which is the
Closure rule's job; the Layering rule says why the dependency should not be added at all.

## What the Rung Fence allows

| Allowed | Refused, and where it arrives |
| --- | --- |
| `@ladder/*` workspace packages, as `workspace:*` | any runtime dependency from npm: Svelte, Vite and markdown-it (rung 4, Reader); vitest, Stryker, Playwright (rung 5, Proven); DOMPurify, better-auth, Supabase (rung 6, Guarded); changesets, semantic-release (rung 7, Shipped) |
| `typescript` and `@types/node` as root dev dependencies | any other dev dependency |
| `node:` built-ins, relative files, `@ladder/*` imports | network access (rung 4); other processes or threads (no rung); client-side script (rung 4) |

The fence's own list of packages (`PACKAGES` in `tests/rung-fence.test.ts`) must grow when a package is
added. That is a fence change, so a person makes it.

## What lifting the fence means

Rungs 4 to 7 each start from a copy of rung 3. Each adds its packages to `LAYERS` in the architecture test
and its dependencies to the fence, and says so in its `RUNG.md`. For rung 4 that means allowing `svelte`,
`@sveltejs/kit` and `vite`, adding an app that may import `@ladder/model` and `@ladder/lite`, and keeping
`gen` and `lite` free of Svelte. The person who climbs writes that change in its own commit, and the
architecture test's new `LAYERS` entry carries the new layer's reason.

## Upstream, for comparison

| Rung 3 | tutors-mono-repo `2b96b69` |
| --- | --- |
| `LAYERS` and the Layering rule | `.dependency-cruiser.cjs` layers, from foundation to apps, and `tests/architecture/dependency-rules.test.ts` |
| Package boundary rule | `no-cross-workspace-relative-import` |
| Port rule | `course-rules-no-file-system`, and `packages/jsr/course-rules/src/ports.ts` |
| Model rule | `packages/jsr/types`, "nothing imported from outside the package (Rule 0130)", and `tutors-types-self-contained` |
| Closure rule | knip (`knip.json`), which reports unused and unlisted dependencies, with an empty baseline `tests/architecture/known-knip.txt`; and `manifest-parity.test.ts`, which keeps each JSR package's `deno.json` and `package.json` in step |
| no old violations allowed | `tests/architecture/known-violations.txt`, a ratchet that may only shrink |
| seeding violations by hand in the lab | negative fixtures in `tests/architecture/fixtures/workspace`, run on every test |
