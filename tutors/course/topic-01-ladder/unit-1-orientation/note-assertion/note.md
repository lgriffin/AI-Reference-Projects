# Assertion levels in this course

How the course itself, and each rung after it, keeps its rules at a level from L0 to L5.

## The levels

| Level | Name | Teaching move | What the contributor experiences |
| --- | --- | --- | --- |
| L0 | Implied | hidden curriculum | nothing; it guesses |
| L1 | Shown | worked example | a pattern to imitate |
| L2 | Told | direct instruction | a rule it may follow, forget or misread |
| L3 | Checked | assessment | a red suite |
| L4 | Explained | formative feedback | a red suite whose message names the rule, the offender and the fix |
| L5 | Prevented | constraint | the wrong form does not compile |

The rule of thumb from the paper: for each rule, climb until its risk is covered, then stop. When a rule
reaches a checked level, take it out of the prose. Put every check behind one gate, and the checks themselves
behind a human boundary.

## The rules of this orientation topic

Orientation has no variant of its own. Its rules are about the course format you write in the first lab, and
about how you work with an agent from rung 1 onwards.

| Rule | Level | Where it is kept |
| --- | --- | --- |
| A folder that holds course material starts with its kind (`topic-`, `unit-`, `talk-`, `book-`, `note-`, `web-`) | L4 | upstream rule V002 in `packages/jsr/course-rules`, run by `tutors/scripts/check-course.sh`; its message names the folder and suggests a new name |
| Every topic, unit and side has a descriptor `.md` | L4 | upstream rule V003, same gate |
| A Marp deck starts with `marp: true` | L4 | upstream rule V015, same gate |
| A web link's `weburl` starts with `https://` | L4 | upstream rule V005, same gate |
| Topics are numbered in sequence | L3 | upstream rule V010, a warning |
| What a course looks like | L1 | `tutors-sdk/tutors-reference-course`, and this course |
| Ask the agent to read `AGENTS.md` and `RUNG.md` first | L2 | each variant's `AGENTS.md` |
| An agent does not build beyond your rung | L4 | each variant's `tests/rung-fence.test.ts` |
| Only a person changes the fence | Human Boundary | "Ask a human first" in each `AGENTS.md` |
| One command says the work is done | Single Gate | `check-course.sh` for a course; `npm test` or `pnpm test` for a variant |

## What each rung topic's note will show

From rung 1, every topic has a note like this one, mapping that rung's rules to their levels. Read it before
the lab. When an agent's change turns the gate red, the note tells you which level caught it and why that
level was chosen.

## Two patterns added for learners

| Pattern | Problem | Solution |
| --- | --- | --- |
| Rung Fence | How is a learner kept from receiving code above their rung? | An executable rule that lists what the rung may use, fails with the rung that introduces anything else, and is changed only by a person. |
| Rung Delta | How does a learner see what a rung adds? | Each variant's `RUNG.md` names the capability added, the expertise it needs and the upstream files it mirrors. |
