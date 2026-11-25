# Ports, adapters and honest doubles

How rung 3 keeps the platform at the edge: a port owned by the core, two adapters that implement it, a
composition root that wires them, and one contract that keeps the fast test double telling the truth. Then
the architecture tests that make all of this unavoidable, and how to use a red one with Five Whys. Worked
from `tutors/variants/rung-3-layers` and tutors-mono-repo at `2b96b69`.

## Where we are on the ladder

This is the second and last week of rung 3 (Layers). Week 4 set the direction of the arrows between
packages. This week is about the **edges**: the places where the code meets the file system, the console and
the network. At the end of the week you take rung 3's assignment and meet its exit criteria. Rung 4 (Proven)
then keeps this structure and makes the tests the specification.

## The problem a port solves

In rungs 1 and 2 the generator called `readdirSync` and `readFileSync` directly. That had three costs.

- It could read a course only from a local disk.
- Every test had to write files into a temporary folder, which is slow and leaves litter when it fails.
- The generator's rules could not run anywhere without `node:fs`: not in a browser, not in a desktop app.

Upstream has the same need three times over. The **CLI** reads courses from disk, **Tutors Studio** reads
them through Tauri, and the **reader's wizard** checks generated files in the browser. All three want to run
one set of course rules.

Hexagonal Architecture, also called **Ports and Adapters** (Alistair Cockburn), answers it. The core of the
program declares a **port**: an interface, in the core's own terms, for something it needs from outside.
Each shell around the core supplies an **adapter** that implements the port with whatever that shell has.
The core never names the platform. The platform never reaches into the core.

## The port

```ts
// packages/gen/src/file-system-port.ts
export interface DirEntry {
  name: string;
  kind: "file" | "dir";
}

export interface FileSystemPort {
  /** The entries directly inside `dir`, in any order. Paths are "/"-separated and relative to the course root ("" is the root). */
  list(dir: string): Promise<DirEntry[]>;
  /** The whole file as UTF-8 text. Rejects when there is no such file. */
  readText(path: string): Promise<string>;
  /** True for a file or a folder, and for the root "". */
  exists(path: string): Promise<boolean>;
}
```

Four design choices are worth naming.

1. **The port belongs to `gen`**, the package that uses it, not to `apps/cli`, which implements it. This is
   the Dependency Inversion Principle: the high-level policy (how a folder becomes a course) owns the
   abstraction; the low-level detail (how bytes come off a disk) depends on it.
2. **Its paths are course paths**, not disk paths: `/`-separated and relative to the course root, with `""`
   as the root. `gen` never sees `C:\Users\...` or `/home/...`.
3. **It is `async`.** A browser or Tauri cannot read synchronously, so a synchronous port would rule them out
   for ever.
4. **It has only the reads `gen` needs.** Upstream's port, in `packages/jsr/course-rules/src/ports.ts`, has
   five methods: `list`, `read` (bytes), `write`, `move` and `exists`. `write` and `move` serve
   `tutors validate --fix`. Rung 3's generator never writes, so its port leaves them out (**Interface
   Segregation**) and offers `readText` instead of `read`'s bytes. Same names, same path convention.

Two things `gen` cannot know arrive as arguments rather than through the port: the course's `id` (a folder
name that the port does not expose), and where warnings go (`BuildOptions.warn`, instead of
`process.stderr`).

## Two adapters

**The memory adapter** lives in `gen` itself, because it needs nothing from the platform:

```ts
// packages/gen/src/memory-file-system.ts
export class MemoryFileSystem implements FileSystemPort {
  private readonly files = new Map<string, string>();

  constructor(files: Record<string, string> = {}) {
    for (const [path, text] of Object.entries(files)) this.files.set(normalise(path), text);
  }
  ...
  exists(path: string): Promise<boolean> {
    const target = normalise(path);
    if (target === "") return Promise.resolve(true);
    return Promise.resolve(this.files.has(target) || [...this.files.keys()].some((key) => key.startsWith(`${target}/`)));
  }
}
```

A whole course is one object literal: `new MemoryFileSystem({ "course.md": "# C\n", "topic-1/topic.md": "# T\n" })`.
Folders exist as prefixes of file paths. Upstream's twin is `packages/jsr/course-rules/src/adapters/memory-fs.ts`,
whose header says the test suite runs the whole rule catalogue against it.

**The disk adapter** lives in `apps/cli`, the only package with Node's types:

```ts
// apps/cli/src/node-file-system.ts
export class NodeFileSystem implements FileSystemPort {
  private readonly root: string;
  constructor(root: string) { this.root = resolve(root); }

  async list(dir: string): Promise<DirEntry[]> {
    const entries = await readdir(join(this.root, dir), { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() || entry.isDirectory())
      .map((entry) => ({ name: entry.name, kind: entry.isDirectory() ? "dir" : "file" }));
  }
  readText(path: string): Promise<string> { return readFile(join(this.root, path), "utf8"); }
  async exists(path: string): Promise<boolean> { return stat(join(this.root, path)).then(() => true, () => false); }
}
```

