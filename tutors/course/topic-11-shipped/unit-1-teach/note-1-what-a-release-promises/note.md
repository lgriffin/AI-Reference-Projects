# What a release promises: claims, evidence and SLOs

How to think about a release as a set of promises, and how rung 7 ties each promise to proof. Worked from
`tutors/variants/rung-7-shipped` (paths without a prefix are relative to it), tutors-mono-repo at `2b96b69`
and tutors-release-harness at 1.63.0 (`5b80358`). Read it after the two talks and before the lab.

## Where we are on the ladder

This is the only week of rung 7 (Shipped), the last rung before the Summit. Rung 7 is a copy of rung 6
with nothing taken away: the workspace, the reader, the defences and the requirements R-001 to R-036 all
hold. It adds eight requirements, R-037 to R-044, a folder of release files (`release/`), six small
scripts (`scripts/`, with their judgements as pure functions in `scripts/lib`), a `Dockerfile`, a CI
template, and one dev dependency, `yaml`, to read the release files. Nothing a learner runs changed except
two things: the command answers `--version`, and every site carries a `version.json`.

## From "it works" to "we promise"

Rungs 1 to 6 answered a question the team asks: does it work, and is it safe? A release answers a
question somebody else asks: what am I getting, and what may I rely on? The audience has changed. A
lecturer who installs version 1.1.0 was not in the room when the tests ran. They have three things: a
version number, a changelog and whatever you are willing to promise.

So a release is a **commit with a name**, and each part of the name carries a promise.

**The version** says what kind of change this is. Semantic Versioning gives each number a meaning: a patch
fixes, a minor adds, a major breaks. Upstream's release strategy puts it sharply: "The version number is
the release's API, not a marketing decision." Rung 7 takes the decision away from mood altogether. Commit
messages follow Conventional Commits (`fix(cli): ...`, `feat(lite): ...`, `feat!: ...`), and
`pnpm release:version --from v1.0.0` derives the next number from them (R-039). A `fix` moves the patch, a
`feat` the minor, a breaking change the major. A message it cannot read gets a warning, because that
commit cannot move the version or reach the changelog.

**The changelog** says what the reader gets. The script drafts a section in the Keep a Changelog shape,
and a person curates it: step 3 of `release/SOP.md`. This matters more than it looks. The changelog is the
one place where the *value* of a release is written in a user's words, and the readiness page later quotes
it as its background. A release with nothing to say there has no value to deliver, whatever its tests say.

**The tag** says this will not change. Upstream: "Tags are immutable release artifacts." That is why
tagging is the one step no script in rung 7 may take.

**The build identity** ties a running thing back to the name. `pnpm start --version` prints
`tutors-ladder 1.1.0 (commit dab0743, built unknown)`, and every site carries the same facts in
`version.json`, the static twin of upstream's `GET /version`. R-038 adds "and into no other file": two
builds of one commit then differ in exactly one file, which is what makes a build comparable with another.

## Requirements, claims, evidence

By rung 6 you had two lists that close on each other. `REQUIREMENTS.md` says what the code shall do. The
features prove each sentence. `pnpm test:ears:audit` fails if either side has an orphan.

A release adds a third list, with a different reader. `release/claims.yaml` says what **this release
promises the people who use it**:

~~~yaml
- id: paths-contained
  promise: The generator reads nothing outside the course folder it was given.
  requirements: [R-024, R-027]
  evidence:
    - "tests/contract/file-system-port.contract.test.ts#R-024: refuses a path that climbs out or is absolute, for every method"
    - "tests/unit/cli/guarded-cli.test.ts#R-027: a course.md that is a link to a file outside the course is refused, and nothing is written"
~~~

Read the three fields as three different acts.

- The **promise** is one sentence that a lecturer or a maintainer could hold you to. It is written for
  them. "The code is well tested" is not a promise; "a private course is never built without `--private`"
  is.
