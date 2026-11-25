# Tests that test the tests

A green suite is a claim, not a proof. This note walks through the five ways rung 4 checks its own tests (an
honest double, an oracle, properties that can fail, suite health and mutation testing), what each one caught,
and why a surviving mutant is a hidden defect. Worked from `tutors/variants/rung-4-proven` and
tutors-mono-repo at `2b96b69`.

## Where we are on the ladder

The last week of rung 4 (Proven). The first note turned requirements into scenarios. This one asks whether
the scenarios, and every other test, would notice if the code were wrong. The answer decides how much you can
trust a green gate, which matters most when a coding agent wrote the code.

## Five ways a suite can be green and wrong

| Weakness | The technique that answers it | Rung 4 file |
| --- | --- | --- |
| the test double behaves differently from the real thing | Honest Double | `tests/contract/file-system-port.contract.test.ts` |
| the expected values were copied from the code's own output | an oracle you did not write | `tests/conformance/tutors-json.test.ts`, `golden-html.test.ts` |
| the examples are the easy ones | properties over generated inputs | `tests/fuzz/*.fuzz.test.ts` |
| a test is skipped, focused or never collected | suite health | `tests/suite-health/suite-health.test.ts` |
| the assertions are too weak to notice a change | mutation testing | `stryker.config.json`, `tests/mutation/` |

## The Honest Double, extended

Week 5's contract ran three cases against both adapters. Rung 4 added the failure cases, and the first run
caught a real drift: listing a missing folder **rejected** on disk and returned `[]` in memory. Rung 4's
`MemoryFileSystem.list` now says so:

```ts
// Like readdir: a folder that is not there, or a file, cannot be listed. Rung 4's contract test found this drift.
if (prefix !== "" && ![...this.files.keys()].some((key) => key.startsWith(prefix))) return Promise.reject(new Error(`${dir}: no such folder`));
```

A property in `tests/fuzz/file-system-port.fuzz.test.ts` then compares the two adapters over random trees,
and its negative fixture proves it would have caught rung 3's double: "the honesty property can fail: it
catches rung 3's double, which listed a missing folder as empty".

## An oracle you did not write

`variants/fixtures/ladder-sample-course.tutors.json` was written by upstream's `tutors build`. The
conformance test compares every field rung 4 builds with it, so its expected values cannot copy a bug in
rung 4. The golden file test compares one whole page byte for byte; when it fails it shows the first
difference and says that regenerating it (`UPDATE_GOLDEN=1`) is a person's decision, listed under "Ask a
human first". Upstream does this at scale in `tests/generator/generator-compare.test.ts`, where every
intended difference needs a claim in `tests/generator/claims.yaml`.

## Properties that can fail

A property says "for every input, this holds", and fast-check searches for an input that breaks it,
shrinking any it finds to the smallest. Rung 4 has five:

- escaping never emits `<`, `>`, `"` or `'`, and loses nothing (`escape-html.fuzz.test.ts`, R-008);
- Markdown writes only its own well-formed tags (`markdown.fuzz.test.ts`);
- the longest prefix decides a folder's kind (`folder-kind.fuzz.test.ts`, R-001);
- whole random courses build and render a page per item (`course-tree.fuzz.test.ts`);
- the double agrees with the disk (`file-system-port.fuzz.test.ts`).

A property is written as a function of the implementation, so it can be run against a broken one:

```ts
// tests/fuzz/escape-html.fuzz.test.ts
const escapesEverything = (escape: (text: string) => string) =>
  fc.property(nasty, (text) => { const escaped = escape(text); expect(escaped).not.toMatch(/[<>"']/); ... });

test("the escaping property can fail: it finds the counterexample for an escape that forgets '", () => {
  const forgetful = (text: string) => text.replace(/[&<>"]/g, ...);
  expect(fc.check(escapesEverything(forgetful), fuzzParameters()).failed).toBe(true);
});
```

That "can fail" test is a **negative fixture**. A property that cannot fail proves nothing, and a property
that only ever passes might be checking nothing. Upstream's `tests/TESTING.md` says the same: "a negative
fixture runs it against a deliberately broken wrapper to prove it can fail." A failure prints `{ seed, path }`;
`FUZZ_SEED=... FUZZ_PATH=... pnpm test:fuzz` replays exactly that case.

## Suite health

`scripts/checks/suite-health.ts`, mirroring upstream's tier O, finds four kinds of trouble:

| Finding | Why it matters |
| --- | --- |
| `only` | `.only` silently skips every other test in its file |
| `skip` | a skipped test stops proving its rule (only `tests/assignment/` may skip) |
| `uncollected` | a test file the runner never collects proves nothing |
| `no-negative-fixture` | a property file with no "... can fail" test |

Remove the "can fail" title from a property file and the gate says: "a property test needs a negative fixture:
one test, titled \"... can fail\", that runs the property against a broken implementation and expects a
counterexample. A property that cannot fail proves nothing." Like the closure audit, suite health runs on
negative fixtures of its own before it runs on the repository.

## Mutation testing

Stryker changes the source one small change at a time (a **mutant**: `>` to `>=`, a condition to `true`, a
block emptied) and runs the tests against each.

