# Dependency direction

Why rung 3 splits the same tools into four packages, which way the arrows between them point, and how each
arrow is kept by a rule whose failure explains itself. Worked from `tutors/variants/rung-3-layers` and from
tutors-mono-repo at `2b96b69`. Paths without a prefix are relative to the rung 3 folder.

## Where we are on the ladder

Rung 3 (Layers) is a copy of rung 2 that changes **structure**, not behaviour. The command still reads a
course folder and writes the same 8 pages and `tutors.json` for the shared fixture. What changes is who the
code is for: rung 2 was written for its first author; rung 3 is written for the next contributor, human or
agent. This week covers the workspace and its direction. Next week covers the edges: the port, the adapters
and the Honest Double.

## From one folder to four packages

Rung 2 kept six files in one `src/` folder. Any file could import any other. That is fine for one person,
and it stops being fine the day a second person, or a coding agent, changes one file without knowing who
depends on it.

A **workspace** is a repository that holds several packages and links them to each other. Rung 3's is two
lines of YAML:

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
  - "apps/*"
```

Each folder under those globs that holds a `package.json` is a package. Rung 3 has four:

| Package | Folder | Job |
| --- | --- | --- |
| `@ladder/model` | `packages/model` | the learning-object types; types only |
| `@ladder/gen` | `packages/gen` | course folder to `Course`, read through `FileSystemPort` |
| `@ladder/lite` | `packages/lite` | `Course` to pages, as data |
| `@ladder/cli` | `apps/cli` | the command: wires an adapter to `gen` and `lite`, writes the files |

A package is a **name** and an **entry point**. Here is `gen`'s whole manifest:

```json
{
  "name": "@ladder/gen",
  "version": "1.0.0",
  "description": "Course folder to Course, read through a FileSystemPort.",
  "type": "module",
  "private": true,
  "exports": { ".": "./src/index.ts" },
  "dependencies": { "@ladder/model": "workspace:*" }
}
```

Three fields do the work.

- **`exports`** is the only way in. Another package writes `import { buildCourse } from "@ladder/gen"`, and
  Node resolves that to `packages/gen/src/index.ts`. Whatever `index.ts` does not export is private to the
  package, and can change without telling anyone.
- **`dependencies`** with `workspace:*` means "the copy in this workspace", never a version from the
  registry. `pnpm install` makes it a symbolic link: `packages/gen/node_modules/@ladder/model` points at
  `../../../model`. There is no build step; Node runs the TypeScript sources directly.
- **`private: true`** says this package is never published. Upstream's JSR packages are published; the
  ladder's are not.

pnpm is strict in a way that matters here. A package sees only what it declares. `lite` declares only
`@ladder/model`, so pnpm links nothing else into `packages/lite/node_modules`. If `lite` imports
`@ladder/gen`, the compiler cannot even find it:

```
packages/lite/src/site-builder.ts(9,31): error TS2307: Cannot find module '@ladder/gen' or its corresponding type declarations.
```

That error is not a design rule. It is a consequence of the manifest. The design rule comes next.

## The public surface

`packages/gen/src/index.ts` is the whole surface of the generator:

```ts
/** @ladder/gen: a course folder, read through a FileSystemPort, becomes a Course. */
export { buildCourse, buildLo, assertNever, parseMarkdown, stripFrontMatter } from "./course-builder.ts";
export type { BuildOptions } from "./course-builder.ts";
export { joinPath } from "./file-system-port.ts";
export type { DirEntry, FileSystemPort } from "./file-system-port.ts";
export { folderKind, folderKinds, preOrder } from "./lo-kinds.ts";
export { MemoryFileSystem } from "./memory-file-system.ts";
```

`readFolder`, `children` and `buildLab` live in `course-builder.ts` and are not exported. The owner of `gen`
may rename them tomorrow. A relative import such as `../../gen/src/course-builder.ts` would skip this
surface and make a private function public by accident. That is why one of the four rules below exists.

## Which way the arrows point

```
            apps/cli   (the composition root)
            /      \
           v        v
   @ladder/gen    @ladder/lite
           \        /
            v      v
         @ladder/model   (types only, imports nothing)