- The **requirements** are the rules the promise rests on. Several requirements often stand behind one
  promise, and a requirement about internals may stand behind none. A claim is not a copy of a
  requirement: it is a selection, made for an audience.
- The **evidence** is one or more test ids, `<file>#<name>`: the exact name given to `test("...")`, or the
  exact title of a `Scenario`. Evidence is something that happened when code ran, on this commit.

Rung 7 has fourteen claims. Some come straight from last week's threat table: hostile content is
neutralised, paths are contained, a private course needs a flag, no page runs inline script. Some are
about the product: the generator's output conforms to upstream's `tutors.json`. Some are about the release
itself: the image runs as a user that is not root, every CI action is pinned, the site is within budget.

A useful test for any claim: **who relies on this, and which test goes red on the day it stops being
true?** If you cannot name the person, it is not a promise. If you cannot name the test, it is only told.

## What the Closure Check closes

A list of promises with test names beside them rots quickly. Somebody renames a test. Somebody skips one
"for now". Somebody adds a fine-sounding promise on the day of the release. `pnpm release:claims` is the
**Closure Check** that stops this (R-040): every reference in the file must resolve, or the command exits
with status 1. It reports a claim that:

- names no evidence ("A promise without a test is only told (L2), not checked (L3)");
- cites a file that does not exist, or a name no test in that file has (and suggests the nearest names);
- cites a test that is skipped: it never runs in the gate, so it proves nothing;
- cites a grading test under `tests/assignment`, which is skipped until a learner starts;
- rests on a requirement that `REQUIREMENTS.md` does not hold.

Each message names the claim, the reference and the fix. That is a Teaching Failure, level L4.

Be exact about what this buys. The check proves that the evidence **exists and runs**. The gate proves
that it **passes**. Neither proves that the test is any good: a test that asserts nothing would satisfy
both. Two more pieces of evidence speak to that.

**The mutation score** asks whether the tests would notice a change. Stryker alters the code, one small
mutation at a time, and counts how many alterations make a test fail. Rung 7 mutates the release logic
too. Its first run killed 91.40% of mutants overall, with `scripts/lib/claims.ts` at 80.54%: the claims
check itself was weakly tested. The survivors were table rows nobody had asserted. After tests for them,
the overall score is 95.67%, every file has a floor in `tests/mutation/mutation-floors.json`, and
`pnpm check:mutation-floors` fails if one slips.

**The supply-chain audit** (`pnpm audit:supply-chain`, from rung 6) says that what was tested is what
ships: registry sources only, a lockfile with integrity hashes, allowances in date. Rung 7 extends the
same idea to two more things that can move under a release without a commit: the base images, pinned by
digest in the `Dockerfile`, and the CI actions, pinned by commit SHA in the workflow template. A test
reads each pin.

## SLOs: a number written down

A service level objective is a promise with a number in it. Upstream's `release/slo.yaml` holds
availability and latency targets for each app over 28 days; `reader-availability` is `0.995`, which its
own comment translates as "about 3h22m of errors in 28 days". The release harness keeps floors of its own
(`slo/floors.yaml`) and judges a candidate against the stricter of the two, so that lowering a number in
the application's repository "never loosens a release".

A static site has no requests to fail, so rung 7's objectives are budgets on the build
(`release/slo.yaml`, R-041):

| Objective | Budget | Why it exists |
| --- | --- | --- |
| `build-time` | 2000 ms | a lecturer rebuilds many times an hour; a slow build is waste paid every time |
| `site-size` | 25000 bytes | a learner on a slow connection downloads what we ship |
| `reader-size` | 160000 bytes | script a phone must download and run before the first page shows |

Three habits make a budget worth having.

1. **It is measured, not estimated.** `pnpm release:slo` builds the fixture three times with the real
   command and keeps the slowest. If the reader is not built, the objective reads "was not judged" and
   the command exits 1: a budget nobody measured is not a budget kept.
2. **It is a ratchet.** Lower it when there is headroom. Raise it only in its own pull request that says
   what value the cost buys. Never raise it to make a release pass. The failure message says this every
   time.
