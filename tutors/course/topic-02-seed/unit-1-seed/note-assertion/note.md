# Assertion levels in rung 1

Where each rule of the Seed variant is kept on the Assertion Ladder, what the Rung Fence allows, and what
lifting it would mean. Paths are relative to `tutors/variants/rung-1-seed/`.

## The rules, level by level

| Rule | Level | Pattern | Where it is kept |
| --- | --- | --- | --- |
| A new kind is built by its own `case` | L5 Prevented | Unrepresentable Mistake | the `switch` in `buildLo` ends in `assertNever(kind)`; a missing case is a type error |
| Every kind has a sort order | L5 Prevented | Unrepresentable Mistake | `preOrder: Record<LoType, number>` in `src/model.ts` |
| A kind that slips past the checker does not write a wrong `tutors.json` | L3 Checked | Executable Rule | `assertNever` throws; `tests/course-builder.test.ts` proves it |
| A folder's kind is its longest prefix | L3 Checked | Executable Rule | "a folder's kind is the longest prefix of its name" in `tests/course-builder.test.ts` |
| The prefix table maps each prefix to the right kind | L3 Checked | Executable Rule | the shape is L5, the mapping is data: the conformance test, and the assignment's grading test for `github` |
| The output agrees with upstream | L3 Checked | Executable Rule | `tests/conformance.test.ts`, against `../fixtures/ladder-sample-course.tutors.json` |
| No dependency, no package import, no network, no other process, no HTML | L4 Explained | Teaching Failure | `tests/rung-fence.test.ts`; each message names the file, what was found and the rung that brings it |
| What a feature looks like here | L1 Shown | Worked Slice | the whole of `src/`, three files to read before you change one |
| Use only erasable syntax; `import type` for types | L2 Told, and L5 in your editor | Short Manifest | `AGENTS.md`, "Verify"; `erasableSyntaxOnly` and `verbatimModuleSyntax` in `tsconfig.json` |
| Keep upstream names and `type` strings | L2 Told | Short Manifest | `AGENTS.md`, "Where things go"; the oracle catches a renamed `type` |
| Only a person changes the fence, the fixture, the oracle or the conformance test | Human Boundary | Human Boundary | `AGENTS.md`, "Ask a human first" |
| One command says the work is done | all | Single Gate | `npm test` |

## Why L5 is only half-armed on this rung

Node runs rung 1 with type stripping: it erases the types and never checks them. L5 fires in your editor,
or when you run `npx tsc -p .` after `npm install --no-save typescript@6 @types/node@22`. The gate itself
does not run the checker until rung 3. That is why `assertNever` also throws: if the compiler is not
asked, the run fails loudly instead of quietly. When rung 3 adds `tsc --noEmit` to the gate, the same
`switch` becomes a gate failure.

## What the Rung Fence allows

| Allowed | Refused, and where it arrives |
| --- | --- |
| `node:fs`, `node:path` and other `node:` built-ins | npm packages (rung 4, Reader); workspace packages (rung 3, Layers) |
| relative imports of `src/` files | any dependency in `package.json`; TypeScript as a dev dependency arrives in rung 3 |
| reading a folder, writing one JSON file | HTML output (rung 2, Lite); network access (rung 4, Reader); other processes or threads (no rung of the generator) |

## What lifting the fence means

Climbing to rung 2 is a person's decision, made on purpose. You would copy the variant, change the
fence's third rule so HTML output is allowed and client-side script is refused instead, and commit that
change on its own. Rung 2's `tests/rung-fence.test.ts` is exactly that change. If an agent proposes to edit
the fence to get a green gate, the answer is no: the work belongs on a later rung.

## Upstream, for comparison

Upstream keeps the same rules lower on the ladder. `Lo.type` is a `string` in
`packages/jsr/model/src/types/learning-objects.ts`, so the `switch` in `buildSimpleLo` has a silent
`default:` (L0), and `preOrder` is a `Map` with a fallback. `packages/jsr/types` already derives `LoType`
from an `as const` list so that switches can be exhaustive (L5), but its README says nothing imports it yet.