Notice `constructor(root: string)` with an explicit field. Rung 3 runs on Node's type stripping, which allows
only erasable syntax, so constructor parameter properties are out. Upstream's disk adapter is the function
`diskCourse` in `packages/jsr/create/src/course-fs.ts`.

## The composition root

Somewhere, one piece of code must know every other piece. That is the **composition root**, and in rung 3
it is `apps/cli/src/run.ts`:

```ts
export async function run(args: string[]): Promise<number> {
  const [courseArg, outArg] = args;
  ...
  const fs = new NodeFileSystem(courseFolder);                                         // choose the adapter
  const course = await buildCourse(fs, basename(courseFolder), {                       // hand it to the core
    warn: (message) => process.stderr.write(`${message}\n`),
  });
  const pages = buildSite(course);                                                     // hand the result to lite
  for (const { path, html } of pages) { await mkdir(...); await writeFile(join(outDir, path), html); }
  ...
  return 0;
}
```

`main.ts` is two lines: `process.exitCode = await run(process.argv.slice(2));`. Because `run` returns an exit
code rather than calling `process.exit`, `apps/cli/tests/cli.test.ts` can call it like any function. Upstream
does the same in `packages/jsr/tutors-lite/src/run.ts`, and goes one step further: `runTutorsLite` takes a
`LiteGenerator` argument, "injectable so a test can stand in for any one of them". That is a seam at a
different place, chosen because a test needed to stand in there. Choose the seam where the test needs it.

## The risk every test double carries

`gen`'s fast tests all use `MemoryFileSystem`. What if it lies? Suppose it:

- lists a folder's grandchildren, where `readdir` lists only children;
- says `exists("")` is false, where the disk says the root exists;
- resolves `"topic-1/"` with a trailing slash, where the disk does not, or the other way round.

Then `gen` passes every test and fails on a real disk. A double that drifts from the real thing makes every
test that uses it a little less true, and nobody notices, because the tests are green.

## The Honest Double

The pattern is simple: **one contract, run against every adapter**, the real one included.

```ts
// apps/cli/tests/file-system-port.contract.test.ts
const ADAPTERS: [name: string, make: (files: Record<string, string>) => FileSystemPort][] = [
  ["NodeFileSystem", nodeFileSystem],               // writes the files into a temporary folder
  ["MemoryFileSystem", (files) => new MemoryFileSystem(files)],
];

for (const [name, make] of ADAPTERS) {
  describe(`FileSystemPort contract: ${name}`, () => {
    test("list gives the files and folders directly inside a folder", async () => { ... });
    test("readText gives the whole file as UTF-8, and rejects a missing file", async () => { ... });
    test("exists is true for the root, a folder and a file, and false otherwise", async () => { ... });
  });
}
```

If the double drifts, the same assertion that passes for one adapter fails for the other. Make the double
lie about the root, by changing `if (target === "") return Promise.resolve(true);` to `false`:

```
# Subtest: FileSystemPort contract: NodeFileSystem
# Subtest: FileSystemPort contract: MemoryFileSystem
    not ok 3 - exists is true for the root, a folder and a file, and false otherwise
      expected: true
      actual: false
# pass 5
# fail 1
```

