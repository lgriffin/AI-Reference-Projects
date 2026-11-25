# Making mistakes unrepresentable

How rung 1 turns "every kind has a case" from a hope into a compile error, where that stops working, and how
an oracle covers what types cannot. Paths are relative to `tutors/variants/rung-1-seed/` unless they name
upstream (tutors-mono-repo at `2b96b69`).

## The problem: one kind, many places

A learning-object kind is not handled in one place. In rung 1 a kind needs a builder (the `switch` in
`buildLo`) and a sort order (`preOrder`). Rung 2 adds a card and a set of pages. Rung 5 adds a component in
the reader. Upstream, a kind also has an icon, a wall, validator rules and a place in the schema.

Add a kind and forget one of those places, and the course is quietly wrong. Nobody is told. A link has no
card; a talk sorts last; a page is never written. The bug shows up weeks later, as a confused student.

The Assertion Ladder asks where this rule should live. At L2 it is a line in `AGENTS.md` ("a new kind needs a
case everywhere"), which an agent may forget. At L3 it is a test per place, which you must remember to write.
At L5 the mistake cannot be written at all: the program does not type-check. For this rule, TypeScript can
reach L5 cheaply. This note shows how.

## Upstream keeps the rule at L0

Upstream types every learning object with one shape, in `packages/jsr/model/src/types/learning-objects.ts`:

~~~ts
export type Lo = {
  type: string;
  id: string;
  title: string;
  ...
};
~~~

`type` is any `string`. So the builder in `packages/jsr/gen/src/services/course-builder.ts` can only guess:

~~~ts
function buildSimpleLo(lo: Lo, lr: LearningResource): Lo {
  switch (lo.type) {
    case "lab": ...
    case "github": ...
    default:
  }
~~~

A new kind falls into `default:` and nothing happens. The sort order is a `Map<string, number>` in
`packages/jsr/model/src/types/type-utils.ts`, and the comparison reads it with a fallback, so a missing kind
quietly sorts last. Both are L0: the rule is implied by the code and kept by nobody. This is not carelessness.
`Lo` grew over years, and making `type` a union touches every package that reads it. Upstream has started:
`packages/jsr/types/src/learning-objects.ts` derives its kinds from an `as const` list,

~~~ts
export const LO_TYPES = [...LO_SIMPLE_TYPES, ...LO_COMPOSITE_TYPES] as const;
/** A learning-object kind, such as "lab" or "topic". Model-lib's `Lo.type` is still `string`. */
export type LoType = (typeof LO_TYPES)[number];
~~~

and the comment admits the rest of the move is still to come.

## Step 1: a discriminated union

Rung 1 gives each kind its own type, with a **literal** `type` field (`src/model.ts`):

~~~ts
type LoBase = { id: string; title: string; summary: string; contentMd: string; route: string };
type CompositeBase = LoBase & { los: Lo[] };

export type Course = CompositeBase & { type: "course" };
export type Topic = CompositeBase & { type: "topic" };
export type Talk = LoBase & { type: "talk" };
export type Web = LoBase & { type: "web" };
export type Archive = LoBase & { type: "archive"; archiveFile: string };
export type Lab = LoBase & { type: "lab"; los: LabStep[] };
...
export type Lo = Course | Topic | Unit | Side | Talk | Lab | Note | Web | Archive;
export type LoType = Lo["type"];
~~~

`Lo` is a union of nine shapes. `LoType` is derived from it, so it is exactly
`"course" | "topic" | ... | "archive"`: add a member to `Lo` and `LoType` grows with it. There is one list of
kinds, not two that can drift apart.

The `type` field is the **discriminant**. Checking it tells the compiler which shape it holds:

~~~ts
function stepTitles(lo: Lo): string[] {
  if (lo.type === "lab") return lo.los.map((step) => step.title);  // lo is Lab here
  return [];
}

function zipOf(lo: Lo): string {
  return lo.archiveFile;
  //        ~~~~~~~~~~~ Property 'archiveFile' does not exist on type 'Lo'.
}
~~~

Before the check, the compiler refuses to guess. After it, it knows. That alone stops a class of mistakes:
you cannot read `archiveFile` from a talk. The tests use the same move: `assert.ok(topic.type === "topic")`
narrows `topic` before the next line reads its `los`.

## Step 2: the exhaustive switch

The builder switches on the kind (`src/course-builder.ts`):

~~~ts
export function buildLo(root: string, rel: string, kind: LoType): Lo {
  const folder = readFolder(root, rel);
  switch (kind) {
    case "course":  ...
    case "topic":   ...
    case "unit":
    case "side":    ...
    case "talk":    ...
    case "note":    return { ...base(folder, kind), type: kind };
    case "web":     ...
    case "archive": ...
    case "lab":     return buildLab(folder);
    default:
      return assertNever(kind);
  }
}

export function assertNever(value: never): never {
  throw new Error(`unhandled learning object kind: ${String(value)}`);
}
~~~

Inside each `case`, `kind` is narrowed to that literal. After every case has been handled, nothing is left,
so in `default:` the type of `kind` is `never`: the empty type, with no values. `assertNever` accepts only
`never`. The call compiles **only** if every kind has a case.

Remove the `note` case and run the checker (you do this in Lab 2):

~~~
src/course-builder.ts(120,26): error TS2345: Argument of type '"note"' is not assignable to parameter of type 'never'.
~~~

The error names the file, the line and the missing kind. That is the pattern the Assertion Ladder calls
**Unrepresentable Mistake** (L5): a `Lo` the builder cannot build is not a program that compiles.

## Step 3: a record keyed by the union

The sort order is the second place a kind must appear (`src/model.ts`):

~~~ts
export const preOrder: Record<LoType, number> = {
  course: 0, unit: 1, side: 2, topic: 3, talk: 4, lab: 7, note: 8, web: 9, archive: 11,
};
~~~

`Record<LoType, number>` means "an object with **every** key of `LoType`". Leave one out and the object
literal does not type-check. Compare upstream's `Map<string, number>`, where a missing key is `undefined` and a
fallback hides it. *Prefer a type that cannot be incomplete over a default that hides the gap.*

Add a `Github` member to the union, and change nothing else. The checker now lists both places:

~~~
src/course-builder.ts(122,26): error TS2345: Argument of type '"github"' is not assignable to parameter of type 'never'.
src/model.ts(50,14): error TS2741: Property 'github' is missing in type '{ course: number; ... }' but required in type 'Record<..., number>'.
~~~

In rung 2 the same edit produces four errors: the two above, plus `card` and `pagesFor` in
`src/site-builder.ts`. Each rung that handles every kind adds a demand, and the compiler keeps the list for
you. You will see this in week 3.

## Where types stop: the prefix table

There is a third place a kind lives in rung 1, and the compiler does not watch it:

~~~ts
export const folderKinds: [prefix: string, kind: LoType | null][] = [
  ...
  ["github", null],   // still compiles after you add "github" to Lo
];
~~~

The table maps folder prefixes to kinds. `null` means "a kind upstream builds and rung 1 skips". Once
`"github"` is in `LoType`, the entry `["github", null]` is still perfectly typed, so every `github-` folder is
still skipped. Worse: change `["note", "note"]` to `["note", null]` and the checker is silent, while every
note in every course disappears.

This is the edge of L5. Types constrain the **shape** of data, not which value you chose. The mapping is
data, and data needs a test. Rung 1 covers it at L3, twice: `tests/course-builder.test.ts` builds a course with
a `notebook-1` folder and a note and checks their kinds, and `tests/conformance.test.ts` compares the whole
tree with upstream. In Lab 2, the `["note", null]` change fails four tests (`# pass 7`, `# fail 4`).

Could the table be a type too? You could write it as a `Record<string, LoType | null>` checked by
`satisfies`, or derive the prefixes from `LoType`, and the assignment's "Going further" asks you to try. Each
version costs something: rung 1 recognises kinds it does not build, so the table is wider than `LoType` on
purpose. Pick the weakest level that covers each risk.

## Why `assertNever` also throws

Rung 1 runs TypeScript with Node's **type stripping**: `node src/main.ts`. Node erases the types and runs the
JavaScript. It never checks them. So on rung 1, L5 fires in your editor, or when you run `npx tsc -p .` after
`npm install --no-save typescript@6 @types/node@22`, but not in the gate. The gate gains `tsc --noEmit` in
rung 3 (week 4), when TypeScript becomes a dev dependency.

Until then, the guard also works at run time. If a kind slips past an unchecked edit, `assertNever` throws:

~~~ts
test("a kind that slips past the type checker fails loudly at run time", () => {
  assert.throws(() => assertNever("podcast" as never), /unhandled learning object kind: podcast/);
});
~~~

Without the throw, the function would return `undefined` and the generator would write a `tutors.json` with
a hole in it. In Lab 2, removing the `note` case without running the checker still fails the gate: the
conformance test and an ordering test fail with `Error: unhandled learning object kind: note`. A crash is
better than a quietly wrong course.

## Erasable syntax only

Type stripping can only **erase**. It cannot generate code, so rung 1 avoids every TypeScript feature that
emits JavaScript:

| Not allowed | Use instead |
| --- | --- |
| `enum Kind { Talk, Lab }` | a union of string literals: `"talk" \| "lab"` |
| `namespace Model { ... }` | a module: `src/model.ts` |
| `constructor(private fs: Fs)` | a field and an assignment |
| `import { Lo } from "./model.ts"` for a type | `import type { Lo } from "./model.ts"` |

`tsconfig.json` sets `erasableSyntaxOnly` and `verbatimModuleSyntax`, so your editor flags each one. Notice
that the union of literals is both the erasable choice and the one that gives exhaustiveness. An `enum` would
have given neither here.

## The oracle covers the rest

Types prove the program handles every kind. They cannot prove it handles each kind **correctly**. For that,
rung 1 uses upstream as an oracle. The fixture `variants/fixtures/ladder-sample-course/` sits beside
`ladder-sample-course.tutors.json`, which upstream `tutors build` wrote for it. `tests/conformance.test.ts`
builds the fixture and compares:

~~~ts
const FIELDS = ["type", "id", "title", "summary", "contentMd", "route", "archiveFile", "shortTitle"];

function project(lo: Json): Json {
  const out: Json = {};
  for (const field of FIELDS) if (field in lo) out[field] = lo[field];
  if (Array.isArray(lo.los)) out.los = lo.los.map((child: Json) => project(child));
  return out;
}

test("every field this rung builds matches upstream, learning object by learning object", () => {
  assert.deepEqual(project(course), project(oracle));
});
~~~

The projection is the design move. Rung 1 claims only the fields it builds, so the test is strict about those
and silent about the rest. A second test compares just the outline (type, id, title), so a wrong tree fails
small and first, and a wrong field fails second.

| Approach | What can go wrong |
| --- | --- |
| Read upstream and write expectations by hand | you test your reading of upstream, not upstream |
| Snapshot your own output | you freeze your own bugs |
| Compare with upstream's output | only a change upstream; then regenerate and read the diff |

Every upstream quirk in rung 1 (one `#` dropped from a title, a lab titled from its first step's file name,
a unit routed to its topic) is there **because** the oracle demanded it. Upstream checks itself the same way:
`tests/unit/course-rules/gen-conformance.test.ts` checks the validator against what the generator does.

## Standard work: the gate and the manifest

In Lean, standard work is the current best way to do a job, written down so that everyone does it the same
way and so that improvement has a baseline to start from. Rung 1 has two pieces of standard work, and both
are about catching defects early.

**The Single Gate** is standard work for "done". `npm test` runs every check: the builder tests, the
conformance test against the oracle, and the Rung Fence. There is no second list of things to remember before
you call a change finished. In `package.json` it is one line:

~~~json
"scripts": { "start": "node src/main.ts", "test": "node --test tests/*.test.ts" }
~~~

It takes well under a second on rung 1, which matters: a slow gate is a delay, and a delay makes people skip
it. Each defect the gate catches is caught in the contributor's own terminal, the cheapest step in the value
stream from week 1, rather than by a lecturer or a student.

**`AGENTS.md`** is standard work for a contributor, and above all for a coding agent that remembers nothing
between sessions. It says how to verify ("`npm test`; if the fence or the conformance test fails, change the
code, not the test"), where each kind of change goes, and what needs a person first. It stays under 500 words
because standard work nobody reads is not standard. Anything a test can check is taken out of it and put in
`tests/`, so the prose shrinks as the checks grow.

L5 is the strongest form of the same idea. Lean calls it *poka-yoke*, mistake-proofing: a jig that only
fits one way round. The exhaustive `switch` is a jig for kinds. You will meet the word again in week 10.

Standard work is a baseline, not a ceiling. The lab's Kaizen step asks you to improve it: a faster way to
compare outputs, a clearer line in `AGENTS.md` (proposed to a person, because it is behind the Human
Boundary), or a check that takes a rule out of the prose.

## Which levels guard this week's rules

| Rule | Level | Pattern | Where it is kept |
| --- | --- | --- | --- |
| A new kind is built by its own `case` | L5 Prevented | Unrepresentable Mistake | `switch` in `buildLo` ending in `assertNever(kind)` |
| Every kind has a sort order | L5 Prevented | Unrepresentable Mistake | `preOrder: Record<LoType, number>` |
| A field is read only on the kind that has it | L5 Prevented | Unrepresentable Mistake | narrowing on `lo.type` |
| A kind that slips past the checker does not write a wrong `tutors.json` | L3 Checked | Executable Rule | `assertNever` throws; `tests/course-builder.test.ts` |
| The prefix table maps each prefix to the right kind | L3 Checked | Executable Rule | `tests/course-builder.test.ts`, `tests/conformance.test.ts`, the assignment's grading test |
| The output agrees with upstream | L3 Checked | Executable Rule | `tests/conformance.test.ts` |
| Only erasable syntax; `import type` for types | L2 Told, L5 in the editor | Short Manifest | `AGENTS.md`; `tsconfig.json` |
| Only a person changes the fixture, the oracle or the conformance test | Human Boundary | Human Boundary | `AGENTS.md`, "Ask a human first" |
| One command says the work is done | all | Single Gate | `npm test` (11 tests) |

And upstream, for comparison: the same rules sit at L0 (`Lo.type: string`, a silent `default:`, a `Map` with a
fallback), with `packages/jsr/types` the first step towards L5.

## Self-check

1. **(Remember)** What is the type of `kind` in the `default:` branch of a switch that handles every member
   of the union?
2. **(Understand)** Why does `LoType = Lo["type"]` matter more than writing the list of kinds out by hand?
3. **(Understand)** Explain why `Record<LoType, number>` is stronger than `Map<string, number>` for `preOrder`.
4. **(Apply)** You add `Podcast = LoBase & { type: "podcast" }` to the union. List every error the checker
   reports in rung 1, and every place you must change that it does **not** report.
5. **(Analyse)** Changing `["note", "note"]` to `["note", null]` type-checks but fails four tests. Which level
   catches it, and why can L5 not?
6. **(Analyse)** Why does `assertNever` throw, when the compiler already rejects a missing case?
7. **(Evaluate)** The conformance test compares a projection, not the whole file. What would you lose, and what
   would you gain, by comparing every field?
8. **(Understand)** In what sense are `npm test` and `AGENTS.md` standard work, and which waste does each
   remove?
9. **(Evaluate)** Upstream could make `Lo.type` a union tomorrow. What would it cost, and which of rung 1's
   moves would you copy first?
