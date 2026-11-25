# Week 4: Workspaces and dependency direction

Rung 3 of 7: Layers

The rung 2 tools, unchanged for the user, rebuilt as a pnpm workspace of four packages whose arrows all point
inward. This week is about structure: what a workspace and a package are, which code may import which, and
how a rule about direction becomes a test whose failure teaches. Next week stays on rung 3 and goes to its
edges: ports, adapters and the Honest Double.

## Where we are on the ladder

| Rung | Variant | This week |
| --- | --- | --- |
| 1 Seed, 2 Lite | `variants/rung-1-seed`, `rung-2-lite` | weeks 1 to 3, done |
| **3 Layers** | `variants/rung-3-layers` | **you are here (week 4 of 2 weeks on rung 3)**: workspaces, packages, direction |
| 4 Proven | `variants/rung-4-proven` | weeks 6 and 7 |
| 5 Reader to 7 Shipped, Summit | | weeks 8 to 12 |

## Learning outcomes

By the end of this week you will be able to:

1. **(Understand)** Explain what `pnpm-workspace.yaml`, a package's `exports` and a `workspace:*` dependency
   each do, using rung 3's own files.
2. **(Apply)** Install and run the rung 3 workspace, and trace how `@ladder/gen` resolves `@ladder/model`.
3. **(Analyse)** Diagnose a Layering, Package boundary, Model or Closure failure from its message, and choose
   the fix that respects the layer's reason rather than the quickest green.
4. **(Analyse)** Compare rung 3's four layers with upstream's `ARCHITECTURE.md` and `.dependency-cruiser.cjs`.
5. **(Evaluate)** Write the dependency-direction rule as an informal EARS sentence and judge which Assertion
   Ladder level guards it.

## Lean focus: the waste of handoffs and coupling

When `lite` reaches into `gen`, every change to `gen` becomes a handoff to whoever owns `lite`: a second
person must relearn, re-test and wait. Coupling is how that waste gets built in. Rung 3's layering rules
keep the arrows pointing inward, so a change stays inside one package and nobody waits. The reading note
names where the waste would appear and which rule removes it.

## This week

- Talks: "Workspaces and direction" and "Direction as a rule".
- Reading: "Dependency direction" (the main note).
- Lab 4: install the workspace, walk it, break its direction rules on purpose, name the rule, compare with
  upstream, build beyond, and finish with a Kaizen step.
