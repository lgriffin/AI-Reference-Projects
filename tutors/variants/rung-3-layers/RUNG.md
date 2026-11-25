# Rung Delta: 3, Layers

## Capability

The rung 2 tools, unchanged in behaviour, as a pnpm workspace: `@ladder/model`, `@ladder/gen`,
`@ladder/lite` and `@ladder/cli`. The generator reads courses through a port, so a course can come from
disk, from memory or, in a later rung, from a browser. The compiler now runs in the Single Gate.

## Expertise needed

Everything from rungs 1 and 2, plus:

- pnpm workspaces: `pnpm-workspace.yaml`, `workspace:*` dependencies, package `exports`.
- Layered Architecture and dependency direction.
- Ports and Adapters (Hexagonal Architecture): an interface owned by the core, implemented at the edge.
- Async file access with `node:fs/promises`.
- `tsc --noEmit` with per-package `tsconfig.json` files.
- Architecture tests that read source text, and contract tests run against two implementations.

## Where this lives upstream

Pinned at tutors-mono-repo `2b96b69`.

| Here | Upstream | What is mirrored |
| --- | --- | --- |
| `pnpm-workspace.yaml` | `pnpm-workspace.yaml` | a workspace of `packages/*` and `apps/*` |
| `packages/model` | `packages/jsr/model/src/types`, `packages/jsr/types` | the learning-object types, shared by every package |
| `packages/gen` | `packages/jsr/gen/src/services/course-builder.ts`, `resource-builder.ts` | course folder to `Course` |
| `packages/gen/src/file-system-port.ts` | `packages/jsr/course-rules/src/ports.ts` (`FileSystemPort`, `joinPath`) | the port; cut down to the reads gen needs |
| `packages/gen/src/memory-file-system.ts` | `packages/jsr/course-rules/src/adapters/memory-fs.ts` (`MemoryFileSystem`) | the in-memory adapter |
| `packages/lite` | `packages/jsr/gen/src/services/course-emitter.ts`, `packages/jsr/gen/src/templates` | `Course` to pages |
| `apps/cli/src/main.ts`, `run.ts` | `packages/jsr/tutors-lite/main.ts`, `packages/jsr/tutors-lite/src/run.ts` | the command and its testable `run` |
| `apps/cli/src/node-file-system.ts` | `packages/jsr/create/src/course-fs.ts` (`diskCourse`) | the real adapter, over the disk |
| `tests/architecture/architecture.test.ts` | `tests/architecture/dependency-rules.test.ts`, `scripts/checks/architecture.ts` | dependency rules with teaching messages |
| `apps/cli/tests/file-system-port.contract.test.ts` | the `course-rules` suite run against `MemoryFileSystem` | one contract, two adapters |

## Deliberately left out

- Everything rung 2 left out (images, a full Markdown library, sanitising, Marp rendering, templates).
- Writing and moving files through the port. Upstream's port has `write` and `move` for `course-rules`
  fixes; gen only reads, so this port only reads (Interface Segregation). `readText` replaces `read`'s bytes.
- Building packages for publication (JSR, npm). Node runs the TypeScript sources directly.
- Linting, formatting and knip. The upstream suite has them; this rung keeps one gate.
- What the rungs above add, each on a copy of the one below: requirements in EARS, Given/When/Then
  scenarios, property and mutation testing (rung 4, Proven); an interactive Svelte reader (rung 5,
  Reader); sanitising, path containment and identity (rung 6, Guarded); versioned, gated releases (rung 7,
  Shipped). Supabase, a DOM sanitiser such as DOMPurify and markdown-it arrive only at the Summit.

## Assertion Ladder

| Rule | Rung | Where |
| --- | --- | --- |
| Every kind has a builder, an order, a card and pages | L5 Unrepresentable Mistake | exhaustive switches, `Record<LoType, number>`, checked by `pnpm typecheck` |
| Only `apps/cli` touches the platform | L5 and L3/L4 | `types: []` in each package's `tsconfig.json`; the Port rule |
| Dependencies point inward | L3/L4 Teaching Failure | Layering and Package boundary rules |
| `model` is types only | L3/L4 Teaching Failure | Model rule |
| `package.json` matches imports | L3 Closure Check | Closure rule |
| The test double tells the truth | L3 Honest Double | `apps/cli/tests/file-system-port.contract.test.ts`, and the rule that every adapter runs it |
| No runtime dependency, network or client script | L3/L4 Teaching Failure | `tests/rung-fence.test.ts` |
| The generator agrees with upstream | L3 Executable Rule | `apps/cli/tests/conformance.test.ts` |
