@release
Feature: A build says which release it is
  As a maintainer looking at a site, an image or a bug report
  I want to ask any build which release and which commit it is
  So that I can trace what a learner sees back to the source that made it

  The scenarios call run() from apps/cli/src/run.ts with a build identity handed in, as the unit tests do.
  The identity is read once, at the edge, in apps/cli/src/build-identity.ts. Upstream answers the same
  question at GET /version (packages/svelte/utils/runtime/src/version.ts) and keeps it out of every other
  file with scripts/checks/build-identity.ts.

  @R-037 @ears-event-driven
  Rule: When the command is given --version alone, the command shall print the release version and the commit it was built from, and write no file.

    Scenario: --version on its own
      Given a build of version "9.8.7" from commit "feedfacefeedfacefeedfacefeedfacefeedface"
      When the command is run with "--version" in an empty folder
      Then it exits with status 0
      And it printed "tutors-ladder 9.8.7 (commit feedfac, built unknown)"
      And the folder is still empty

    Scenario: --version beside a course folder is a usage error
      Given a build of version "9.8.7" from commit "feedfacefeedfacefeedfacefeedfacefeedface"
      When the command is run with "--version, course, out" in an empty folder
      Then it exits with status 2
      And the folder is still empty

  @R-038 @ears-ubiquitous
  Rule: The command shall write the build identity of a site into its version.json and into no other file.

    Scenario: A site names its release in one file
      Given a build of version "9.8.7" from commit "feedfacefeedfacefeedfacefeedfacefeedface"
      When the command builds the shared fixture
      Then version.json holds the version "9.8.7" and the revision "feedfacefeedfacefeedfacefeedfacefeedface"
      And no other file it wrote holds "9.8.7" or "feedfac"

    Scenario: The reader's contract carries no identity
      Given a build of version "9.8.7" from commit "feedfacefeedfacefeedfacefeedfacefeedface"
      When the command builds the shared fixture with "--json-only"
      Then it wrote tutors.json alone
