@developer
Feature: The command line
  As a lecturer at a terminal
  I want the command to tell me how to use it when I get it wrong
  So that I am never left guessing why nothing was written

  The scenarios call run() from apps/cli/src/run.ts, the function main.ts runs, and read what it writes to
  standard error. Upstream's command is packages/jsr/tutors-lite/src/run.ts.

  @R-012 @ears-unwanted
  Rule: If the command is not given both a course folder and an output folder, then the command shall print its usage and exit with status 2.

    Scenario: No arguments at all
      When the command is run with ""
      Then it exits with status 2
      And it printed "usage: node apps/cli/src/main.ts [--json-only] [--private] <courseFolder> <outDir>"

    Scenario: A course folder but no output folder
      When the command is run with "course"
      Then it exits with status 2
      And it printed "usage: node apps/cli/src/main.ts [--json-only] [--private] <courseFolder> <outDir>"

  @R-013 @ears-event-driven
  Rule: When the command is given --json-only, the command shall write tutors.json and no pages.

    Scenario: The reader's course is the contract alone
      When the command is run with --json-only on the shared fixture
      Then it exits with status 0
      And the output folder holds only "tutors.json"
      And the tutors.json it wrote is the course "ladder-sample-course"

    Scenario: The flag may come after the folders
      When the command is run on the shared fixture with --json-only last
      Then it exits with status 0
      And the output folder holds only "tutors.json"
