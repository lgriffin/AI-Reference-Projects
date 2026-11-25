# Week 3: A static site, escaped by construction

Rung 2 of 7: Lite

Climb to rung 2. The same course, now a website you can open from disk: pages as data, a Markdown renderer
small enough to read whole, and every piece of course text escaped by default through a tagged template, so
that the safe form is the one you get without thinking. Two exhaustive switches make the compiler insist that
every kind has a card and a page. Rung 2 is a one-week rung, so this week also carries its coding assignment
(Markdown tables) and exit criteria.

## Where we are on the ladder

| Rung | Variant | This week |
| --- | --- | --- |
| 1 Seed | `variants/rung-1-seed` | done (weeks 1-2); this week starts from its standard version |
| **2 Lite** | `variants/rung-2-lite` | **you are here (week 3, the only week of rung 2)**: static site, Markdown, escaping; assignment |
| 3 Layers | `variants/rung-3-layers` | weeks 4-5 |
| 4 Proven to 7 Shipped, Summit | | weeks 6 to 12 |

## Learning outcomes

By the end of this week you will be able to:

1. **(Understand)** Explain how rung 2 turns a `Course` into a list of pages, and why only `main.ts` writes
   files.
2. **(Understand)** Explain why escaping must happen before any tag is added, and how the `html` tagged
   template makes the safe form the default.
3. **(Apply)** Generate, browse and move a static site, and compare its pages with upstream `tutors-lite`.
4. **(Analyse)** Break escaping and exhaustiveness on purpose, and say which level (L3, L4 or L5) catches
   each.
5. **(Create)** Teach the Markdown renderer GitHub Flavored Markdown tables, with every cell escaped (the rung 2
   assignment).

## Lean focus

Standard work, again, and defects caught early. Rung 2's `AGENTS.md` adds one line of standard work, "build
HTML only with the `html` template", and the gate turns it into checks so it need not be remembered. This
rung adds a second path in the Tutors value stream, from the generator straight to a student's screen with no
reader at all. The lab ends with a Kaizen step.

## This week

- Talks: "A static site" and "Escape by default".
- Reading: "Escaping by construction" (the main note) and "A Markdown subset".
- Lab 3: from rung 1's standard version to rung 2; generate, browse, compare, break; compare with rung 2's
  standard version.
- Assignment 2: Markdown tables. Exit criteria for rung 2 are in its last step.
