# Specifying a user interface with EARS and BDD

You learned EARS in week 6 and Given/When/Then in week 7, on a command-line tool: a folder goes in, files
come out, and a test can compare them. A user interface is harder. Its output is a screen, its input is a
person, and half of what matters (focus, layout, a key press) exists only in a browser. This note shows
how rung 5 and upstream each specify a reader, with worked examples from both, and gives you a method for
your own rules. Worked from `tutors/variants/rung-5-reader` and tutors-mono-repo at `2b96b69`.

## Where we are on the ladder

Week 9, the last week of **rung 5 (Reader)**. Rung 4 made tests the specification. Rung 5 was the first
rung built under that discipline: nine requirements, R-013 to R-021, written before the reader's code. You
have added one (R-022, the wall) and this week you add two more: R-023 in the lab, and the reading-order
rule in the assignment. This note is the reasoning behind how those sentences are written and where their
proof lives.

## A short refresher, on reader examples

EARS gives a requirement one of five shapes. Rung 5's reader uses three of them.

| Pattern | Shape | A reader example |
| --- | --- | --- |
| Ubiquitous | The reader shall ... | R-021: "The reader shall show breadcrumbs from the course down to the page on screen, leaving out units and sides." |
| Event-driven | When ..., the reader shall ... | R-018: "When a lab is opened without a step in its URL, the reader shall show the lab's first step." |
| Unwanted behaviour | If ..., then the reader shall ... | R-020: "If a URL names a course, a page or a lab step that the course does not hold, then the reader shall answer 404 with a message that names what is missing." |
| State-driven | While ..., the reader shall ... | none yet in rung 5; upstream: "While a learning object of a course is open, the reader shall lead the course navigation with that object's title ..." |
| Optional | Where ..., the reader shall ... | none in rung 5; upstream `@rule-0033`: "Where a student has chosen full width, the reader shall let lab and note text fill the reading panel." |

The rules of week 6 still hold: one "shall", a known system name (`the reader`), no vague words, and a
response somebody could observe. `pnpm test:ears:audit` checks the first three. The fourth needs you.

## The first problem: who is the observer?

For the generator, "observable" meant "in the output file". For a reader there are two observers, and
they see different things.

- **A program calling the reader's logic** can observe which page a URL resolves to, what the 404 message
  says, which step comes next, how many requests were made.
- **A person in a browser** can observe all of that, and also: where the focus is, whether the card is
  clickable, whether the arrow key works, whether the text fits a phone.

Read R-019 with that in mind:

> When a lab step is shown, the reader shall link to the step before it and the step after it, leaving out
> a link that the lab has no step for.

"Link to" sounds like a browser word. But what the rule constrains is a **decision**: for this step, which
steps are its neighbours, and when is there none? That decision is data, and a program can observe it:

```gherkin
@R-019 @ears-event-driven
Rule: When a lab step is shown, the reader shall link to the step before it and the step after it, leaving out a link that the lab has no step for.

  Scenario: The first step has no step before it
    Given a lab with the steps "Intro, Setup, Build"
    When the step "Intro" is shown
    Then it links back to "" and on to "Setup"
```

```ts
// tests/bdd/steps/reader/reader.steps.ts
When("the step {string} is shown", (_ctx, stepId: string) => {
  live = liveLab(lab, stepId);
});
Then("it links back to {string} and on to {string}", (_ctx, previous: string, next: string) => {
  expect([live!.previous?.title ?? "", live!.next?.title ?? ""]).toEqual([previous, next]);
});
```

The scenario reads like a person using a lab. The step calls one plain function. That is rung 5's method
in miniature, and it rests on the design rule from week 8: **a route decides nothing, and a component
decides nothing**. If the decision is in `lib/course`, a scenario can reach it.

## The method: split the rule into a decision and a display

Take any sentence about the interface and ask two questions.

1. **What is decided?** Which thing, which order, which message, whether at all. Put that in
   `lib/course` as a function from data to data. Prove it with a scenario and unit tests.
2. **What is displayed, and how is it operated?** Which element, which label, which key. That lives in a
   component. Prove it in a browser.

`REQUIREMENTS.md` has this as two rows of its "From pattern to layer" table:

