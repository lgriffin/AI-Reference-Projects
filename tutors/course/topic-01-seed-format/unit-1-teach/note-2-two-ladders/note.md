# Two ladders

The capability ladder is what you build in this module. The Assertion Ladder is how each rung stays safe when
you build it with a coding agent beside you. This note explains both, shows every level of the second ladder
at work in rung 1, and sets out what "build beyond" means.

## The capability ladder

Tutors upstream is large: five SvelteKit apps, eleven Deno packages, twenty-one Svelte packages, 224 test
files and seventeen workflows at the pinned commit. Nobody learns that by reading it top to bottom. So the
module rebuilds Tutors from its simplest working version, one capability at a time:

| Rung | Variant | Capability | Weeks |
| --- | --- | --- | --- |
| 1 Seed | `rung-1-seed` | course folder in, `tutors.json` out | 1-2 |
| 2 Lite | `rung-2-lite` | a static HTML website | 3 |
| 3 Layers | `rung-3-layers` | the same tools as a layered pnpm workspace with ports | 4-5 |
| 4 Proven | `rung-4-proven` | tests as specification: EARS, BDD, contracts, properties, mutation | 6-7 |
| 5 Reader | `rung-5-reader` | an interactive SvelteKit reader, specified first | 8-9 |
| 6 Guarded | `rung-6-guarded` | safe content, private courses, a secure supply chain | 10 |
| 7 Shipped | `rung-7-shipped` | a versioned, gated, containerised release | 11 |
| Summit | tutors-mono-repo | the real thing | 12 |

Three properties make it a ladder rather than a list.

**It is one straight line.** Each variant starts as a copy of the rung below and adds one major capability.
Rung 2 is rung 1 plus a renderer: its `src/model.ts` and `src/course-builder.ts` are byte for byte the same as
rung 1's, and you will prove that with `diff` in week 3. Whatever you learn on a rung is still true on every
rung above it.

**Each rung needs a little more expertise and pays it back with a major capability.** Rung 1 needs
TypeScript, the file system and the course format. Rung 3 needs workspaces and dependency direction. Rung 5
needs Svelte 5 runes and SvelteKit routing. `RUNG.md` in each variant (the **Rung Delta**) names the
capability, the expertise and the upstream files the rung mirrors, so you can always see what you are
climbing towards.

**Testing sits at rung 4, straight after Layers.** Once the tools have a shape (rung 3), rung 4 turns their
tests into a specification you can read: requirements written in EARS ("When ..., the generator shall ..."),
scenarios written as Given/When/Then, and a closure audit that checks every requirement has a scenario. From
then on every new capability arrives specified first. That is why the labs in weeks 1 to 5 each have a
"Name the rule" step: you practise writing a rule as a "shall" sentence long before week 6 teaches EARS
properly.

Why rebuild from the simplest version? Because you can read rung 1 whole: 244 lines in three files. Because
every line on every rung has a reason you have met. Because each rung is a working Tutors, so you can break
it and watch. And because the names match upstream (`Course`, `Topic`, `Lab`, `LabStep`, `"talk"`, `"web"`),
so what you learn carries straight across at the Summit.

## The Assertion Ladder

A coding agent writes code faster than you can read it, and starts every session with no memory of your
project's rules. Asked for "a reader", it will happily add Svelte, a router, a database client and a test
framework. You receive code you cannot yet understand, and you learn less. The Assertion Ladder
(`docs/assertion-ladder.md` in this repository) comes from a paper on keeping a domain intact when agents
contribute. Its solution, in one sentence: *for each rule, pick a level; climb until the rule's risk is
covered, then stop.*

| Level | Name | Teaching move | What the contributor experiences |
| --- | --- | --- | --- |
| L0 | Implied | hidden curriculum | nothing; it guesses |
| L1 | Shown | worked example | a pattern to imitate |
| L2 | Told | direct instruction | a rule it may follow, forget or misread |
| L3 | Checked | assessment | a red suite |
| L4 | Explained | formative feedback | a red suite whose message names the rule, the offender and the fix |
| L5 | Prevented | constraint | the wrong form does not compile |

Every level has a home in rung 1. Find each one in `tutors/variants/rung-1-seed/` this week.

**L0, Implied.** The generator ignores a folder whose name has no kind. Nothing in the generator says so; the
rule is implied by what happens. Upstream's `buildSimpleLo` in `packages/jsr/gen/src/services/course-builder.ts`
ends its `switch` with an empty `default:`, so a kind with no case is also L0 there.

**L1, Shown (Worked Slice).** The whole of `src/` is the worked slice: three files, small enough to read
before you change one. If you want to know how a new kind should look, you copy the `web` case.