3. **It is judged where it is stable.** Size is the same on every machine, so the size budget is also a
   test inside the gate. Time depends on the machine, so it is judged by `pnpm release:slo` and in CI. A
   gate that fails one run in twenty because a laptop was busy teaches people to re-run and stop reading.

## The image

The last piece of evidence is that the thing runs. The `Dockerfile` has two stages: Node builds the
fixture site, BusyBox serves it as user `10001`. `pnpm container:smoke` builds the image, starts it
read-only with every capability dropped, and checks five facts: the user is not root, the image's
`revision` label is this commit, `/version.json` answers this version, `/index.html` is served with its
Content Security Policy, and `/tutors.json` parses (R-043). Where Docker does not run, it reports
`SKIPPED` with the reason. It never reports a pass it did not earn.

## The same discipline upstream

Open three things in tutors-mono-repo and you will recognise all of this at full size.

- `release/` holds `claims.yaml`, `slo.yaml`, `SOP.md`, `deployed.json` and a README. Upstream's claims
  mean something different: each one names an **intended difference from production** (`artefact`,
  `scope`, and a `reason` or a `rule`). The harness fails on any observable difference no claim covers, so
  there a claim *waives* a failure, and its changes belong to the maintainers. Here a claim *adds* a
  promise. Both are Closure Checks: upstream's `scripts/checks/release-claims.ts` fails a claim that cites
  a Rule no feature defines.
- `guides/Release-Strategy.md` gives the five principles, the release candidate process (`vX.Y.Z-rc.N`)
  and its "Changelog Discipline". It also records two escapes, honestly: 17.0.0 was tagged and never
  pinned, and 17.1.0 reached production with no tag. Each ended in a workflow, not in a reminder.
- tutors-release-harness is the judge, kept in a separate repository so that the pull request being
  judged cannot weaken it. It runs production and the candidate side by side, diffs everything observable,
  and its Gate decides before any score is computed: "A FAIL is a FAIL at RCS 99."

Rung 7 has no production to compare with, so it keeps the discipline and leaves the machinery for week 12.

## Lean: the value stream of a release, lead time, and the A3

Since week 1 you have named wastes. This week you measure them.

A **value stream map** follows one unit of work down the line and records, at each station, the **process
time** (someone or something is working on it) and the **waiting time** before it (it sits). The sum over
the line is the **lead time**. The ratio of process time to lead time is the **flow efficiency**.

`pnpm release:value-stream` maps rung 7's release (R-044). It runs the steps of `release/SOP.md` that a
machine can run, in order, and times each:

| Step | SOP | Process time | Share |
| --- | --- | --- | --- |
| The Single Gate | 4 | 13.1 s | 38% |
| The reader in Chromium | 4 | 5.6 s | 16% |
| Supply-chain audit | 5 | 0.3 s | 1% |
| Release claims | 6 | 0.3 s | 1% |
| Service level objectives | 7 | 3.6 s | 10% |
| Build and smoke the image | 8 | 11.2 s | 32% |
| The readiness A3 | 9 | 0.7 s | 2% |

Process time 34.9 seconds, and with mutation testing added (`--with mutation`) about three minutes. That
is the whole of the work. But no real release takes three minutes, because a release waits: for a CI
runner, for a reviewer, for someone to decide. A script cannot see that, so a person tells it:
`--wait readiness=57600` says the release waited sixteen hours for its reviewer. The lead time becomes
sixteen hours and the flow efficiency falls below one percent. Upstream's SOP shows the same shape in its
own words: "Active time is about three hours; wall time is a day and a half because of the watch window."

Three lessons follow, and they hold far beyond this rung.

- **Improve the wait before the work.** Halving the gate saves six seconds. Halving the wait for review
  saves eight hours.
- **Look for work done twice.** The reader is built by the gate, again by the browser tier, and again by
  the SLO check. Each is defensible alone. Together they are overprocessing that only the map shows.