| The sentence says | Put the code in |
| --- | --- |
| The reader shall ... about a course, a page, a URL or a 404 | `apps/reader/src/lib/course`, plain TypeScript, so a scenario and Stryker can reach it |
| The reader shall ... about what a learner sees or clicks | a component in `apps/reader/src/lib/ui-*`, its logic in `lib/course`, proved by a scenario over that logic and by `pnpm test:e2e` |

### Worked example 1: breadcrumbs

> R-021 | Ubiquitous | The reader shall show breadcrumbs from the course down to the page on screen,
> leaving out units and sides. | reader

- **Decided:** which pages are above this one, in what order, and that units and sides are skipped. That
  is `breadCrumbs(tree, lo)`.
- **Displayed:** a `nav` labelled "Breadcrumb", an ordered list, the last item marked `aria-current="page"`
  and not a link. That is `SecondaryNavigator.svelte`.

The scenario proves the decision on upstream's `tutors.json`:

```gherkin
Scenario: A note inside a unit
  Given upstream's tutors.json for the shared fixture, read as the course "sample"
  Then the breadcrumbs of "/note/sample/topic-01-basics/unit-1-intro/note-1-reading" are "Ladder Sample Course, Basics, Reading Guide"
```

The smoke test proves the display, and cites the requirement in its title so the audit can check the
citation:

```ts
// tests/e2e/smoke.e2e.ts
test("a learner clicks from the home page to a lab step (R-018, R-019, R-021)", async () => {
  ...
  expect(await page.locator("nav[aria-label=Breadcrumb] li").allInnerTexts())
    .toEqual(["Ladder Sample Course", "Practice", "Lab-01-First-Steps"]);
```

Two proofs of one sentence, each seeing what the other cannot.

### Worked example 2: a 404

> R-020 | Unwanted behaviour | If a URL names a course, a page or a lab step that the course does not hold,
> then the reader shall answer 404 with a message that names what is missing. | reader

- **Decided:** that it is missing, and what the message says. `requestLo` and `requestLab` return
  `{ notFound: "Not found: a talk at ..." }`.
- **Displayed:** an HTTP-style 404 page showing the message. `found.ts` and `+error.svelte`.

```gherkin
Scenario: An unknown course
  Given a host that serves upstream's tutors.json for the shared fixture as the course "found"
  When a learner opens "/course/nope"
  Then the reader answers not found with 'Not found: the course "nope"'
```

```ts
test("an unknown course answers 404, though the host serves its fallback page (R-016, R-020)", async () => {
  await page.goto(`${reader.origin}/course/nope`);
  await page.getByRole("heading", { name: "404" }).waitFor();
  expect(await page.locator("main").innerText()).toMatch(/Not found: the course "nope"/);
});
```

Notice the word "404" in the requirement. A scenario over `lib/course` cannot observe a status; it observes
the message. The number is only proved in the browser. A requirement may need both tiers to be wholly
proved, and it is worth knowing which words each tier covers.

## What a scenario over logic cannot see

Here is the honest limit of the method. Take R-019 again. Its scenarios are green. Now edit `Lab.svelte`
so that the right arrow key goes to the previous step:

```ts
const to = event.key === "ArrowRight" ? previous : event.key === "ArrowLeft" ? next : undefined;
```

`pnpm test` is still green: every scenario passes, because `liveLab` still knows the right neighbours. The
component used them the wrong way round. Only `pnpm test:e2e` fails, waiting for a heading that never
comes.

There is a subtler case, which the lab makes you live through. A function can be correct for every input
a scenario gives it and still be given the wrong input by a component. A value read from a rune is a
reactive proxy of the object that was stored; a function that looks that object up in a `Map` by identity
finds nothing. The scenario passes plain objects and is green. The browser shows the wrong title.

So the method has a rule attached: **when the sentence is about what a learner sees, the scenario is
necessary and not sufficient**. Something must look at the page.

## Upstream's answer: Rules that a browser proves

Upstream specifies its reader with both kinds of Rule, and keeps them apart by tag.

**Rules about the course as data** are bound by step files and run in Node, like rung 5's.
`tests/bdd/features/course/course-loading.feature`:

```gherkin
@rule-0001 @ears-event-driven
Rule: When a student opens a course, the reader shall load the course title, its topics and a route for every learning object.

  Scenario: Successfully load a course
    When the reader loads the course
    Then the course title should be "Web Development 101"
    And the course should have 3 topics
    And every learning object should be reachable by its route
```

