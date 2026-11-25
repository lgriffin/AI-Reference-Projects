# Week 7: BDD, properties and mutation

Rung 4 of 7: Proven

The second and last week on rung 4. Last week you wrote sentences. This week each sentence becomes a Rule
with Given/When/Then scenarios, bound to real code with vitest-cucumber, and then you test the tests: a
property that must be able to fail, and mutation testing that measures whether the suite would notice a
change. The lab opens the way every lab will from now on, with "Specify first". You finish rung 4 with its
assignment, hidden topics, and its exit criteria.

## Where we are on the ladder

| Rung | Variant | This week |
| --- | --- | --- |
| 1 Seed to 3 Layers | | weeks 1 to 5, done |
| **4 Proven** | `variants/rung-4-proven` | **you are here (week 7, the last of 2 weeks on rung 4)**: BDD, properties, mutation |
| 5 Reader | `variants/rung-5-reader` | weeks 8 and 9, specified first |
| 6 Guarded, 7 Shipped, Summit | | weeks 10 to 12 |

## Learning outcomes

By the end of this week you will be able to:

1. **(Apply)** Specify first: add an EARS requirement with an id, a `Rule:` with a Given/When/Then scenario
   and its step bindings, and see it fail before any code exists. (M6)
2. **(Analyse)** Explain why a scenario proves a requirement but cannot pin its code under mutation, and
   choose the tier (unit, property, contract, conformance) that can. (M4, M6)
3. **(Apply)** Write a fast-check property with a negative fixture that proves it can fail. (M6)
4. **(Evaluate)** Judge a test suite by its mutation score: read survivors, tell a missing test from an
   equivalent mutant, and decide what to do about each. (M6)
5. **(Create)** Take a rule from upstream (Rule 0266, hidden topics) through every tier of rung 4 (the
   assignment). (M4, M6; A4)

## Lean focus: defects, rework and hidden defects

A green suite that would stay green if the code were wrong hides defects. A surviving mutant is exactly
that: a change to the code that no test noticed, a defect waiting to escape. Finding it now is cheap;
finding it in a release is rework. This week you meet survivors as hidden defects, and use Five Whys on one
to find why the test missed it.

## Exit criteria for rung 4

You are ready for rung 5 when you can:

- write a requirement in any of the five EARS patterns, and critique one written by someone else;
- take a new rule from sentence to scenario to code, with the scenario seen red first;
- explain why rung 4's mutation run leaves out the BDD steps, and what covers the code instead;
- write a property with a negative fixture, and read a fast-check counterexample;
- read a Stryker report, kill a survivor or argue it equivalent, and hold every floor;
- pass the assignment's grading test (`6 passed`) with the gate green and the requirement committed first;
- compare your rung 4 with the standard version, and say what yours adds.

## This week

- Talks: "From rule to scenario" and "Tests that test the tests".
- Reading: "From rule to scenario: BDD" (the main note) and "Tests that test the tests".
- Lab 7: specify first, see red, make green, kill the survivors, write a property, run upstream's steps,
  compare with the standard version, build beyond, Kaizen.
- Assignment 4: hidden topics.
