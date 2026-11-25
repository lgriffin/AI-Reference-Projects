# Week 9: Runes, components and browser tests

Rung 5 of 7: Reader

The second and last week on rung 5. Last week a URL became a `load` and a lookup. This week the result
becomes something a student sees: Svelte 5 components fed by runes, arranged in three layers that mirror
upstream's `ui-primitives`, `ui-navigators` and `ui-components`, and proved in a real browser with
Playwright. The week's hard question is about specification, not syntax: when a rule is about what a
person sees, where should it live, and what can prove it? You specify a small behaviour first, watch the
scenario pass while the browser is still wrong, and learn why. You finish rung 5 with its coding
assignment (A5, a next and previous navigator), its exit criteria, and its standard version.

## Where we are on the ladder

| Rung | Variant | This week |
| --- | --- | --- |
| 1 Seed to 4 Proven | `rung-1-seed` to `rung-4-proven` | weeks 1 to 7, done |
| **5 Reader** | `variants/rung-5-reader` | **you are here (week 9, the last of 2 weeks on rung 5)**: runes, components, layers, browser tests |
| 6 Guarded | `variants/rung-6-guarded` | week 10 |
| 7 Shipped, Summit | | weeks 11 and 12 |

## Learning outcomes

By the end of this week you will be able to:

1. **(Understand)** Explain `$props`, `$state`, `$derived`, snippets and a shared rune behind `.value`, and
   how the reader's three UI layers depend on each other and on upstream's. *Module outcome M3.*
2. **(Apply)** Specify a user-interface behaviour first in EARS and Given/When/Then, move its rule into
   plain logic, and prove it twice: by a scenario and by a browser test that cites the requirement.
   *M6, M3.*
3. **(Analyse)** Diagnose which check catches a given change to the reader (`svelte-check`, an architecture
   rule, a scenario, a mutation, or only the browser tier), and explain a failure that a scenario cannot
   see. *M4, M6.*
4. **(Evaluate)** Judge, for a rule about what a student sees, which tier should prove it and how far up
   the Assertion Ladder it should climb; judge the reader's suite by closure and by mutation score against
   its floors. *M6.*
5. **(Create)** Design and build a navigator for the reader, specified first, layered correctly and held to
   a mutation floor (Assignment A5). *M3, M6.*

## Lean focus: value to the student reader; pull, not push

Last week's question was "who asked for this?". This week's is "did the student actually get it?". A
scenario over plain logic can be green while the page in front of the student is wrong: that is a
**defect that escapes** to the customer, the most expensive kind. The browser tier exists to catch it
before the student does, and you will see it do so. The second idea is **standard work as a baseline**:
at the end of the week you download rung 5's standard version, run its gate and compare it with your own
reader. Every difference is either a feature somebody pulled, an improvement from a Kaizen step, or drift.

## Exit criteria for rung 5

You are ready for rung 6 when you can:

- run `pnpm test` and `pnpm test:e2e` in rung 5 and explain every line of both summaries;
- follow any reader URL from its route folder to the component that draws it, and to its 404;
- say, for each of R-014 to R-021, whether a scenario, a browser test or both prove it, and why;
- explain why a rune's `.value` is not the object you put in, and what that means for a `Map` keyed by
  objects;
- break the Raw HTML rule and a layering rule, and read both messages;
- pass the assignment's grading tests (`pnpm test:assignment`: 6 passed, then 1 passed) with the gate
  green and every mutation floor held;
- compare your rung 5 with the standard version, and say what yours adds.

## This week

- Talks: "Runes and components" and "Layers and browser tests".
- Reading: "Runes and component layering" and "Specifying a user interface with EARS and BDD".
- Lab 9: specify a page title first (R-023), see runes at work, trace and break the layers, make the title
  green and find out why the browser disagrees, write browser tests, judge the suite by mutation, look
  upstream, compare with the standard version, build beyond, Kaizen.
- Assignment 5 (A5): a next and previous navigator.
- Rung 5: the standard version (the zip of this rung's completed code).
