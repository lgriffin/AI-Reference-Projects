# release/

What a release of this workspace promises and the budgets it keeps. Upstream's `release/` holds the files
its release harness reads (tutors-mono-repo `release/README.md`); this one holds the same kinds of file,
for a static site.

| File | Purpose | Checked by |
| --- | --- | --- |
| `claims.yaml` | What a release promises, each promise tied to the tests that are its evidence. | `pnpm release:claims` (scripts/check-release-claims.ts) |
| `slo.yaml` | Service level objectives: budgets for build time and site size. | `pnpm release:slo` (scripts/check-slo.ts) |
| `SOP.md` | The standard work for a release: eight steps, an owner and a done-when for each. | `tests/release/release-files.test.ts` keeps its commands real |

## Writing a claim

```yaml
claims:
  - id: no-script
    promise: The site has no script, inline or linked, and no inline event handler.
    evidence:
      - "apps/cli/tests/release.test.ts#the site has no script: no <script> element and no inline event handler"
```

| Field | Meaning |
| --- | --- |
| `id` | kebab-case, unique in the file |
| `promise` | one sentence a learner or maintainer would understand |
| `evidence` | one or more test ids, `<file>#<test name>`: the file relative to this workspace, the exact name given to `test("...")` |

The check fails, with a message that says what to do, when a claim has no evidence, cites a file that
does not exist, a test name no test in that file has, or a test that is skipped; and on an unknown key, a
duplicate id or a missing promise. That is a **Closure Check**: every reference resolves, or the release
stops. Upstream's check does the same for Rule ids: a claim that cites a Rule no feature under
`tests/bdd/features` defines fails `pnpm check:release-claims`.

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

`measure` is one of `MEASURES` in `scripts/lib/slo.ts`; a new measure is code and a test. A budget is a
ratchet: lower it when there is headroom, raise it only on purpose, in its own pull request.

## Versions and the changelog

One SemVer version for what ships: the root `package.json` and every app's, in lockstep (upstream's root and
`apps/*` all carry 17.1.0 at the pinned commit; its JSR packages are versioned on their own). `CHANGELOG.md`
follows Keep a Changelog. `pnpm release:version` derives both from Conventional Commit messages.
