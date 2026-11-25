# Release SOP

The standard work for a release of this workspace: ten steps, an owner and a done-when for each, and the
rules that stop the line. It is upstream's release/SOP.md (three roles, twelve steps) cut down to what a
static site and a static reader need: no release candidates, no release harness, no deploy pin. Keep it
open during a release and work down the table. `pnpm release:value-stream` runs steps 4 to 9 in order and
times each one.

## Roles

- **Captain** runs the release and owns the decision to tag.
- **Reviewer** is a second person who wrote none of the commits. Owns step 9.
- **Contributors** own their commit messages, their changelog lines and the evidence for their claims.

## The ten steps

| # | Step | Lean | Owner | Done when |
| --- | --- | --- | --- | --- |
| 1 | Commit with Conventional Commit messages | Standard work | Contributors | every commit since the last tag reads `type(scope): description`; `pnpm release:version --from v<last>` prints no warning |
| 2 | Derive the version and the changelog section | Standard work | Captain | `pnpm release:version --from v<last> --write` has set the version in every package.json and added the section to CHANGELOG.md |
| 3 | Curate the changelog | Gemba | Captain | the section says what a learner, a lecturer or a contributor gets, in their words; Deprecated and Removed are added by hand |
| 4 | Run the gate and the browser tier | Jidoka | Captain | `pnpm test` and `pnpm test:e2e` are green on the release commit |
| 5 | Judge the suite and the supply chain | Jidoka | Captain | `pnpm test:mutation` then `pnpm check:mutation-floors` hold every floor; `pnpm audit:supply-chain` is clean (`pnpm audit:online` where there is a network) |
| 6 | Check the claims | Jidoka | Contributors | `pnpm release:claims` passes: every promise in release/claims.yaml names evidence that exists and runs |
| 7 | Check the SLOs | Jidoka | Captain | `pnpm release:slo` passes: every objective in release/slo.yaml is within budget |
| 8 | Build and smoke the container | Jidoka | Captain | `pnpm container:smoke` PASSED where Docker runs (CI's container job), or SKIPPED here with the reason recorded |
| 9 | Read the readiness A3 and the value stream | Visual management | Reviewer | `pnpm release:readiness` wrote out/readiness.md and `pnpm release:value-stream` wrote out/value-stream.md; the Reviewer has read both and said "ready" or named the gap |
| 10 | Tag | Standard work | Captain | `git tag v<version>` on the commit the A3 names, by a person, and pushed |

Steps 1 to 9 change nothing that cannot be undone. Step 10 is the Human Boundary: no script tags a release.

## Stop the line

- **A claim without evidence: stop.** Write the test or withdraw the promise. Never delete a claim to go green.
- **An SLO over budget: stop.** Find what grew. Raise a budget only in its own pull request that says why.
- **A file below its mutation floor: stop.** A test stopped noticing a change. Find the survivor first.
- **A supply-chain finding: stop.** A dependency from anywhere but the registry, or an allowance out of date, is a person's decision.
- **A container smoke FAILED: stop.** The message names the rule (root user, wrong revision, nothing served).
- **The A3 says HOLD: stop.** Each gap has a root cause line; ask why until the answer is a process or a tool.

## Deviations

A step skipped or done differently is a deviation. Write it in the release's pull request: the step, what
happened, why. A deviation is data about where this sheet does not fit the work, not blame.

## Improving this sheet

This sheet is the baseline, not the ceiling. After each release, read out/value-stream.md: which step took
longest, which was done twice, where did the release wait? Change one thing here, in its own commit, and
measure the next release against this one.
