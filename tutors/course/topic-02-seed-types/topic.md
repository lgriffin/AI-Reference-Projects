# Week 2: Types that refuse mistakes

Rung 1 of 7: Seed

Go inside the Seed generator. Model the learning objects as a discriminated union, let an exhaustive
`switch` and `never` demand a case for every kind, and see where the type checker stops helping. Then prove
the generator right the only way that counts: by agreeing, field by field, with the `tutors.json` that the
upstream generator writes. This is the last week on rung 1, so it carries rung 1's coding assignment and exit
criteria.

## Where we are on the ladder

| Rung | Variant | This week |
| --- | --- | --- |
| **1 Seed** | `variants/rung-1-seed` | **you are here (week 2 of 2)**: unions, `never`, conformance; assignment |
| 2 Lite | `variants/rung-2-lite` | next week |
| 3 Layers to 7 Shipped, Summit | | weeks 4 to 12 |

## Learning outcomes

By the end of this week you will be able to:

1. **(Understand)** Explain how a discriminated union on `type` lets TypeScript narrow a learning object, and
   why `assertNever` makes a missing case a compile error.
2. **(Apply)** Build a course with rung 1 and with upstream, and compare the two outputs with a small tool.
3. **(Analyse)** Break the exhaustive `switch` and the prefix table on purpose, and say which Assertion Ladder
   level (L5 or L3) catches each and why.
4. **(Evaluate)** Judge an oracle test against hand-written expectations and snapshots, and say what each can
   and cannot catch.
5. **(Create)** Add the `github` kind to rung 1 so that it agrees with upstream (the rung 1 assignment).

## Lean focus

Standard work: the Single Gate (`npm test`) and the manifest (`AGENTS.md`) as the agreed way to do and
finish a change, and defects caught early, at L5 in the editor or L3 in the gate, instead of late in a
student's browser. This week rung 1 improves the generator step of the Tutors value stream. The lab ends with
a Kaizen step.

## This week

- Talks: "Unions and never" and "Agree with upstream".
- Reading: "Making mistakes unrepresentable".
- Lab 2: run, compare, break and rebuild the Seed generator.
- Assignment 1: the `github` kind. Exit criteria for rung 1 are in its last step.
