# Week 6: Requirements with EARS

Rung 4 of 7: Proven

A new rung. Rung 4 is a copy of rung 3 that changes nothing for the user and everything about how the tools
are specified: every rule is one EARS sentence with an id in `REQUIREMENTS.md`, proved by Given/When/Then
scenarios, and held together by a closure audit that runs in the gate. This week teaches EARS properly, the
five patterns and the complex form, critiques sentences with the audit and by judgement, and formalises the
informal "Name the rule" sentences you wrote in weeks 1 to 5. Next week turns sentences into scenarios and
tests the tests.

## Where we are on the ladder

| Rung | Variant | This week |
| --- | --- | --- |
| 1 Seed to 3 Layers | `rung-1-seed`, `rung-2-lite`, `rung-3-layers` | weeks 1 to 5, done |
| **4 Proven** | `variants/rung-4-proven` | **you are here (week 6, the first of 2 weeks on rung 4)**: EARS, the closure audit, test-first |
| 5 Reader | `variants/rung-5-reader` | weeks 8 and 9 |
| 6 Guarded, 7 Shipped, Summit | | weeks 10 to 12 |

## Learning outcomes

By the end of this week you will be able to:

1. **(Understand)** Explain the five EARS patterns and the complex form, and say which situation each one
   fits, with an example from rung 4 or upstream for each. (M6)
2. **(Apply)** Write a requirement with an id, a pattern, one "shall", a known system and an observable
   response, and pass it through `pnpm test:ears:audit`. (M6)
3. **(Analyse)** Trace a requirement from `REQUIREMENTS.md` to its `Rule:`, its steps and its code, and
   diagnose each closure finding from its message. (M4, M6)
4. **(Evaluate)** Critique a requirement for the faults the audit catches (`shall-count`, `vague-language`,
   `system-name`, `ears-form`, `layer-mismatch`) and for the faults only a person can see (the wrong
   pattern, an unobservable response, a rule about the code rather than the product). (M6)
5. **(Create)** Formalise your informal "Name the rule" sentences from weeks 1 to 5 as EARS requirements. (M6)

## Lean focus: standard work for requirements

Rung 4's `AGENTS.md` turns "how we add behaviour" into standard work: take an id, write the sentence, copy
it as a Rule, see it fail, make it pass, hold the mutation floors. Standard work is the baseline improvement
starts from, so this week you also compare it with upstream's (`.claude/skills/ears-gherkin-dev/SKILL.md`)
and propose one improvement. The closure audit removes a waste you have met before: two lists (the
requirements and the tests) drifting apart.

## This week

- Talks: "Writing requirements with EARS" and "Closure and test-first".
- Reading: "Writing requirements with EARS", the anchor reference you will return to in weeks 7 to 11.
- Lab 6: start from rung 3's standard version, run rung 4, classify its requirements, break the closure,
  critique sentences, formalise your rules from weeks 1 to 5, compare upstream's audit, build beyond, Kaizen.
