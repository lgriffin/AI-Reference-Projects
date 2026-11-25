# From rule to scenario: BDD

How a requirement becomes executable proof: a Gherkin `Rule:` that repeats the sentence, scenarios that give
examples, step definitions that bind each line to real code, and the Specify-first loop that every lab follows
from now on. Worked from `tutors/variants/rung-4-proven` (paths without a prefix are relative to it) and
tutors-mono-repo at `2b96b69`. Read it beside "Writing requirements with EARS" from week 6.

## Where we are on the ladder

This is the second and last week of rung 4 (Proven). Week 6 taught the sentence. This week teaches its proof,
and then asks whether the proof can be trusted (the second note, "Tests that test the tests"). From week 8 on,
rung 5's reader is specified first: every capability arrives as a requirement and a scenario before any code.

## Behaviour-Driven Development

Behaviour-Driven Development (BDD) grew out of test-driven development in the mid-2000s (Dan North, 2006).
Its idea is small: describe behaviour in the language of the people who want it, as concrete examples, and
make the examples executable. Three things follow.

1. The examples are written **before** the code, so they are a specification, not a record.
2. They use the **domain's** words ("a lab whose steps are Intro, Setup, Build"), so a lecturer can read them.
3. Each one either passes or fails, so the specification cannot silently drift from the product.

Gherkin is the language most BDD tools read. It has a handful of keywords: `Feature`, `Rule`, `Scenario`,
`Given`, `When`, `Then`, `And`, `But`, `Background`, `Scenario Outline` and `Examples`, and tags written as
`@name` above a keyword. The `Rule:` keyword arrived in Gherkin 6, and it is the one that connects BDD to
EARS.

## The anatomy, from the outside in

### Feature

A feature groups the behaviour of one part of the product. Rung 4 has one per layer:

| Feature | Layer | Rules |
| --- | --- | --- |
| `tests/bdd/features/generator/course-folder.feature` | gen | R-001 to R-007 |
| `tests/bdd/features/site/static-site.feature` | lite | R-008 to R-011 |
| `tests/bdd/features/command/command.feature` | cli | R-012 |

The feature's header says who wants it and why ("As a student reading a course without a server / I want a
page for each thing I read ... / So that I can read the course from a folder of HTML"), and a short paragraph
says how its scenarios reach the code ("The scenarios call @ladder/lite's buildSite on a Course ..."). That
paragraph is for the next contributor: it says which public function the steps drive.

### Rule

A `Rule:` is one requirement. Its title is the EARS sentence from `REQUIREMENTS.md`, **word for word**, and
two tags sit on the line above it:

```gherkin
  @R-004 @ears-event-driven
  Rule: When a lab folder holds markdown files, the generator shall write one step per file, in file-name order, whose id is the file name between its first and last dot.
```

The id ties the Rule to its row. The pattern tag must match the row's pattern. The closure audit checks both
(`unknown-id`, `ears-tag`, `rule-title-drift`), as you saw in Lab 6.

### Scenario

A scenario is one example that proves the Rule. R-004 has two:

```gherkin
    Scenario: The steps of a lab
      Given a course with a lab "topic-1/book-1" holding the files "02.Build.md, 00.Lab-1-Intro.md, 01.Set.Up.md"
      When the course is built
      Then the lab "book-1" has the steps "Lab-1-Intro, Set.Up, Build"
      And each step of the lab "book-1" has the lab's route followed by its id

    Scenario: A lab with img/main.png takes its first step's id as its title
      Given a course with a lab "topic-1/book-1" holding the files "00.Lab-1-Intro.md, 01.Setup.md, img/main.png"
      When the course is built
      Then the lab "book-1" has the title "Lab-1-Intro"
```

Look at what the first one chooses. The files are given **out of order**, so a generator that kept the
directory order would fail. One name, `01.Set.Up.md`, has **two inner dots**, so a generator that cut at the
first dot or the last would fail. Each detail is there because it can catch a wrong implementation. That is
what makes an example a proof rather than an illustration.

### Given, When, Then

| Keyword | Says | From the EARS sentence |
| --- | --- | --- |
| **Given** | the context: what exists before | a state ("While") or a feature ("Where") becomes a Given |
| **When** | the one action under test | the trigger ("When") or the unwanted condition ("If") |
| **Then** | the observable outcome | the response after "shall" |
| **And**, **But** | more of the same kind as the line above | |

Upstream's methodology makes a point worth remembering: `While`, `Where` and `If` are EARS words, not Gherkin
keywords. A Gherkin parser drops a line that starts with one, so the scenario would run, and pass, without its
precondition. Write them as Given and When.