and `course-navigation.feature`:

```gherkin
@rule-0007 @ears-event-driven
Rule: When a student follows a breadcrumb, the reader shall show the topic that the breadcrumb names with its learning objects.

  Scenario: Navigate back using breadcrumbs
    Given I am viewing the lab "CSS Layout"
    When I follow the breadcrumb "Styling"
    Then I should arrive at the topic "Styling"
    And the topic should list the learning objects "CSS Layout, CSS Reference"
```

Compare `@rule-0007` with R-021. Both are about breadcrumbs. Upstream's is event-driven and written from
the student's action ("follows a breadcrumb"); rung 5's is ubiquitous and written about what is always on
the page. Both are legitimate. The event-driven form tests the journey; the ubiquitous form is easier to
check exhaustively. When you write your own, choose the form whose trigger you can actually produce in a
test.

Notice also `Background:` in both upstream features: "Given the generator has published the course
`web-dev-101` ...". Upstream builds a course in the test. Rung 5 uses one fixed file, upstream's own
output for the shared fixture. Building the course in the scenario lets a scenario say "a course with two
labs"; a fixed oracle keeps the reader honest against the real contract. Your R-022 met the cost of the
fixed file: you could not prove "in reading order" with one lab.

**Rules about what a person sees** are tagged `@ui`, and no step file runs them. From
`guides/testing/EARS-METHODOLOGY.md`:

> A scenario that needs a browser, such as layout, focus order, colour or a dialog, cannot be driven from
> Node. It is a `@ui` Rule instead, proved by Playwright.

`tests/bdd/features/ui/reading.feature`:

```gherkin
@ui @reader
Feature: Reading labs and notes

  @rule-0035 @ears-event-driven
  Rule: When a student moves between lab steps by the pager, the step list, the arrow keys or browser history, the reader shall mark only the current step in the step list.

    Scenario: Step list follows the pager, links, keys and history
      When a student moves through a lab with "Next", a step link, the right arrow key and Back
      Then the step list marks the step shown each time
```

and its proof, `apps/reader/tests/e2e/reading.spec.ts`, is a Playwright test with **the same title**,
tagged with the Rule's id:

```ts
test("Step list follows the pager, links, keys and history", { tag: "@rule-0035" }, async ({ page }) => {
  await page.goto(lab);
  const current = sidebar.locator('.steps [aria-current="step"]');
  await expect(current).toHaveText("01 Objectives");
  await page.getByRole("link", { name: "Next → Text", exact: true }).click();
  await expect(current).toHaveText("02 Text");
  ...
  await page.keyboard.press("ArrowRight");
  await expect(current).toHaveText("05 Images");
```

That one test would have caught the swapped arrow key. The binding between the scenario and the test is
only a title and a tag, so upstream audits it. `pnpm test:ears:audit` reports `unproved-scenario` when a
`@ui` scenario has no test of that title and tag, and `orphan-ui-test` when a test cites a Rule that has no
such scenario. It is the closure check from week 6, drawn around a new pair of lists.

Some `@ui` Rules could not be written any other way. `@rule-0019`: "The reader shall lay out every page
without horizontal scrolling at viewport widths from 320 to 1440 pixels." There is no decision to move
into plain logic; the rule **is** the layout. And `@rule-0773`, for the static build rung 5 mirrors:
"... the reader shall show it without a request to /api, /actor, __data.json, /healthz, /version or
/metrics", proved by a test that listens to the page's network requests.

## Choosing, for your own rule

| If the sentence is about... | Specify it as | Prove it with |
| --- | --- | --- |
| which thing, which order, which message, whether at all | a Rule over `lib/course` | a scenario and unit tests; cite the id in a browser test if a learner sees the result |
| a key, a click, focus, a label, what is marked | a Rule whose decision is still in `lib/course` where there is one | the scenario for the decision **and** a browser test that performs the action |
| layout, colour, size, motion, a request the page makes | a rule only a browser can observe | a browser test; in rung 5 the smoke tier, upstream a `@ui` Rule |

Then check the sentence itself for the faults that are particular to interfaces:

- **A mechanism instead of a behaviour.** "The reader shall store the tree in a rune" is about code.
  "The reader shall show the course's title in the top bar of every course page" is about a student.
