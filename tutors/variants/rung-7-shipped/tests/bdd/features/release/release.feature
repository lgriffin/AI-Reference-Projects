@release
Feature: A release is judged from evidence
  As the captain of a release, and the reviewer beside them
  I want every promise, budget and check of a release judged by a command that says what it found
  So that "is it ready?" is answered by evidence I can read, and the tag is the only decision left to me

  The scenarios call the pure functions behind the release commands, in scripts/lib, and the commands'
  own main functions where an exit status is the rule. Upstream keeps the same files and checks:
  release/claims.yaml with scripts/checks/release-claims.ts, release/slo.yaml with scripts/checks/slo.ts,
  scripts/checks/container-smoke.ts, and the readiness A3 and value stream of tutors-release-harness
  (src/a3, docs/lean.md).

  @R-039 @ears-ubiquitous
  Rule: The release shall take its next version from the largest change its Conventional Commits name: major for a breaking change, minor for a feat, patch for a fix or a perf.

    Scenario: A feature among fixes is a minor release
      Given the commits "fix(lite): escape a title; feat(cli): add --version; docs: explain the SOP"
      When the release derives the version after "1.4.2"
      Then the next version is "1.5.0"

    Scenario: Only fixes and a perf make a patch release
      Given the commits "fix: keep lab step order stable; perf(gen): read each folder once"
      When the release derives the version after "1.4.2"
      Then the next version is "1.4.3"

    Scenario: One breaking change outranks everything
      Given the commits "feat(model): add the video kind; refactor(gen)!: list returns names only"
      When the release derives the version after "1.4.2"
      Then the next version is "2.0.0"

    Scenario: Chores release nothing
      Given the commits "chore: bump typescript; test(lite): one more case; Update stuff"
      When the release derives the version after "1.4.2"
      Then the next version is "1.4.2"

  @R-040 @ears-unwanted
  Rule: If a release claim names no evidence, or names evidence that is not a test or a scenario that exists and runs, then the release shall report the claim and exit with status 1.

    Scenario: The claims of this release all have evidence
      When the release checks its own claims
      Then it exits with status 0

    Scenario: A promise with no evidence
      Given a claims file whose claim "fast-pages" has the evidence ""
      When the release checks that file
      Then it exits with status 1
      And it reported 'Claim "fast-pages" promises "Every page loads at once." but names no evidence'

    Scenario: Evidence that names a test nobody wrote
      Given a claims file whose claim "fast-pages" has the evidence "tests/unit/lite/csp.test.ts#every page loads at once"
      When the release checks that file
      Then it exits with status 1
      And it reported "no test there has that name"

    Scenario: A scenario is evidence too
      Given a claims file whose claim "private-needs-flag" has the evidence "tests/bdd/features/command/guarded-command.feature#A course whose properties.yaml says auth: 1"
      When the release checks that file
      Then it exits with status 0

    Scenario: A grading test is never evidence
      Given a claims file whose claim "graded" has the evidence "tests/assignment/shipped.grading.test.ts#AC1: largest-page-bytes measures the largest HTML page, not the largest file"
      When the release checks that file
      Then it exits with status 1
      And it reported "Grading tests under tests/assignment skip"

  @R-041 @ears-unwanted
  Rule: If a measure of the build is over the budget of its objective, or was not measured, then the release shall report the objective and exit with status 1.

    Scenario: A site within its budget
      Given the objective "site-size" with a budget of 25000 for "site-bytes"
      And a build whose site is 18000 bytes
      When the release judges the build
      Then it exits with status 0

    Scenario: A site over its budget
      Given the objective "site-size" with a budget of 16000 for "site-bytes"
      And a build whose site is 20000 bytes
      When the release judges the build
      Then it exits with status 1
      And it reported 'SLO "site-size" exceeded'
      And it also reported "Never raise a budget to make a release pass"

    Scenario: A reader nobody built
      Given the objective "reader-size" with a budget of 160000 for "reader-bytes"
      And a build whose site is 18000 bytes
      When the release judges the build
      Then it exits with status 1
      And it reported 'SLO "reader-size" was not judged'

  @R-042 @ears-ubiquitous
  Rule: The release shall write a readiness page whose verdict is HOLD when a check has a gap, and READY only when no check has one.

    Scenario: Every check is clean
      Given a release whose every check passed
      When the release writes its readiness page
      Then the verdict is "READY"

    Scenario: One claim has lost its evidence
      Given a release whose every check passed
      But one claim has a problem
      When the release writes its readiness page
      Then the verdict is "HOLD"
      And the page lists the gap under "Claims"

    Scenario: A check that did not run is not a pass
      Given a release whose every check passed
      But the container smoke check was skipped
      When the release writes its readiness page
      Then the verdict is "READY, with one check not run"

  @R-043 @ears-unwanted
  Rule: If the image runs as root, or its revision is not the commit it was built from, then the release shall fail the container smoke check and say which.

    Scenario: An image that runs as root
      Given an image whose user is "0:0" and whose revision is "abc1234"
      When the release inspects it for the commit "abc1234"
      Then the smoke check fails with "A server runs as a user that is not root"

    Scenario: An image with no user at all
      Given an image whose user is "" and whose revision is "abc1234"
      When the release inspects it for the commit "abc1234"
      Then the smoke check fails with 'the image runs as "root"'

    Scenario: An image built from another commit
      Given an image whose user is "10001:10001" and whose revision is "0ld5ha0"
      When the release inspects it for the commit "abc1234"
      Then the smoke check fails with 'revision label is "0ld5ha0", not the commit abc1234'

    Scenario: The image this rung builds
      Given an image whose user is "10001:10001" and whose revision is "abc1234"
      When the release inspects it for the commit "abc1234"
      Then the smoke check passes

  @R-044 @ears-event-driven
  Rule: When the release measures its value stream, the release shall report the process time of each step and the lead time, and run no step after one that failed.

    Scenario: Process time, waiting and lead time
      Given the steps "gate" taking 20 seconds and "claims" taking 10 seconds
      And the release waited 30 seconds before "claims"
      When the release measures its value stream
      Then the process time is 30 seconds and the lead time is 60 seconds
      And the flow efficiency is 50 percent
      And the map has a row for "gate" and a row for "claims"

    Scenario: A failed step stops the line
      Given the steps "gate" taking 20 seconds and "claims" taking 10 seconds
      And the step "gate" fails
      When the release measures its value stream
      Then the step "claims" is "not run"
      And the lead time is 20 seconds