R-002 shows the unwanted-behaviour shape. The When goes wrong; the Then shows the safe response:

```gherkin
  @R-002 @ears-unwanted
  Rule: If a course folder has no course.md, then the generator shall refuse to build it and say that course.md is missing.

    Scenario: A folder of topics without course.md
      Given a folder holding only "topic-1/topic.md"
      When the course is built
      Then the build fails with "no course.md"
```

R-001 shows a ubiquitous Rule proved by three scenarios, each probing one edge: the ordinary prefixes, "A
notebook is not a note" (the longest prefix wins) and "A folder that names no kind is not content".

## Step definitions

A step definition binds one line of a scenario to code. Rung 4 uses `@amiceli/vitest-cucumber`, as upstream
does. The steps for the generator's feature begin:

```ts
// tests/bdd/steps/generator/course-folder.steps.ts
const feature = await loadFeature("tests/bdd/features/generator/course-folder.feature");

describeFeature(feature, ({ BeforeEachScenario, Rule }) => {
  let fs: FileSystemPort;
  let course: Course;
  let failure: Error | undefined;
  let warnings: string[];

  BeforeEachScenario(() => { courseId = "c"; failure = undefined; warnings = []; });

  /** The When every Rule shares: build the course, keeping a failure for the Then to check. */
  const build = async () => {
    try {
      course = await buildCourse(fs, courseId, { warn: (message) => warnings.push(message) });
    } catch (error) {
      failure = error as Error;
    }
  };
```

and a Rule's binding repeats its title:

```ts
  Rule("If a course folder has no course.md, then the generator shall refuse to build it and say that course.md is missing.", ({ RuleScenario }) => {
    RuleScenario("A folder of topics without course.md", ({ Given, When, Then }) => {
      Given("a folder holding only {string}", (_ctx, path: string) => {
        fs = memory({ [path]: "# T\n" });
      });
      When("the course is built", build);
      Then("the build fails with {string}", async (_ctx, message: string) => {
        expect(failure?.message).toContain(message);
      });
    });
  });
```

Five details make these steps good.

1. **They call product code.** `buildCourse`, the same function the command runs, through the same port.
   Upstream's rule is the same: steps "call product code ... and never assert on a fixture".
2. **They use the port.** `memory(...)` is `new MemoryFileSystem(...)`, the double kept honest by the
   contract you met in week 5. Only R-007's scenario reads the disk, through `NodeFileSystem`, because its
   oracle is a real folder.
3. **The When keeps failures for the Then.** `build` catches the error so that R-002's Then can check its
   message. Without that, the When would throw and the Then would never run.
4. **`{string}` captures quoted text.** `list("Intro, Setup, Build")` in `tests/bdd/support/course.ts`
   splits it. Rung 4 passes lists as one quoted string, not Gherkin tables, so each scenario stays one line
   per step.
5. **Helpers say what does not matter.** `courseFiles`, `folders` and `files` in `tests/bdd/support/course.ts`
   make a minimal course from a few names, "so a scenario says only what matters to its Rule".

### Strict in both directions

vitest-cucumber fails a run when a Rule, a scenario or a step exists on one side only:

| You do | It fails with |
| --- | --- |
| add a Rule to the feature but not to the steps | `RuleNotCalledError: Rule: ... was not called` |
| change a Rule's title in the feature only | `FeatureUknowRuleError: Rule: ... does not exist in ...` |

Each Given, When and Then is its own Vitest test. That is why `pnpm test:bdd` reports 61 tests for twelve
Rules, and it matters a great deal for mutation testing, below.

## Specify first, worked end to end

From this week every lab opens with **Specify first**. Here is the loop on the rule you will add in Lab 7:
on a lab of several steps, each step page says where it is, "Step 2 of 3".

**1. Take an id.** `pnpm test:ears:audit --next-id` prints `R-013`.

**2. Write the sentence.** It happens when a lab has more than one step: event-driven. It is about a page:
the site, implemented in lite.

```
| R-013 | Event-driven | When a lab has more than one step, the site shall label each step page with its position, such as Step 2 of 3. | lite |
```

The audit refuses it at once: `unproved-requirement: REQUIREMENTS.md:24 R-013: no Rule tagged @R-013 has a
scenario.` A person reads the sentence and says yes.

**3. Write the Rule and a scenario.** Append to `static-site.feature`:

```gherkin
  @R-013 @ears-event-driven
  Rule: When a lab has more than one step, the site shall label each step page with its position, such as Step 2 of 3.

    Scenario: Each step knows where it is
      Given a course with a lab whose steps are "Intro, Setup, Build"
      When the site is built
      Then the step page "Setup.html" says "Step 2 of 3"
```

