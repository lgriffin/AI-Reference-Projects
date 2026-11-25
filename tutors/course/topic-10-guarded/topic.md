# Week 10: Guarded

Rung 6 of 7: Guarded

The first and only week on rung 6. Until now you trusted the course you built. This week the course author
is the adversary: a course is someone else's Markdown, read by your generator with your permissions and
opened in your students' browsers. You model the threats to a course platform, then meet the defences in
depth: escaping (rung 2), a URL allow-list, a Content Security Policy, path containment at the port,
identity as a port, a pure access policy that fails closed, and a checked supply chain. Every one arrives
the way rung 4 taught: as an EARS sentence first, usually "If ..., then the ... shall ...". You attack rung
5, specify and write a defence, watch rung 6 stop the rest, and judge which defence and which level of the
Assertion Ladder fits each risk. You finish rung 6 with its assignment (A6, raw HTML and locked content),
its exit criteria and its standard version.

## Where we are on the ladder

| Rung | Variant | This week |
| --- | --- | --- |
| 1 Seed to 5 Reader | `rung-1-seed` to `rung-5-reader` | weeks 1 to 9, done |
| **6 Guarded** | `variants/rung-6-guarded` | **you are here (week 10, the only week on rung 6)**: threats, XSS, CSP, containment, identity, RBAC, supply chain |
| 7 Shipped | `variants/rung-7-shipped` | week 11 |
| Summit | tutors-mono-repo | week 12 |

## Learning outcomes

By the end of this week you will be able to:

1. **(Analyse)** Model the threats to a course platform: name the assets, the actors and the trust
   boundaries, and place each attack on the boundary it crosses. (M7)
2. **(Apply)** Specify a security rule first, as an unwanted-behaviour EARS requirement with an adversarial
   Given/When/Then scenario, and see it fail before any defence exists. (M6, M2)
3. **(Analyse)** Tell escaping from sanitising and from containment, and diagnose from a failing test's
   message which wall an attack got past. (M7, M4)
4. **(Evaluate)** Judge which defence and which Assertion Ladder level fits a risk, from evidence: a corpus,
   a property, a contract, a browser test, a claim compared with its check. (M7)
5. **(Create)** Add two security features to rung 6, specified first, without weakening a rule or lifting
   the fence (the assignment). (M7, M6; A6)

## Lean focus: defects that escape; poka-yoke (mistake-proofing) as L5

A defect found at your desk costs minutes. A defect that escapes to a student's browser costs trust, and
in security it has a name: a vulnerability. This week is about stopping escapes. The Lean tool is
**poka-yoke**, mistake-proofing: shape the work so that the mistake cannot be made, or is caught the moment
it is made. On the Assertion Ladder that is L5, Prevented. You will meet three poka-yokes in the code (a
required `access` argument, a `SafeHtml` type, a policy the browser enforces) and use Five Whys on an XSS
escape to find where one was missing.

## Exit criteria for rung 6

You are ready for rung 7 when you can:

- draw the trust boundaries of Tutors and place four threats on them;
- write a security requirement as "If ..., then the ... shall ...", with a scenario whose Given is an attack;
- explain, with a payload, why escaping is not sanitising and why an allow-list beats a block-list;
- read a Content Security Policy and say what each directive stops, and what a meta tag cannot do;
- explain why containment lives in the adapter, and why the Honest Double must refuse the same paths;
- explain why the access policy is pure, why it fails closed, and why the reader's notice is a courtesy;
- pass the assignment's grading test (`32 passed`) with the gate green and the requirements committed first;
- compare your rung 6 with the standard version, and say what yours adds.

## This week

- Talks: "The threat model of a course platform" and "Defence in depth".
- Reading: "Threats and defence in depth" (the main note).
- Lab 10: specify first, attack rung 5, make it green, climb to rung 6, read outside the course, the last
  wall, a private course, break a defence and ask why five times, experiment upstream, compare with the
  standard version, build beyond, Kaizen.
- Assignment 6: raw HTML and locked content.