- **A failed step stops the line.** The map marks later steps "not run". That is jidoka: a defect is fixed
  where it is found, before more work is piled on top of it.

The **A3** is the other Lean tool of the week. It is named after a sheet of paper: the whole problem on
one page, so that nobody argues from memory. `pnpm release:readiness` writes one (R-042): the value in the
release, the current condition of every check with its source, the goal, each gap with a root-cause
prompt, countermeasures, the plan left, and follow-up. Its verdict is HOLD when a check has a gap and
READY only when none has; a check that did not run is "not run", never passed. The command always exits
0, on purpose. The checks decide and the page shows what they decided, as the harness's nightly A3 does:
"what the inputs cannot show is said to be not measured, never filled in." Then a person reads it and
tags, or names the gap.

## Which levels guard this week's rules

| Rule | Level | Where it is kept |
| --- | --- | --- |
| Where the release stands, and how long it takes | L1, Shown | `out/readiness.md`, `out/value-stream.md`: they show and never decide |
| Commit messages are Conventional; the changelog is curated, not pasted | L2, Told (partly L3) | `AGENTS.md`, `release/SOP.md` steps 1 and 3; `pnpm release:version` warns on a message it cannot read |
| Every claim names evidence that exists and runs, and requirements that exist | L3 and L4 | `pnpm release:claims` (a Closure Check); `tests/release/claims-file.test.ts` runs it on the real file in the gate |
| Every budget is kept, and was measured | L3 and L4 | `pnpm release:slo`; the size budget also in the gate (`tests/release/budgets.test.ts`) |
| One SemVer version everywhere; the changelog has its section | L3 and L4 | `tests/release/release-files.test.ts` |
| Base images pinned by digest; actions pinned by SHA; the image is not root | L3 and L4 | `tests/release/dockerfile.test.ts`, `tests/release/workflow.test.ts`, `pnpm container:smoke` |
| Build identity is read in one file; release scripts judge the workspace from outside | L3 and L4 | the Build identity rule and the Scripts rule in `tests/architecture/release.test.ts` |
| No script tags, pushes or publishes; no release tool is installed | L3 and L4, at a Human Boundary | `tests/rung-fence.test.ts` |
| A build identity always has all four fields | L5, Prevented | the `BuildIdentity` type; `buildIdentity()` fills `unknown` |
| A person decides to tag | Human Boundary | `release/SOP.md` step 10 |

Three choices deserve a reason. Claims are L3 and not L5 because a YAML file cannot fail to compile; a
Closure Check is the strongest thing available. The A3 is L1 on purpose: a page that could pass a release
would be argued with. And tagging stays with a person because it cannot be undone; the fence catches the
obvious script, and the SOP says the rest. L0, nothing at all, is where "we always run the smoke check
before a release" lived before this rung wrote it down.

## Self-check

1. **(Remember)** What do the three numbers of a SemVer version mean, and which commit types move each?
2. **(Understand)** Explain the difference between a requirement, a claim and evidence, using
   `private-needs-flag` in `release/claims.yaml`.
3. **(Understand)** Why does R-038 say the build identity is written "into no other file"?
4. **(Apply)** Three commits since `v2.3.1`: `fix(lite): ...`, `docs: ...`, `feat(cli)!: ...`. What is the
   next version? What would it be from `0.3.1`?
5. **(Analyse)** `pnpm release:claims` is clean and `pnpm test` is green. Name one way a promise can still
   be false, and which check narrows that gap.
6. **(Analyse)** A release has 3 minutes of process time and a lead time of 26 hours. What is its flow
   efficiency, and where would you look first?
7. **(Evaluate)** The time budget is judged outside the gate and the size budget inside it. Argue for or
   against moving the time budget in.
8. **(Evaluate)** Your A3 reads "READY, with one check not run". Would you tag? What would you need to
   know first?
9. **(Create)** Write a promise you would like rung 7 to make that no test can check today. What would
   have to exist before it could be a claim?
