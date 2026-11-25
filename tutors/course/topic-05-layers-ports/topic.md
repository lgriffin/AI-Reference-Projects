# Week 5: Ports, adapters and the Honest Double

Rung 3 of 7: Layers

The second and last week on rung 3. Last week the arrows pointed inward; this week the platform stays at
the edge. The generator reads a course only through a port, two adapters implement it, one contract keeps
the test double honest, and architecture tests fail with the reason and the fix. You finish rung 3 with its
coding assignment, a new `@ladder/validate` package whose place in the layers you decide, and its exit
criteria.

## Where we are on the ladder

| Rung | Variant | This week |
| --- | --- | --- |
| 1 Seed, 2 Lite | `variants/rung-1-seed`, `rung-2-lite` | weeks 1 to 3, done |
| **3 Layers** | `variants/rung-3-layers` | **you are here (week 5, the last of 2 weeks on rung 3)**: ports, adapters, architecture tests |
| 4 Proven | `variants/rung-4-proven` | weeks 6 and 7 |
| 5 Reader to 7 Shipped, Summit | | weeks 8 to 12 |

## Learning outcomes

By the end of this week you will be able to:

1. **(Understand)** Explain how `FileSystemPort`, `MemoryFileSystem`, `NodeFileSystem` and the composition
   root in `apps/cli/src/run.ts` fit together, and why the port belongs to `gen`. (M5)
2. **(Analyse)** Diagnose a Port rule failure, and explain why the compiler (L5) and the architecture test
   (L4) each catch something the other cannot. (M4)
3. **(Analyse)** Use Five Whys to trace a red architecture or contract test to a root cause you can change. (M4, M8)
4. **(Evaluate)** Judge whether a test double is honest by running one contract against it and the real
   adapter, and decide where a new adapter belongs. (M5)
5. **(Create)** Add a workspace package with its own layer, reason and fence entry (the assignment). (M3, M5; A3)

## Lean focus: Five Whys on a red build

A red build is information, not an obstacle. This week you take a real red architecture test and ask "why?"
five times, until you reach something in the standard work (the gate, `AGENTS.md`, a rule's message) that
you can change. The talk shows a worked Five Whys; the lab has you do one on your own red build.

## Exit criteria for rung 3

You are ready for rung 4 when you can:

- run `pnpm test` in rung 3 and explain every line of its summary, skipped tests included;
- name the six architecture rules and say, for each, which Lean waste it removes;
- break the Port rule and read both walls, the compiler's and the test's;
- explain why one contract against two adapters keeps a double honest;
- pass the assignment's grading test (`# pass 7`) with the gate green, the Human Boundary changes in their
  own commit;
- compare your rung 3 with the standard version, and say what yours adds.

## This week

- Talks: "Ports and adapters" and "Architecture tests that teach".
- Reading: "Ports, adapters and honest doubles" (the main note).
- Lab 5: trace the port, break it, make the double lie, add an adapter, do a Five Whys, compare with the
  standard version, build beyond, Kaizen.
- Assignment 3: a validate package.