The audit is satisfied. vitest-cucumber is not: `RuleNotCalledError: Rule: When a lab has more than one step,
the site shall label each step page ... was not called`.

**4. Bind the steps, and see red.** The Given and When are the same as R-010's. The new Then is one line:
`expect(page(\`book-1/${path}\`)).toContain(text)`. Run `pnpm test:bdd`:

```
AssertionError: expected '<!doctype html>\n<html lang="en">\n<h…' to contain 'Step 2 of 3'
      Tests  1 failed | 63 passed (64)
```

It fails in the Then, for the right reason: the behaviour is missing. A scenario you have never seen fail has
not shown that it can.

**5. Make it green.** Two lines in `labPages` in `packages/lite/src/site-builder.ts`, through the `html`
template, so the numbers are escaped like everything else. `pnpm test`: `Tests  186 passed | 6 skipped (192)`.

**6. Pin the code.** The scenario proves R-013 in the gate, but Stryker cannot use it (the second note says
why). A unit test titled `"R-013: ..."` pins the code, and the closure audit checks the citation.

**7. Reflect.** What did this loop cost, and where did you wait? That is the Kaizen step.

## Upstream does the same, at scale

Upstream's features live in `tests/bdd/features/<persona>/` and hold 441 Rules across 85 files at `2b96b69`.
`tests/bdd/features/generator/course-json.feature` is the closest to rung 4: a `Background` builds a corpus
once ("Given the synthetic corpus course has been generated"), and seven Rules check the `tutors.json` it
wrote, among them `@rule-0265` (lab steps, rung 4's R-004) and `@rule-0266` (hidden topics, this week's
assignment). Its steps, `tests/bdd/steps/generator/course-json.steps.ts`, use the same `loadFeature` and
`describeFeature`. With the clone's dependencies installed, `vitest run` on that file reports
`Tests  39 passed (39)`: steps, not scenarios, as in rung 4.

Two upstream practices rung 4 does not have yet:

- **`@active` and `@inactive`** scenarios for state-driven and optional Rules (`dual-scenarios`).
- **Browser-proved Rules.** A feature tagged `@ui` is proved by Playwright tests whose titles are the scenario
  titles, tagged with the Rule id (`apps/reader/tests/e2e/`). Rung 5 meets the idea.

## Lean: specify first removes rework

| Without the loop | Waste |
| --- | --- |
| code first, argued about later | rework |
| a test written from the code's own output | a hidden defect: the test agrees with the bug |
| behaviour an agent thought useful | extra features (overproduction) |
| "what was this meant to do?" | relearning |

The loop is standard work, in `AGENTS.md` as "Behaviour starts as a sentence". Like all standard work it is a
baseline: the Kaizen step asks you to improve it.

## Which Assertion Ladder levels guard this week's BDD rules

| Rule | Level | Where it is kept |
| --- | --- | --- |
| Every requirement has a Rule with a scenario; every Rule cites a known id | L4 Explained | the closure audit in the gate |
| A Rule's title is its sentence, word for word | L4 Explained | `rule-title-drift` |
| A feature and its steps agree | L3 Checked | vitest-cucumber (`RuleNotCalledError`, `FeatureUknowRuleError`) |
| Every feature is loaded by a steps file | L4 Explained | `unbound-feature` |
| A scenario was seen to fail first | L2 Told | `AGENTS.md`, step 3 of "Behaviour starts as a sentence" |
| The scenario's example would catch a wrong implementation | a person | review; mutation testing gives evidence |

## Self-check

1. **(Remember)** Name the Gherkin keyword that holds a requirement, and the two tags above it in rung 4.
2. **(Understand)** Why does R-004's first scenario list the files out of order, and include `01.Set.Up.md`?
3. **(Understand)** Why does the generator feature's When catch errors instead of letting them throw?
4. **(Apply)** Write a scenario for R-012 with the arguments `"course out extra"`. Does the requirement as
   written say what should happen? What would you do?
5. **(Analyse)** `pnpm test:bdd` reports 61 tests for 12 Rules. Explain the number, and why it matters for
   mutation testing.
6. **(Analyse)** Translate upstream's `@rule-0279` (week 6) into Given/When/Then for its `@active` and
   `@inactive` scenarios.
7. **(Evaluate)** A colleague writes a Then that compares the output with a snapshot taken from the current
   code. Judge it as proof of a requirement.
8. **(Create)** Write the Rule and two scenarios for the Optional requirement "Where the command is given
   --json-only, the command shall write tutors.json and no pages."
