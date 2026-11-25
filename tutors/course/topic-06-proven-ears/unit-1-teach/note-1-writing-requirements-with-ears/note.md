# Writing requirements with EARS

The anchor reference for the rest of the module. From week 7 every lab opens with "Specify first": an EARS
requirement with an id and a scenario, written before any code. Come back to this note each time. It is
worked from `tutors/variants/rung-4-proven` (paths without a prefix are relative to it) and from
tutors-mono-repo at `2b96b69`, whose features hold 441 Rules across 85 files.

## Where we are on the ladder

Rung 4 (Proven) is a copy of rung 3 (Layers). Nothing changes for the user: the same command writes the same
8 pages. What changes is that every rule the tools keep is now written down once, as one sentence with an
id, in `REQUIREMENTS.md`, and proved by scenarios that a closure audit ties to it. This week is about the
sentence. Next week is about the scenario, and about testing the tests.

## Why write requirements at all

You have written rules informally for five weeks: "the generator shall leave a folder with no kind out of
`tutors.json`", "the site builder shall escape every piece of course text". They were useful because they
made you say exactly what the code does. Three things change when the rule is formal.

1. **A person can approve it before code exists.** A sentence is short enough to read in a meeting. Code is
   not. When you work with a coding agent, the sentence is the thing you say "yes" to.
2. **A test can be tied to it.** The sentence has an id. A scenario cites the id. A check fails when either
   side is missing. Nothing is specified without proof, and nothing is proved without a specification.
3. **It stops overproduction.** An agent that adds behaviour without a sentence fails the closure audit. The
   Rung Fence stops code from a later rung; the requirement table stops code nobody asked for.

## The anatomy of a requirement

**EARS**, the Easy Approach to Requirements Syntax, was introduced by Alistair Mavin and colleagues at
Rolls-Royce (IEEE International Requirements Engineering Conference, 2009). Its generic shape is:

> Where \<feature\>, while \<precondition\>, when \<trigger\>, the \<system\> shall \<response\>.

Only the system and the response are required. The other clauses are optional, and which ones you keep
gives the pattern. Four rules apply to every pattern:

- **One "shall".** Not "should", "must", "will" or "may". Two "shall"s are two requirements.
- **A named system.** The words before "shall" name a part of the product. "The system" is not a name.
- **An observable response.** Something a test could see: a file, a field, a page, an exit status, a
  message. Not "handle", "properly", "quickly", "appropriate".
- **A known place.** Each requirement names the layer that implements it, so the code has one home.

Rung 4 states every requirement as one row of a table:

```
| Id | Pattern | Requirement | Implemented in |
| R-004 | Event-driven | When a lab folder holds markdown files, the generator shall write one step per file, in file-name order, whose id is the file name between its first and last dot. | gen |
```

and its system names map to its layers:

| System name | Layer |
| --- | --- |
| the generator | `packages/gen` |
| the site | `packages/lite` |
| the command | `apps/cli` |

Upstream's system names are wider, because its product is: tutors (cross-cutting), the reader, the
catalogue, the live dashboard, the time dashboard and the data API
(`guides/testing/EARS-METHODOLOGY.md`).

## The five patterns, with worked examples

### 1. Ubiquitous: always true

> The \<system\> shall \<response\>.

No trigger and no state: the response holds whenever the system runs.

- **R-001**: The generator shall give each folder the learning-object kind named by the longest known
  prefix of its name.
- **R-008**: The site shall escape every piece of course text that it writes into a page.
- **Upstream `@rule-0263`** (`tests/bdd/features/generator/course-json.feature`): Tutors shall write a
  tutors.json that conforms to the tutors.json schema in @tutors/tutors-types.

*Common mistake:* writing "always" into the sentence ("The site shall always escape ..."). The pattern
already says always.

### 2. Event-driven: when something happens

> When \<trigger\>, the \<system\> shall \<response\>.

The trigger is an event or an input the system sees at a moment: a build, a command, a click, a file
present in a folder.

- **R-004**: When a lab folder holds markdown files, the generator shall write one step per file, in
  file-name order, whose id is the file name between its first and last dot.
- **R-010**: When a lab has more than one step, the site shall link each step page to the step before it and
  the step after it.
