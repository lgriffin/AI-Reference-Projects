# Week 8: Routes, load and the contract

Rung 5 of 7: Reader

A new rung. Rung 5 is a copy of rung 4 with one new app beside the command line: an interactive reader in
SvelteKit and Svelte 5. The generator still writes `tutors.json`; the reader fetches that file in the browser
and draws whichever page the URL asks for. This week is about the half you cannot see: how a URL becomes a
folder, a folder becomes a `load` function, and a `load` becomes one lookup in a tree made from
`tutors.json`. Because testing arrived at rung 4, the reader was specified before it was built (R-014 to
R-021), and you do the same: you write the requirement and the scenario for a new route, watch them fail,
follow an existing URL through the code, and only then build yours. Next week is the half you can see:
runes, components and browser tests.

## Where we are on the ladder

| Rung | Variant | This week |
| --- | --- | --- |
| 1 Seed to 4 Proven | `rung-1-seed` to `rung-4-proven` | weeks 1 to 7, done |
| **5 Reader** | `variants/rung-5-reader` | **you are here (week 8, the first of 2 weeks on rung 5)**: routing, load, `tutors.json` as the contract |
| 6 Guarded | `variants/rung-6-guarded` | week 10 |
| 7 Shipped, Summit | | weeks 11 and 12 |

## Learning outcomes

By the end of this week you will be able to:

1. **(Understand)** Explain why `tutors.json` is the contract between the generator and the reader, and what
   the reader adds to the file before it shows a page (the course id, an index, parents). *Module outcome M1.*
2. **(Apply)** Specify a reader route first: an EARS requirement with an id, a `Rule:` with a scenario, a red
   run, then the route, its `load` and its logic. *M6, M3.*
3. **(Analyse)** Trace a URL from its route folder through `+page.ts`, the course service and the decorated
   tree to the component, in rung 5 and in tutors-mono-repo. *M1, M4.*
4. **(Analyse)** Diagnose a Loader rule, Framework rule, Layering rule or Rung Fence failure from its
   message, and say why the reader keeps that rule. *M2.*
5. **(Evaluate)** Judge whether a reader feature is pulled by a student's need or pushed by what is easy to
   build, and whether its rule belongs to a scenario or to a browser test. *M6.*

## Lean focus: value to the student reader; pull, not push

Until now the customer was the lecturer or the contributor. The reader's customer is the **student**, and
the value is plain: the right page, quickly, from any link. Every requirement from R-014 to R-021 can be
read as a waste removed for that student: waiting (one fetch, R-014), a dead end (a 404 that names what is
missing, R-020), getting lost (breadcrumbs, R-021). Features are **pulled**: you build a route because a
reader needs to get somewhere, with a requirement that says so, and you stop there. A route nobody can reach
is inventory. The Rung Fence is the other half of pull: it refuses what no requirement asked for yet
(server code, storage, a styling framework).

## This week

- Talks: "From static pages to an app" and "The upstream reader's routes".
- Reading: "tutors.json: the contract" and "Routing and load in SvelteKit".
- Lab 8: start from rung 4's standard version, specify a wall route first (R-022), read the contract, follow
  a URL, follow a URL to a 404, build your route, break three rules, find the same flow upstream, build
  beyond, Kaizen.

There is no assignment this week. Rung 5's assignment (A5) and exit criteria are in week 9.