- **Killed**: some test failed. The suite noticed.
- **Survived**: every test passed. Either a test is missing, or the mutant is **equivalent**: it changes
  nothing anyone could observe.
- **No coverage**: no test ran the line at all.
- **Score** = killed / (killed + survived + no coverage), per file and overall.

Rung 4 mutates the six files of `packages/gen` and `packages/lite`, and `tests/mutation/mutation-floors.json`
holds each file's floor (`site-builder.ts` 92, `course-builder.ts` 94, `markdown.ts` 87, the others 100).
`pnpm check:mutation-floors` fails a file below its floor, and fails a floor the score has outgrown by more
than `staleMargin` (2) points, so a gain is kept with `--update`. A floor is never lowered. Upstream uses the
same file names and script (`scripts/checks/mutation-floors.ts`), and its `stryker.config.json` mutates
fourteen modules.

### Why the BDD steps are left out

vitest-cucumber makes each step its own test, and Stryker's vitest runner reruns, for each mutant, only the
tests that executed the mutated line. A mutant reached in a When step is retried with the When alone, so no
Then checks it: a false survivor. A mutant reached in a Then is retried without its Given: a false kill from a
crash. `RUNG.md` has the numbers from the runs that found this (85.37% with the When doing the work; an
inflated 93.29% with the Thens doing it; 82.49% for the honest baseline). So `vitest.config.mutation.ts`
holds the unit, contract, conformance and fuzz tiers, and no steps, as upstream's does. **The scenario proves
the requirement; a unit or property test pins the code.**

### A worked run

After R-013 was added and proved only by its scenario, `pnpm test:mutation` reported:

```
File                     |  total | covered | # killed | # timeout | # survived | # no cov |
All files                |  91.94 |   93.27 |      370 |        18 |         28 |        6 |
   site-builder.ts       |  85.48 |   91.38 |       53 |         0 |          5 |        4 |
```

All five survivors were on the new line. A unit test brought `site-builder.ts` to 90.32% and two survivors
remained, `lab.los.length > 1` to `true` and to `>= 1`. The test's "a lab of one step has no position" check
looked at `buildSite(...)[0]`, the **course** page, which never has a position: the assertion was true for
the wrong reason. Finding the lab's own page by path killed both: 93.55%, and "Every file holds its floor."
Mutation testing found a test that could not fail.

## Lean: survivors are hidden defects

A surviving mutant is a version of the code that is wrong and that every test accepts. If anyone, person or
agent, made that change tomorrow, the gate would stay green and the defect would ship. Found by Stryker now, a
survivor costs one test. Found by a student after a release, it costs a bug report, a fix and a release:
**rework**. Mutation testing makes hidden defects visible while they are cheap.

Use Five Whys on a survivor. For the one above: it survived because the assertion passed with the mutant;
because it checked the wrong page; because the author assumed page 0 was the lab's; because the assertion was
never seen to fail on its own; because the standard work says "see it fail" for scenarios but not for each
assertion. The countermeasure improves the standard work, not just the test.

And not every survivor is a defect. `course-builder.ts` keeps one: `IGNORED = new Set(["json", "html",
"node_modules"])` mutated to `new Set([])`. If no course folder can tell the two apart, because `folderKind`
already ignores those names, the mutant is equivalent. Then the right answer may be to delete the set, which
is a refactor that every other test must survive.

## Which Assertion Ladder levels guard these rules

| Rule | Level | Where it is kept |
| --- | --- | --- |
| The test double tells the truth | L4 Honest Double | the contract and its property twin in `tests/fuzz` |
| The generator agrees with upstream | L3 Executable Rule | `tests/conformance/tutors-json.test.ts` |
| One page matches its golden file | L4 Explained | `tests/conformance/golden-html.test.ts` |
| Each property can fail | L4 Explained | suite health, `no-negative-fixture` |
| No focused, skipped or uncollected test | L4 Explained | `tests/suite-health/suite-health.test.ts` |
| The suite notices changes to gen and lite | L3 Checked, outside the gate | `pnpm test:mutation`, then `pnpm check:mutation-floors` |
| Never loosen an assertion to go green | L2 Told, partly L3 | `AGENTS.md`, "Never to go green"; a loosened assertion lets mutants survive |

Mutation testing stays outside the gate because it takes about a minute and its findings need a person to
judge: a survivor may be equivalent. Upstream runs it nightly and on pull requests.

## Self-check

1. **(Remember)** Name the five techniques and the weakness each answers.
2. **(Understand)** Why is an oracle written by upstream stronger than expected values you write yourself?
3. **(Understand)** Explain a false survivor and a false kill when BDD steps run under Stryker.
4. **(Apply)** Write a negative fixture for a property "every page links home".
5. **(Analyse)** Why did `buildSite(...)[0]` make an assertion that could not fail?
6. **(Evaluate)** A survivor changes `>` to `>=` on a line whose two sides can never be equal. Kill it, or
   argue it equivalent? What evidence would decide?
7. **(Evaluate)** Your colleague proposes lowering `markdown.ts`'s floor from 87 to 85 "because a refactor
   lost two points". Judge the proposal against `AGENTS.md`.
