@security
Feature: The command refuses to publish what it should not
  As a lecturer building a course at a terminal
  I want the command to stop, and say why, before it writes a file it should not
  So that I never publish my own files, or a private course, by accident

  The scenarios call run() from apps/cli/src/run.ts on course folders on the disk: the hostile course and
  the private course in tests/fixtures, and a copy with a symbolic link. A static site has no sign-in, so
  the command asks the policy (@ladder/rbac) about an anonymous reader. Upstream's reader turns such a
  reader away in packages/svelte/connect/src/services/connect.svelte.ts (turnsAway).

  @R-027 @ears-unwanted
  Rule: If a path leaves the course folder while a course is built, then the command shall write nothing and exit with status 1.

    Scenario: A course.md that is a symbolic link to a file outside the course
      Given a copy of the hostile course whose course.md is a link to a file outside it
      When the command builds it
      Then it exits with status 1
      And it printed 'refused to read "course.md": a link leads outside the course folder'
      And the output folder was not made

  @R-028 @ears-unwanted
  Rule: If a course is private and the command is not given --private, then the command shall write nothing, say that the course is private and exit with status 1.

    Scenario: A course whose properties.yaml says auth: 1
      Given the private course
      When the command builds it
      Then it exits with status 1
      And it printed "is a private course (properties.yaml says auth: 1)"
      And the output folder was not made

    Scenario: --json-only is no way round the policy
      Given the private course
      When the command builds it with "--json-only"
      Then it exits with status 1
      And the output folder was not made

  @R-029 @ears-event-driven
  Rule: When the command is given --private for a private course, the command shall write every page with a private notice and a noindex mark.

    Scenario: A private course built on purpose
      Given the private course
      When the command builds it with "--private"
      Then it exits with status 0
      And every page it wrote holds '<meta name="robots" content="noindex, nofollow">'
      And every page it wrote shows '<p class="private" role="note">Private course'

    Scenario: A public course built with --private is not marked
      Given the hostile course
      When the command builds it with "--private"
      Then it exits with status 0
      And no page it wrote holds "noindex"