- **R-011**: When a talk holds a Marp deck, the site shall show each slide of the deck as its own section.
- **Upstream `@rule-0266`**: When properties.yaml lists a topic under ignore, tutors shall write that topic
  with hide set to true rather than leave it out. (Week 7's assignment brings this rule to rung 4.)

*Common mistake:* leaving out the comma after the trigger. The audit's `ears-form` check reads the comma as
the end of the trigger.

### 3. State-driven: for as long as a state lasts

> While \<state\>, the \<system\> shall \<response\>.

A state is something the system is **in**, for a while, and can leave: signed in, offline, focused, in
anonymous mode. Rung 4 has no state-driven requirement yet, because a command that runs once and exits has
little state. The reader (rung 5) will have plenty. Upstream examples:

- **`@rule-0279`** (`tests/bdd/features/shared/realtime-usage.feature`): While a student has disabled
  activity sharing, the reader shall not load the course online list.
- **`@rule-0252`** (`tests/bdd/features/shared/sign-in-session.feature`): While a visitor holds a
  session, the reader shall give every page the visitor's GitHub login, name, email address and avatar.

Upstream's audit adds a rule for this pattern, `dual-scenarios`: a state-driven Rule needs one scenario
tagged `@active` (the state holds) and one tagged `@inactive` (it does not). Rule 0279 has both: "Entering a
course with sharing disabled loads no online list" (`@active`) and "Enabling sharing loads the online list"
(`@inactive`). Without the second, a reader that never loaded the list at all would pass.

*Common mistake:* using "While" for a process rather than a state. "While a course is being built, the
generator shall report each folder it skips" passes rung 4's audit, but building is the whole job, not a
state the user can be in or out of. The rule is R-005, which is rightly unwanted behaviour (below).

### 4. Unwanted behaviour: if it goes wrong

> If \<condition\>, then the \<system\> shall \<response\>.

Errors, bad input, failures, things nobody wants. Writing them down means error handling is specified, not
improvised by whoever writes the code.

- **R-002**: If a course folder has no course.md, then the generator shall refuse to build it and say that
  course.md is missing.
- **R-005**: If a folder names a kind that this rung does not build, then the generator shall leave it out
  and report its path through the warn option.
- **R-012**: If the command is not given both a course folder and an output folder, then the command shall
  print its usage and exit with status 2.
- **Upstream `@rule-0535`** (`tests/bdd/features/shared/offline-resilience.feature`): If loading a course
  fails, then the reader shall keep serving the courses it already loaded, without a network request.

*Common mistake:* leaving out "then". "If the output folder cannot be written, the command shall exit with
status 1." fails rung 4's audit with `ears-form`: an Unwanted behaviour requirement reads "If \<condition\>,
then the \<system\> shall \<response\>."

### 5. Optional feature: where it is included

> Where \<feature\>, the \<system\> shall \<response\>.

A feature or a configuration that some installations have and some do not: a flag, an environment variable,
a course setting.

- **Upstream `@rule-0257`** (`tests/bdd/features/shared/sign-in-session.feature`): Where anonymous mode is
  on, the reader shall treat every visitor as signed out.
- **Upstream `@rule-0770`** (`tests/bdd/features/developer/static-reader.feature`): Where
  SVELTEKIT_ADAPTER is "static", Tutors shall build each app with SvelteKit's static adapter into a folder of
  files that answers every unknown path with the fallback page 200.html.
- **A rung 4 candidate**: Where the command is given `--json-only`, the command shall write tutors.json and
  no pages. (Rung 5's reader needs exactly this; it passes rung 4's audit as an Optional requirement.)

Like state-driven Rules, optional Rules upstream need an `@active` and an `@inactive` scenario: with the
feature and without it.

### The complex form: patterns combined

Sometimes one behaviour really needs a precondition **and** a trigger. EARS allows the clauses together, in
the order Where, While, When:

- **Upstream `@rule-0050`** (`tests/bdd/features/ui/learning-activities.feature`, tagged
  `@ears-state-driven`): While a slide deck has focus, the reader shall move to the next slide when the
  student presses the right arrow key.
- **Upstream `@rule-0704`** (`tests/bdd/features/instructor/course-validation-cli.feature`, tagged
  `@ears-optional`): Where strict checking is chosen for tutors validate, tutors shall exit with status 2
  when the course has warnings and no errors.

Notice two things. Upstream tags a complex Rule by its **opening** clause, and still allows one "shall".
And upstream places the trigger after the response here, which reads well in English but departs from
Mavin's strict order ("While a slide deck has focus, when the student presses the right arrow key, the
reader shall ..."). Both are readable; pick one style per repository and keep it. Rung 4's audit checks the
opening only, so it accepts either.

Use the complex form sparingly. Two conditions are often two requirements, and two requirements are easier
to prove.

Upstream's own counts are worth knowing: among its executable scenarios at `2b96b69`, `@ears-event-driven`
and `@ears-state-driven` dominate (20 and 21 in `EARS-METHODOLOGY.md`'s table), and `@ears-optional` is
rarest (2). Most behaviour is a response to something, or holds while something lasts.

## Choosing the pattern

Ask in this order:

1. Does it hold all the time the system runs? **Ubiquitous.**
2. Does only some configuration have it? **Optional**, "Where".
3. Does it hold for as long as a state lasts? **State-driven**, "While".
4. Is it about a failure, bad input or an outcome nobody wants? **Unwanted behaviour**, "If ..., then".
5. Is it a response to something that happens at a moment? **Event-driven**, "When".

Then test your choice against the scenario you would write. A state or a feature becomes a **Given** (with
an `@active` and an `@inactive` version). An event becomes a **When**. An unwanted condition becomes a When
that goes wrong, followed by a Then that shows the safe response. Upstream's methodology says the same:
"While", "Where" and "If" are EARS words, not Gherkin keywords, so the scenario uses Given and When for them.

## The words

Rung 4's audit (`scripts/checks/ears-audit.ts`) rejects these, and so should you:

| Check | Fires when | Example that fails |
| --- | --- | --- |
| `shall-count` | not exactly one "shall" | "The command shall write tutors.json and the command shall write the pages." (2) |
| `obligation-keyword` | should, must, will, may, might, could | "The command should write tutors.json beside the pages it writes." |
| `vague-language` | appropriate, correctly, handle, properly, quickly, some, various, ... | "The command shall handle tutors.json properly." |
| `system-name` | the words before "shall" are not a known system | "The system shall write tutors.json beside the pages it writes." |
| `ears-form` | the opening does not match the pattern | Event-driven, but it starts "The command shall ..." |
| `layer-mismatch` | the system's layer is not in "Implemented in" | about the command, implemented in `gen` |
| `unknown-pattern` | the pattern column is not one of the five | "Conditional" |

Every example in this table was run through the audit in a scratch copy of rung 4. The first one raises
three findings at once: `shall-count` (0), `obligation-keyword` and `system-name` (there is no "shall" for a
system to stand before).

## From sentence to proof: the closure

The sentence lives in three places, and must be the same in all of them:

1. a row of `REQUIREMENTS.md`, with its id, pattern and layer;
2. a `Rule:` in a feature under `tests/bdd/features/<layer>/`, tagged `@R-NNN @ears-<pattern>`, word for word;
3. a `Rule("...", ...)` binding in `tests/bdd/steps/<layer>/*.steps.ts`.

`pnpm test:ears:audit`, run in the gate by `tests/suite-health/requirements.test.ts`, checks the first two
and the citations:

- `unproved-requirement`: an id with no Rule that has a scenario;
- `unknown-id`: a Rule tagged with an id that is not in the table;
- `rule-title-drift`: a Rule whose title is not its sentence, word for word (it prints both);
- `ears-tag`: a Rule whose `@ears-*` tag is not its pattern;
- `no-scenarios`, `scenario-outside-rule`, `unbound-feature`;
- `unknown-citation`: a test title that cites an id that does not exist ("R-077: ...");
- `duplicate-id`, `retired-id`.

vitest-cucumber checks the third: change one word of a Rule's title and `pnpm test:bdd` fails with
`FeatureUknowRuleError: Rule: ... does not exist`. The audit guards the sentence; the runner guards the
binding.

This is a **Closure Check**: two lists that must agree, checked so they cannot drift. It removes a waste you
have met in every project that keeps requirements in one document and tests in another.

## Ids are identities

Take the next id with `pnpm test:ears:audit --next-id` (it prints `R-013` on a fresh rung 4). It is one past
the highest ever used, retired ids included. Retire an id by deleting its row and adding it to
`tests/bdd/retired-requirement-ids.txt`; the audit then refuses it for ever. Changing a requirement's wording
keeps its id; a different requirement gets a new one.

Upstream uses four-digit tags (`@rule-0266`), one counter for the whole repository and
`tests/bdd/ears-retired-rule-ids.txt`. Its `--next-id` printed `0786` at `2b96b69`. The reason it gives is
worth remembering: the release harness cites a Rule by id in a release claim, so "an explicit id never moves
with its Rule".

## Test-first, enforced

Add a requirement and nothing else, and the gate goes red:

```
unproved-requirement: REQUIREMENTS.md:24 R-013: no Rule tagged @R-013 has a scenario. Add one to the
feature for its layer in tests/bdd/features.
```

That is test-first, made mechanical. Rung 4's `AGENTS.md` writes the loop as standard work, "Behaviour
starts as a sentence": take an id; write the sentence; copy it as a Rule with a scenario and see it fail;
implement it in the layer the row names and see it pass; add a unit or property test so the mutation run can
see it. Changing or retiring a requirement is under "Ask a human first". Upstream's
`.claude/skills/ears-gherkin-dev/SKILL.md` has the same loop and the key instruction for an agent: "Show
the Rule to the human and wait for a yes: the requirement is the thing they are approving."

## Formalising weeks 1 to 5

You wrote one or two informal rules each week. Here they are, critiqued and formalised. In the lab you do
the same with your own.

**Week 1.** "When a folder's name starts with no learning-object kind, the generator shall leave the folder
and everything inside it out of `tutors.json`." Good EARS already: event-driven, one shall, the generator,
observable. Rung 4 holds the same rule in two parts: R-001 (the longest known prefix gives the kind) and the
scenario "A folder that names no kind is not content". The second half of week 1, "the validator shall
report an error", names a system rung 4 does not have. It belongs to the `@ladder/validate` package from
Assignment 3, with its own system name.

**Week 2.** "When a kind is added to the `Lo` union, the type checker shall report every `switch` ... that
does not handle it." The system is the **type checker**, not the product. That is not a product requirement;
it is an architecture rule kept at L5 by the compiler. Do not force it into `REQUIREMENTS.md`. Ask instead
what the user sees: R-009, "The site shall write one page for the course, each topic, each talk, each note
and each lab step", is the product rule that the type checker protects.

**Week 3.** "The site builder shall escape every piece of course text before it is written into a page."
Rename the system to rung 4's name, "the site", drop "before it is written" (not observable from outside)
and you have R-008 word for word. The second sentence, about `SafeHtml` in the gate, is again a rule about
the code: rung 4 keeps it as an architecture test, `tests/architecture/trusted-html.test.ts`.

**Week 4.** "The workspace shall let each package import only ..." and "If a source file imports ..., then
the architecture test shall fail ...". Both are about the code's structure. They stay as executable
architecture rules, with teaching failures, not as EARS requirements. The lesson: **EARS requirements are
about behaviour a customer can observe. Rules about the code are kept by architecture tests.** Both are
specifications; they live in different places.

**Week 5.** "The generator shall read a course only through the `FileSystemPort` it is given." Half product,
half structure. The observable half is R-007's conformance, "The generator shall write the same value as
upstream's tutors.json for every field this rung builds", proved on the disk through `NodeFileSystem`. The
structural half is the Port rule.

## Lean: standard work for requirements

Standard work is the current best way to do a job, written down, so everyone does it the same way and
improvement has a baseline. Rung 4 has three pieces of it for requirements:

- the **Single Gate**, `pnpm test`, which includes the closure audit, so "done" means "specified and proved";
- **`AGENTS.md`**, "Behaviour starts as a sentence", standard work for a contributor or an agent;
- **`REQUIREMENTS.md`'s own sections**, "The form of a requirement", "From pattern to layer" and "Adding a
  requirement", standard work for writing one.

Each removes a waste. The closure audit removes **defects** and **relearning** caused by two lists drifting.
Approving the sentence first removes **rework**: arguing about what the code should do after it is written.
The requirement table removes **extra features**: no id, no Rule, no merge. And standard work is where
Kaizen starts: in the lab you compare rung 4's loop with upstream's skill and propose one improvement.

## Which Assertion Ladder levels guard this week's rules

| Rule | Level | Where it is kept |
| --- | --- | --- |
| Every requirement is proved; every Rule and test cites a known id | L4 Explained | `tests/suite-health/requirements.test.ts`, `pnpm test:ears:audit` |
| A Rule's title is its requirement's sentence, word for word | L4 Explained | the audit, `rule-title-drift` |
| Each sentence has EARS form, a known system and the right layer | L4 Explained | the audit, `shall-count`, `ears-form`, `system-name`, `layer-mismatch` |
| A scenario's steps match its feature | L3 Checked | vitest-cucumber's own errors (they name the Rule, not the fix) |
| The pattern fits the meaning; the response is observable | L2 Told and a person | `REQUIREMENTS.md`, "The form of a requirement"; review |
| Behaviour starts as a sentence a person approves | Human Boundary | `AGENTS.md`, "Behaviour starts as a sentence" and "Ask a human first" |

## Self-check

1. **(Remember)** Write the shape of each of the five EARS patterns, and its rung 4 tag.
2. **(Remember)** What are rung 4's three system names, and the layer of each?
3. **(Understand)** Why does upstream require an `@active` and an `@inactive` scenario for a state-driven or
   optional Rule? What would a single scenario fail to prove?
4. **(Understand)** Explain the difference between `rule-title-drift` from the audit and
   `FeatureUknowRuleError` from vitest-cucumber.
5. **(Apply)** Write an Unwanted behaviour requirement for what the command should do when the output folder
   cannot be written. Give it an id, a pattern and a layer.
6. **(Analyse)** Classify upstream's `@rule-0704` and explain why it is tagged `@ears-optional` though it
   contains "when".
7. **(Evaluate)** "While a course is being built, the generator shall report each folder it skips through
   the warn option" passes the audit. Critique it, and rewrite it in the right pattern.
8. **(Evaluate)** Your week 4 rule is about imports between packages. Argue whether it belongs in
   `REQUIREMENTS.md` or in `tests/architecture/`, and why.
9. **(Create)** Write a state-driven requirement for rung 5's reader, with its `@active` and `@inactive`
   scenario titles.