- **An unobservable response.** "The reader shall load quickly", "shall be easy to navigate". Ask: what
  would a test wait for? R-014 turns "quickly" into something countable: at most one fetch.
- **Two responses under one "shall".** Upstream's `@rule-0005` shows a lab "with its first step and its
  breadcrumb trail". Rung 5 has R-018 and R-021. When the breadcrumb breaks, only one of rung 5's goes
  red, and its name says what broke.
- **A trigger you cannot produce.** "When the student is confused ..." If neither a scenario nor Playwright
  can make the "When" happen, rewrite it.

## The assignment, read with this note

The assignment asks for a pager between learning objects, with the rule "specified first". Apply the
split before you write anything.

- **Decided:** what "reading order" is, and for a given page which pages are before and after it. Which
  kinds are stops? What happens at the ends? What about a page that is not a stop?
- **Displayed:** a `nav` with an accessible name, up to two links, each showing a title.

The grading test follows the same split: AC1 to AC4 and AC6 are about the requirement, the scenario and the
plain logic (and its mutation floor); AC5 places the component; AC7 opens a browser and pages through the
course by the navigation's accessible name.

## Lean: specification as pull

A requirement written first is a **pull signal**. It says who needs something and what "done" will look
like, before anyone builds. Without it, building is push: the feature exists because it could be built.
The closure audit then guards against the opposite waste, **inventory**: a requirement nobody proved, or a
test that proves nothing anyone asked for.

And a browser test is how you confirm the pull was satisfied **at the customer**, on the screen, not at an
internal handoff. A green scenario over logic is a part passing inspection inside the factory. The student
only ever sees the finished page.

## Which Assertion Ladder rungs guard these rules

| Rule | Level | Where it is kept |
| --- | --- | --- |
| Every requirement has a Rule with a scenario; every cited id exists (browser tests included) | L3/L4 | `pnpm test:ears:audit`, and `tests/suite-health/requirements.test.ts` in the gate |
| Every Rule in a feature is run by a step file | L3 | vitest-cucumber (`RuleNotCalledError`) |
| A requirement has one "shall", a known system, no vague word | L4 Explained | the audit's `shall-count`, `system-name`, `vague-language` findings |
| A reader rule's logic is plain TypeScript | L4 Explained | Plain logic and Framework rules |
| Do not move a rule into a component to escape its scenario | L2 Told | `AGENTS.md`, "Never to go green" |
| What a learner sees matches the rule | L3 Checked, outside the gate | `pnpm test:e2e` |
| Run the browser tier when you change what a learner sees | L2 Told | `AGENTS.md` |
| Upstream: every `@ui` scenario has a Playwright test of the same title and Rule id | L3/L4 | upstream's audit (`unproved-scenario`, `orphan-ui-test`), `ui-contract` in CI |

Two rows are only Told, and both are about the browser. That is rung 5's known soft spot, and rung 7 (a CI
that runs the browser tier on every change) is where the ladder hardens it.

## Check yourself

1. **(Remember)** Which three EARS patterns do rung 5's reader requirements use? Give one id for each.
2. **(Understand)** R-020 says "answer 404 with a message". Which word does the scenario prove, and which
   does only the browser test prove?
3. **(Understand)** How does upstream bind a `@ui` scenario to the test that proves it, and which two audit
   findings keep the binding closed?
4. **(Apply)** Split this sentence into what is decided and what is displayed, and say where each part's
   code goes: "The reader shall mark the current step in the lab's step list."
5. **(Apply)** Rewrite "The reader shall make it easy to get back to the course" as one EARS sentence a
   test could fail.
6. **(Analyse)** The arrow keys are swapped in `Lab.svelte`. List every check in rung 5 and say, for each,
   whether it goes red and why.
7. **(Analyse)** Compare upstream's `@rule-0007` with rung 5's R-021. What does each form make easy to
   test, and what does each leave unproved?
8. **(Evaluate)** Rung 5 proves reader rules by scenarios over logic plus one smoke test; upstream gives
   each visible behaviour its own `@ui` Rule and Playwright test. For a reader of rung 5's size, and for
   one of upstream's, which would you choose, and what would make you change your mind?
9. **(Evaluate)** "Run `pnpm test:e2e` when you change what a learner sees" is L2. Should it be in the
   gate? Give the cost and the benefit, and say where on the ladder you would put it.