The contract lives in `apps/cli/tests`, not in `gen`, because only `apps/cli` can construct `NodeFileSystem`.
Upstream keeps its double honest a different way: `tests/unit/course-rules/gen-conformance.test.ts` runs the
rules on `MemoryFileSystem` and the generator on the same files on disk, and requires the two to agree ("The
validator's truth source is the generator").

## Making the contract unavoidable

A new adapter could simply skip the contract. So the architecture test has an **Honest Double rule**: the set
of classes that `implements FileSystemPort` must equal the set the contract runs. Start a `ZipFileSystem` in
`packages/gen/src/zip-file-system.ts` and run `pnpm test`:

```
not ok 40 - every FileSystemPort adapter runs the port contract
    Honest Double rule: every FileSystemPort adapter runs the same contract, so a test double cannot drift from the real thing. Add the adapter to ADAPTERS in apps/cli/tests/file-system-port.contract.test.ts.
      ZipFileSystem (packages/gen/src/zip-file-system.ts)
```

Add it to `ADAPTERS` and the contract itself fails three times for `ZipFileSystem`. That is the right state
for an adapter that is not written yet: **the contract is its to-do list**.

## The Port rule and its second wall

The last architecture rule keeps the platform out of every layer but the composition root:

```ts
const PLATFORM = /from "node:[^"]+"|\bprocess\.|\bconsole\.|\bfetch\(|\brequire\(|\bDeno\./;
```

Add `import { readFileSync } from "node:fs";` to `packages/gen/src/course-builder.ts`, and two walls answer.
The compiler goes first, because `packages/gen/tsconfig.json` has `"types": []`:

```
packages/gen/src/course-builder.ts(6,30): error TS2591: Cannot find name 'node:fs'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.
```

Its advice is generic and, here, wrong: adding `node` to that `tsconfig.json` would tear the wall down. That
file is behind "Ask a human first" in `AGENTS.md` for exactly this reason. The architecture test explains
instead:

```
Port rule: only apps/cli touches node: modules, process, the console or the network. gen receives the world through ports: gen reads files through FileSystemPort (its `fs` argument) and reports through BuildOptions.warn; lite returns pages as data for apps/cli to write. The package's tsconfig.json has no Node types, so tsc rejects this too.
  packages/gen/src/course-builder.ts uses from "node:fs"
```

The compiler **prevents** (L5); the test **explains** (L4). Each covers the other's blind spot.

## Upstream does it at scale

| Rung 3 | tutors-mono-repo `2b96b69` |
| --- | --- |
| `FileSystemPort` in `gen` | `FileSystemPort` in `packages/jsr/course-rules/src/ports.ts` |
| `MemoryFileSystem` | `packages/jsr/course-rules/src/adapters/memory-fs.ts` |
| `NodeFileSystem` | `diskCourse` in `packages/jsr/create/src/course-fs.ts`; Tauri commands in Studio |
| the Port rule | `course-rules-no-file-system` in `.dependency-cruiser.cjs`: "The course validator reads a course only through its FileSystemPort, so the CLI, Studio and the reader's browser wizard run the same rules." |
| breaking each rule by hand in the lab | negative fixtures in `tests/architecture/fixtures/workspace`, run on every test |
| no old violations | `tests/architecture/known-violations.txt`, a ratchet that may only shrink |

You can check upstream's Port rule holds: `grep -rn '"node:' $MONO/packages/jsr/course-rules/src` prints
nothing.

## Lean: Five Whys on a red build

A red build is the cheapest moment to learn something. Five Whys, from Toyota's production system, asks
"why?" until the answer is something in the **process** you can change, not someone to blame.

Take the red build above, `not ok 40`, the Honest Double rule failing for `ZipFileSystem`.

1. Why is the build red? `ZipFileSystem` implements the port but is not in `ADAPTERS`.
2. Why is it not there? Its author did not know the contract existed.
3. Why not? `AGENTS.md` says it ("a new source of files: a `FileSystemPort` adapter, added to the contract
   test"), but the author started from the port's file, as most people would.
4. Why does the port's file not say so? Its header names `NodeFileSystem` and `MemoryFileSystem` but not the
   contract that binds them.
5. Why does that matter? The rule is **told** (L2) in `AGENTS.md` and **checked** (L3) in the architecture
   test, but the place people **look** says neither.

The countermeasure is one sentence in the header of `file-system-port.ts`. The red build did its job: it
found a gap in the standard work, and now the gap can close.

Notice what the teaching failure already did. Without the message's last sentence ("Add the adapter to
ADAPTERS in ..."), the author would have needed a person to explain. That is the waste of **relearning**,
removed by an L4 message. And the Port rule removes a **handoff**: with `node:fs` inside `gen`, every shell
that is not Node (a browser, Studio) would need its own copy of the generator.

## Which Assertion Ladder levels guard this week's rules

| Rule | Level | Pattern | Where it is kept |
| --- | --- | --- | --- |
| Only `apps/cli` touches the platform | L5 and L4 | Unrepresentable Mistake, Teaching Failure | `"types": []` in each package's `tsconfig.json`; the Port rule |
| The test double tells the truth | L3 Checked | Honest Double | `apps/cli/tests/file-system-port.contract.test.ts` |
| Every adapter runs the contract | L4 Explained | Closure Check, Teaching Failure | the Honest Double rule |
| The real wiring agrees with upstream | L3 Checked | Executable Rule | `apps/cli/tests/conformance.test.ts` |
| No runtime dependency, no network, no client script | L4 Explained | Teaching Failure | `tests/rung-fence.test.ts` |
| The port's methods, `tsconfig.json`, `tests/architecture/` | Human Boundary | Human Boundary | `AGENTS.md`, "Ask a human first" |
| One command says the work is done | all | Single Gate | `pnpm test` |

## Self-check

1. **(Remember)** Name the three methods of rung 3's `FileSystemPort`, and the two that upstream's port adds.
2. **(Understand)** Why does the port live in `gen` and not in `apps/cli`? Name the principle.
3. **(Understand)** Why is the port `async` when `MemoryFileSystem` could answer synchronously?
4. **(Apply)** Write the object literal for a `MemoryFileSystem` holding a course with one topic and one note.
5. **(Analyse)** `console.log` in `gen` fails `tsc` and the Port rule. `fetch(...)` fails the Port rule and the
   Rung Fence. Explain why each pair of walls catches what it does.
6. **(Analyse)** Upstream keeps its double honest with `gen-conformance.test.ts`, rung 3 with a contract run
   against both adapters. Compare what each would catch.
7. **(Evaluate)** A colleague proposes adding `node` to `packages/gen/tsconfig.json` "because the compiler
   asked for it". Judge the proposal, and say who should decide.
8. **(Evaluate)** Run your own Five Whys on a red build from this week. Did it end at a person or at a
   process? If at a person, ask one more why.