**L2, Told (Short Manifest).** `AGENTS.md` is under 500 words. It says where things go ("a learning object
kind or field: `src/model.ts`, then the `case` the compiler asks for"), to use only erasable syntax, and to keep
upstream names. An agent may read it, forget it or misread it, which is why only rules no test can check
stay there.

**L3, Checked (Executable Rule).** `tests/course-builder.test.ts` checks the longest-prefix rule.
`tests/conformance.test.ts` checks that the output agrees with what upstream wrote for the shared fixture
(week 2).

**L4, Explained (Teaching Failure).** `tests/rung-fence.test.ts` fails with a message that names the rule, the
file and the remedy. Here is the failure from a scratch copy of rung 1 in which an agent added a `fetch` to
`src/main.ts` (this exact text was produced while preparing this week):

~~~
Rung Fence, rung 1 (Seed): src/main.ts uses network access ("fetch("). The generator reads a folder and
writes a file; it never needs the network. The first network call is the reader loading tutors.json in
rung 5 (Reader). Remove it from this rung.

Lifting the fence is a person's decision: see AGENTS.md, "Ask a human first".
~~~

**L5, Prevented (Unrepresentable Mistake).** The `switch` in `buildLo` ends in `assertNever(kind)`, and
`preOrder` is a `Record<LoType, number>`. Add a kind to the `Lo` union and forget a case, and the program does
not type-check. Week 2 is about this level.

Two more patterns hold the levels together. The **Single Gate** is one command that runs every check:
`npm test` on rungs 1 and 2, `pnpm test` from rung 3. Green means done. The **Human Boundary** is a short list
of changes that need a person first; in rung 1's `AGENTS.md` it reads: adding any dependency or changing the
fence; changing the shared fixture or its oracle; changing the conformance test or `AGENTS.md`; changing the
shape of `tutors.json` away from upstream.

## The Rung Fence

The module adds two patterns to the paper's set, both defined in `tutors/LADDER.md`.

| Pattern | Problem | Solution |
| --- | --- | --- |
| Rung Fence | How is a learner kept from receiving code above their rung? | An executable rule that lists what the rung may use, fails with the rung that introduces anything else, and is changed only by a person. |
| Rung Delta | How does a learner see what a rung adds? | Each variant's `RUNG.md` names the capability added, the expertise it needs and the upstream files it mirrors. |

Rung 1's fence is about 80 lines. Its core is two lists:

~~~ts
// variants/rung-1-seed/tests/rung-fence.test.ts
const ALLOWED: Record<string, string[]> = { dependencies: [], devDependencies: [], peerDependencies: [], optionalDependencies: [] };

const FORBIDDEN: { pattern: RegExp; what: string; why: string }[] = [
  { pattern: /\bfetch\s*\(|XMLHttpRequest|WebSocket|"node:(https?|http2|net|tls|dgram|dns)"/, what: "network access", why: "... in rung 5 (Reader)." },
  { pattern: /"node:child_process"|"node:worker_threads"/, what: "other processes or threads", why: "..." },
  { pattern: /\.html\b|<html|<body/i, what: "HTML output", why: "A website arrives in rung 2 (Lite)." },
];
~~~

and three tests: no dependency in `package.json`; only `node:` built-ins and relative files imported from
`src/`; nothing in `FORBIDDEN`. Each `why` names the rung that introduces the capability. The fence does not
say "no". It says "not yet, and here is where".

Notice that the fence strips comments before it matches. A comment may name what the code must not do; only
code is fenced.

When you climb, the fence moves with you. Rung 2's fence is rung 1's with one rule changed: "HTML output"
becomes "client-side JavaScript", because rung 2 writes HTML and refuses scripts until the reader arrives at
rung 5. That one changed line is the fence's own Rung Delta.

## Working with an agent, under both ladders

1. **Start each session from the manifest.** Ask the agent to read `AGENTS.md` and `RUNG.md` first.
2. **Name the rung in your request.** "On rung 1, add the github kind" beats "add GitHub support".
3. **Run the gate before you read the diff.** Red means the agent left the rung or broke a rule.
4. **Read what it wrote.** If you cannot explain a line, ask, or take that part out.
5. **Never let the agent edit the fence or the tests to go green.** That is the Human Boundary.

## Build beyond, inside the fence

Every lab ends with a "Build beyond" step, and you are expected to do some of it. Building beyond a variant
means taking its capability further than the variant goes: a new kind, a new option, a better message, a
rule the validator does not have yet. It does not mean climbing early. A Markdown library, a web framework or
a network call is not "beyond" rung 1; it is a later rung, and the fence will say so. The best extensions stay
inside the fence and push on what it allows. If you need to lift the fence, that is a decision you make, on
purpose, in its own commit, after reading the next rung's `RUNG.md`.

## How this module climbs Bloom's levels

The module is designed against the revised Bloom's taxonomy, and the two ladders meet it directly. Reading a
fence message is **Understand**. Fixing the code it names is **Apply**. Seeding a violation on purpose to see
which level catches it is **Analyse** (you do this in weeks 2 and 3). Deciding how far a rule should climb, L2
told or L3 checked or L5 prevented, is **Evaluate**. Writing a new fence rule or check is **Create**. Weeks 1
to 3 sit mostly at Remember to Apply; the centre of gravity rises each rung until week 12 is Evaluate and
Create on the real repository.

## Which levels guard this week's rules

| Rule | Level |
| --- | --- |
| Rung 1 has no dependency, no network, no HTML, no other process | L4, `tests/rung-fence.test.ts` |
| Only a person changes the fence | Human Boundary, `AGENTS.md` |
| One command says the work is done | Single Gate, `npm test` (11 tests) |
| A course folder is compliant | L4, `tutors/scripts/check-course.sh` with upstream V001 to V021 |
| Ask the agent to read `AGENTS.md` first | L2, this note and every `AGENTS.md` |

## Self-check

1. **(Remember)** Name the six levels of the Assertion Ladder in order.
2. **(Remember)** Which rung introduces testing as specification, and which week does the module reach it?
3. **(Understand)** Explain the difference between L3 and L4, using the fence message above.
4. **(Understand)** Why is each variant a copy of the rung below, and what can you check with `diff` because of
   it?
5. **(Apply)** An agent on rung 1 adds `import { marked } from "marked"`. Which fence test fails, and which
   rung does its message point to?
6. **(Analyse)** For each of the following, name the level at which it is kept in rung 1: "use `import type`
   for types"; "every kind has a sort order"; "the output agrees with upstream".
7. **(Evaluate)** The fence could forbid HTML with a type instead of a test. Would that be stronger or weaker,
   and is it worth it on rung 1?