```

Every arrow points **inward**, towards the most stable package. The rule of thumb is old and simple: depend
in the direction of stability. `model` is the vocabulary everybody shares, so it changes least and depends on
nothing. `gen` and `lite` each depend on `model` and never on each other. `cli` sits at the edge and depends
on everything, because its job is to wire the rest together.

Each "never" buys something.

- **`lite` never imports `gen`.** So `lite` can render any `tutors.json`: one that upstream's generator
  wrote, one a test built by hand, or one a browser fetched. The shared fixture's oracle,
  `variants/fixtures/ladder-sample-course.tutors.json`, was written by upstream's `tutors build`, and `lite`'s
  tests render it directly. A dependency you do not take is a choice you keep open.
- **`model` never imports anything.** So any layer can depend on it without pulling in code. That is also
  why `preOrder` and `folderKinds`, which were in rung 2's types file, moved to `gen`: only the generator needs
  them. You can see the move by comparing `../rung-2-lite/src/` with `packages/model/src/index.ts`.
- **`gen` never imports `lite`.** So the generator knows nothing of HTML. A reader app (rung 5) can use the
  generator's output without the static site.

Look at `packages/lite/src/site-builder.ts`: it has its **own** `assertNever` at the bottom. In rung 2 it
imported the shared one. Importing it from `gen` now would break the direction for the sake of four lines.
Duplicating a tiny pure function is cheaper than coupling two packages.

## From diagram to rule

The README draws the diagram. A diagram is **L2, Told**, on the Assertion Ladder: a coding agent may read it,
forget it, or decide that "just this once" `lite` can borrow a helper. So rung 3 keeps each arrow as a test,
`tests/architecture/architecture.test.ts`, which climbs to **L3, Checked**, and puts the reason in the
failure, **L4, Explained**.

The test reads one table:

```ts
/** Each layer, where it lives, the only workspace packages it may import, and why. */
const LAYERS: Record<string, { dir: string; may: string[]; job: string }> = {
  "@ladder/model": { dir: "packages/model", may: [], job: "model is the shared vocabulary of types; it depends on nothing, so every layer can depend on it" },
  "@ladder/gen": { dir: "packages/gen", may: ["@ladder/model"], job: "gen turns a course folder into a Course; it knows nothing of HTML or the command line" },
  "@ladder/lite": { dir: "packages/lite", may: ["@ladder/model"], job: "lite turns a Course into HTML; it never reads a course folder, so it can render any tutors.json" },
  "@ladder/cli": { dir: "apps/cli", may: ["@ladder/model", "@ladder/gen", "@ladder/lite"], job: "cli is the composition root that wires adapters to packages" },
};
```

It strips comments from every `.ts` file under each layer's `src/`, so a comment may name what the code must
not do, and pulls out import specifiers with one regular expression. No parser and no dependency. Four rules
are about direction:

| Rule | What it checks | Its message begins |
| --- | --- | --- |
| Layering | every `@ladder/*` import is in the layer's `may` list | "Layering rule: @ladder/lite may import only [@ladder/model], because ..." |
| Package boundary | a relative import never leaves the package's own `src/` | "Package boundary rule: a relative import may not leave packages/lite/src. ..." |
| Model | `model` holds only `export type` and `export interface`, and imports nothing | "Model rule: packages/model holds only ..." |
| Closure | each `package.json` declares exactly the `@ladder/*` packages its source imports | "Closure rule: a package's dependencies are exactly what its source imports. ..." |

## Worked example: a borrowed helper

An agent working on `lite` wants a title parser and finds `parseMarkdown` in `gen`. It adds
`import { parseMarkdown } from "@ladder/gen";` to `packages/lite/src/site-builder.ts`. The architecture test
says:

```
not ok 10 - packages/lite/src/site-builder.ts
    Layering rule: @ladder/lite may import only [@ladder/model], because lite turns a Course into HTML; it
    never reads a course folder, so it can render any tutors.json. Move the code to a layer that may make
    this import, or take what you need as an argument; apps/cli wires the layers together (README.md,
    Architecture).
      packages/lite/src/site-builder.ts imports @ladder/gen
not ok 15 - each package.json declares exactly the workspace packages its source imports
    Closure rule: a package's dependencies are exactly what its source imports. Add the missing dependency
    as "workspace:*", or remove the unused one, then run pnpm install.
      packages/lite/package.json declares [@ladder/model] but its src imports [@ladder/gen, @ladder/model]
# pass 37
# fail 2
```

Two rules fail, and they offer different fixes. The Closure rule says "add the missing dependency". Taking
it would turn Closure green and leave Layering red, and an agent chasing green might then edit `LAYERS`. The
Layering rule names a **reason**, so it wins: `lite` does not need `parseMarkdown`, because the `Course` it
receives already holds every title. Delete the import.

This is the habit the week builds. **Read the failure for its reason, not its quickest fix.**

## Worked example: a shortcut by path

Change the import to a path: `import type { FileSystemPort } from "../../gen/src/file-system-port.ts";`.
The Layering rule is now silent, because it reads only `@ladder/` names. The Package boundary rule is not:

```
Package boundary rule: a relative import may not leave packages/lite/src. Import another package by its
name (@ladder/...) through its index.ts, and only if the layering rule allows it.
  packages/lite/src/site-builder.ts imports "../../gen/src/file-system-port.ts"
```

Two rules cover one intent from two sides. Upstream has the same pair: the `layer-*` rules and
`no-cross-workspace-relative-import` in `.dependency-cruiser.cjs`.

## Worked example: a cycle

Make `model` import a type from `gen`: `import type { FileSystemPort } from "@ladder/gen";` at the top of
`packages/model/src/index.ts`. Three rules fail at once: Layering ("@ladder/model may import only [],
because model is the shared vocabulary of types ..."), Model, and Closure. Since `gen` already imports
`model`, this is a cycle, and in a cycle neither package can change, test or release alone. Upstream's
`no-cross-package-cycle` rule says why in one line: "A cycle that leaves a workspace and comes back makes
the layering meaningless; invert one edge through a seam."

## Upstream's layers

tutors-mono-repo keeps the same idea at a larger scale. Its `pnpm-workspace.yaml` lists `packages/jsr/*`,
`packages/svelte/*`, `packages/svelte/utils/*` and `apps/*`. Its `ARCHITECTURE.md` draws three layers
(Applications, Svelte packages, JSR packages) and states the rule as "Lower layers never depend on higher
layers. `pnpm test:runway` fails on any new upward import". `.dependency-cruiser.cjs` refines that into seven
named layers, from `foundation` (every `packages/jsr/*` package) up to `apps`, and builds one rule per
layer from a list, exactly as rung 3 builds its checks from `LAYERS`:

```js
const layerRules = LAYERS.slice(0, -1).map((layer, index) => ({
  name: `layer-${layer.name}`,
  from: { path: anyOf(layer.paths) },
  to: { path: anyOf(LAYERS.slice(index + 1).flatMap((l) => l.paths)) }
}));
```

Upstream also has a second workspace. `deno.json` has a `"workspace"` list of the eleven `packages/jsr/*`
packages, which are published to jsr.io and run on Deno and Node. Rung 3 needs only one workspace, so it
uses pnpm, as the Svelte side of upstream does.

`packages/jsr/types` is upstream's `model`. Its `README.md` says: "No runtime dependencies, and nothing
imported from outside the package (Rule 0130)", and `.dependency-cruiser.cjs` keeps it with
`tutors-types-self-contained`. Rung 3 is stricter: upstream's `types` exports constants such as `LO_TYPES`;
rung 3's Model rule allows types only.

Two differences are worth naming. Upstream proves each rule **can** fail with negative fixtures, a tiny fake
workspace in `tests/architecture/fixtures/workspace` that breaks every rule on purpose. Rung 3 does this by
hand, in the lab. And upstream adopted its rules on an old codebase, so it keeps a ratchet,
`tests/architecture/known-violations.txt`, a list of old violations that "may only shrink". Rung 3 started
clean and allows none. You will meet both in week 5.

## Lean: coupling is built-in handoff waste

Lean names the wastes of software work: partially done work, extra features, relearning, handoffs, delays,
task switching and defects. A wrong arrow between packages builds several of them into the code.

- **Handoffs.** If `lite` imported `gen`, every change to `gen` would become a handoff to whoever owns
  `lite`. They must read the change, re-test their pages and perhaps wait for a fix. The Layering rule keeps
  `gen`'s changes inside `gen`.
- **Delays and waiting.** In a cycle, `model` and `gen` can only change together. Work on one waits for
  work on the other.
- **Relearning.** A relative import into another package's `src/` turns a private helper into a hidden
  public one. The next person to change it relearns, the hard way, that a stranger depended on it. The
  Package boundary rule removes this.
- **Extra features.** A function in `model` is code that every layer now carries. The Model rule keeps the
  most shared package the smallest.

The teaching failure removes one more waste: **relearning why**. The `job` sentence in `LAYERS` arrives with
every failure, so nobody has to find the person who drew the diagram.

## Which Assertion Ladder levels guard this week's rules

| Rule | Level | Where it is kept |
| --- | --- | --- |
| Dependencies point inward to `model` | L4 Explained | the Layering rule, whose message carries each layer's `job` |
| A relative import stays inside its package | L4 Explained | the Package boundary rule |
| `model` holds types only and imports nothing | L4 Explained | the Model rule |
| `package.json` declares exactly what the source imports | L3 Checked | the Closure rule (it says what, not why) |
| A package sees only what it declares | L5 Prevented, partly | pnpm's strict linking, then `tsc` (TS2307) in the gate |
| Every kind has a builder and pages | L5 Prevented | exhaustive switches, now checked by `pnpm typecheck` inside the gate |
| What goes where | L1 Shown, L2 Told | the four packages themselves; README "Architecture"; `AGENTS.md` "Where things go" |
| Changing `LAYERS` or adding a package | Human Boundary | `AGENTS.md`, "Ask a human first" |

Why does Layering stop at L4 and not reach L5? TypeScript has no notion of "this package may not import that
one". pnpm's linking stops an **undeclared** import, but a declared one would compile. Only the test knows the
intent.

## Self-check

1. **(Remember)** Which three fields of `packages/gen/package.json` make it a workspace package, and what does
   each do?
2. **(Understand)** Explain why `lite` can render upstream's `tutors.json` without any generator, and which
   arrow in the diagram makes that true.
3. **(Understand)** Why does `packages/lite/src/site-builder.ts` carry its own `assertNever`?
4. **(Apply)** Predict which rules fail if `apps/cli/src/run.ts` imports `@ladder/model` without declaring it.
   Then check your prediction against `LAYERS` and the Closure rule.
5. **(Analyse)** The Layering rule and the Closure rule both fail on the borrowed helper. Explain why following
   the Closure rule's fix would make things worse.
6. **(Analyse)** Name one Lean waste a cycle between `model` and `gen` would create, and describe how it would
   show up in a team's week.
7. **(Evaluate)** Rung 3's Model rule forbids constants that upstream's `types` package allows. Argue for or
   against the stricter rule in three sentences.
