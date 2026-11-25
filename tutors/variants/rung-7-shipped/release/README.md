# release/

What a release of this workspace promises and the budgets it keeps. Upstream's `release/` holds the files
its release harness reads (tutors-mono-repo `release/README.md`); this one holds the same kinds of file,
for a static site and a static reader.

| File | Purpose | Checked by |
| --- | --- | --- |
| `claims.yaml` | What a release promises, each promise tied to the tests that are its evidence. | `pnpm release:claims` (scripts/check-release-claims.ts) |
| `slo.yaml` | Service level objectives: budgets for build time, site size and the reader's size. | `pnpm release:slo` (scripts/check-slo.ts) |
| `SOP.md` | The standard work for a release: ten steps, an owner and a done-when for each. | `tests/release/release-files.test.ts` keeps its commands real; `pnpm release:value-stream` times its steps |

## Writing a claim

```yaml
claims:
  - id: private-needs-flag
    promise: A private course is never built without --private, and every page of one built on purpose says so.
    requirements: [R-028, R-029]
    evidence:
      - "tests/bdd/features/command/guarded-command.feature#A course whose properties.yaml says auth: 1"
```

| Field | Meaning |
| --- | --- |
| `id` | kebab-case, unique in the file |
| `promise` | one sentence a learner, a lecturer or a maintainer would understand |
| `requirements` | optional: the ids in `REQUIREMENTS.md` the promise rests on |
| `evidence` | one or more test ids, `<file>#<name>`: a `*.test.ts` or `*.e2e.ts` file and the exact name given to `test("...")`, or a `*.feature` file and the exact title of a `Scenario` |

The check fails, with a message that says what to do, when a claim has no evidence, cites a file that
does not exist, a name no test in that file has, a test that is skipped or a grading test; when it rests
on a requirement `REQUIREMENTS.md` does not hold; and on an unknown key, a duplicate id or a missing
promise. That is a **Closure Check**: every reference resolves, or the release stops. Upstream's check
does the same for Rule ids: a claim that cites a Rule no feature under `tests/bdd/features` defines fails
`pnpm check:release-claims`.

A good claim is a promise somebody outside the team could hold you to, and its evidence is a test that
would fail if the promise broke. "The code is well tested" is neither. Ask of every claim: who relies on
this, and which test goes red on the day it stops being true?

**Upstream's claims mean something else.** There, `release/claims.yaml` lists the observable differences
from production a release intends (`artefact`, `scope`, `reason` or `rule`), and the release harness fails
on any difference no claim covers. A claim waives a failure, which is why its changes are owned by the
maintainers. Here a claim adds a promise, and the tests keep it.

## Writing an objective

```yaml
objectives:
  - id: site-size
    measure: site-bytes
    budget: 25000
    why: A learner on a slow connection downloads what we ship.
```

`measure` is one of `MEASURES` in `scripts/lib/slo.ts` (`build-ms`, `site-bytes`, `reader-bytes`); a new
measure is code and a test. A budget is a ratchet: lower it when there is headroom, raise it only on
purpose, in its own pull request. `pnpm release:slo` builds the reader first, because a budget nobody
measured is not a budget kept.

## Versions and the changelog

One SemVer version for what ships: the root `package.json` and every app's, in lockstep (upstream's root and
`apps/*` all carry 17.1.0 at the pinned commit; its JSR packages are versioned on their own). `CHANGELOG.md`
follows Keep a Changelog. `pnpm release:version` derives both from Conventional Commit messages (R-039).
