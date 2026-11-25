# Week 11: Shipped

Rung 7 of 7: Shipped

The first and only week on rung 7, the last rung before the Summit. Until now "done" meant the gate was
green on your machine. This week it means something you can hand to a stranger: a version with a name, a
changelog that says what they get, a list of promises each tied to the test that keeps it, budgets the
build must stay within, an image that runs as a user that is not root, and one page that says whether this
commit is ready to tag. Every one arrives the way rung 4 taught: as an EARS sentence first, usually "the
release shall report ... and exit with status 1". You cut a release of rung 7 from start to finish, break
each check to read what it teaches, measure the release as a value stream, and judge from an A3 whether to
tag. You finish rung 7 with its assignment (A7, every page within budget), its exit criteria and its
standard version.

## Where we are on the ladder

| Rung | Variant | This week |
| --- | --- | --- |
| 1 Seed to 6 Guarded | `rung-1-seed` to `rung-6-guarded` | weeks 1 to 10, done |
| **7 Shipped** | `variants/rung-7-shipped` | **you are here (week 11, the only week on rung 7)**: versions, changelogs, claims and evidence, SLOs, a container, CI, the readiness A3 |
| Summit | tutors-mono-repo | week 12 |

## Learning outcomes

By the end of this week you will be able to:

1. **(Apply)** Derive a SemVer version and a changelog section from Conventional Commits, and specify a
   release rule first, as an EARS requirement with a scenario seen to fail. (M6, M2)
2. **(Analyse)** Trace a release promise to its evidence, and diagnose from a failing check's message
   which promise lost its proof and why. (M7, M4)
3. **(Evaluate)** Judge whether a commit is ready to release, from evidence: claims, budgets, the mutation
   score, the supply-chain audit, a container smoke check, read together on an A3. (M7)
4. **(Evaluate)** Map the release value stream with measured times, find its largest waste, and choose
   the Assertion Ladder level each release rule deserves. (M8, M7)
5. **(Create)** Design one release claim from end to end: a requirement, a measure, a budget, a test and
   the promise that rests on them (the assignment). (M8, M7; A7)

## Lean focus: the value stream map of a release; lead time; the A3

A release is a small production line: commit, gate, claims, budgets, image, review, tag. A **value stream
map** draws that line and writes two numbers on every station: how long the work took (process time) and
how long the release waited before it (waiting). Their sum is the **lead time**: how long a fix takes to
reach a learner. This week you measure rung 7's release with `pnpm release:value-stream`, add the waits a
machine cannot see, and find where the time really goes. Then you read the **A3**, one page that holds the
whole problem: the value in the release, where each check stands, the gaps, their causes and what is left
to do. The A3 shows; it never decides. The checks decide, and a person tags.

## Exit criteria for rung 7

You are ready for the Summit when you can:

- say what a version number promises, and derive the next one from a list of commit messages;
- write a release requirement that says what the release reports and decides, never what a person does;
- explain the difference between a requirement, a claim and evidence, and what a Closure Check closes;
- break a claim, a budget and an image rule on purpose, and say which level of the Assertion Ladder caught each;
- explain why the time budget is judged outside the gate and the size budget inside it;
- map a release value stream with measured process times, and compute lead time and flow efficiency;
- read a readiness A3 in two minutes and say "ready" or name the gap;
- explain why no script tags a release, and where the fence enforces it;
- pass the assignment's grading test (`5 passed`) with every gate green and the requirement committed first;
- compare your rung 7 with the standard version, and say what yours adds.

## This week

- Talks: "What a release is" and "Claims, evidence and SLOs".
- Reading: "What a release promises: claims, evidence and SLOs" (the main note).
- Lab 11: specify first, climb to rung 7, version and changelog, claims and budgets, the container, map
  the value stream, the readiness A3 and the tag, experiment upstream, compare with the standard version,
  build beyond, Kaizen.
- Assignment 7: every page within budget.
