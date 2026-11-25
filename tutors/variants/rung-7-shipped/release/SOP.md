# Release SOP

The standard work for a release of this workspace: eight steps, an owner and a done-when for each, and
the rules that stop the line. It is upstream's release/SOP.md (three roles, twelve steps) cut down to what
a static site needs: no release candidates, no release harness, no deploy pin. Keep it open during a
release and work down the table.

## Roles

- **Captain** runs the release and owns the decision to tag.
- **Reviewer** is a second person who wrote none of the commits. Owns step 7.
- **Contributors** own their commit messages, their changelog lines and the evidence for their claims.

## The eight steps

| # | Step | Lean | Owner | Done when |
| --- | --- | --- | --- | --- |
| 1 | Commit with Conventional Commit messages | Standard work | Contributors | every commit since the last tag reads `type(scope): description`; `pnpm release:version --from v<last>` prints no warning |
| 2 | Derive the version and the changelog section | Standard work | Captain | `pnpm release:version --from v<last> --write` has set the version in every package.json and added the section to CHANGELOG.md |
| 3 | Curate the changelog | Gemba | Captain | the section says what a learner or contributor gets, in their words; Deprecated and Removed are added by hand |
| 4 | Check the claims | Jidoka | Contributors | `pnpm release:claims` passes: every promise in release/claims.yaml names a test that exists and runs |
| 5 | Check the SLOs | Jidoka | Captain | `pnpm release:slo` passes: every objective in release/slo.yaml is within budget |
| 6 | Build and smoke the container | Jidoka | Captain | `pnpm container:smoke` PASSED where Docker runs (CI's container job), or SKIPPED here with the reason recorded |
| 7 | Read the readiness A3 | Visual management | Reviewer | `pnpm release:readiness` wrote out/readiness.md; the Reviewer has read it and said "ready" or named the gap |
| 8 | Commit, gate and tag | Standard work | Captain | `pnpm test` green on the release commit; `git tag v<version>` on that commit, by a person, and pushed |

Steps 1 to 7 change nothing that cannot be undone. Step 8 is the Human Boundary: no script tags a release.

## Stop the line

- **A claim without evidence: stop.** Write the test or withdraw the promise. Never delete a claim to go green.
- **An SLO over budget: stop.** Find what grew. Raise a budget only in its own pull request that says why.
- **A container smoke FAILED: stop.** The message names the rule (root user, wrong revision, nothing served).
- **The A3 says HOLD: stop.** Each gap has a root cause line; ask why until the answer is a process or a tool.

## Deviations

A step skipped or done differently is a deviation. Write it in the release's pull request: the step, what
happened, why. A deviation is data about where this sheet does not fit the work, not blame.
