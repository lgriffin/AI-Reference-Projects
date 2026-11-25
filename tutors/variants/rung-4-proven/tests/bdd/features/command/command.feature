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
      And it printed "usage: node apps/cli/src/main.ts <courseFolder> <outDir>"

    Scenario: A course folder but no output folder
      When the command is run with "course"
      Then it exits with status 2
      And it printed "usage: node apps/cli/src/main.ts <courseFolder> <outDir>"
