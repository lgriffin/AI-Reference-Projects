@security
Feature: The policy decides who may view a course
  As a lecturer who marked a course private
  I want one small policy to decide who may view it, the same way everywhere
  So that the command and the reader can never disagree about my course

  The scenarios call @ladder/rbac: accessOf reads a course's settings, canView answers for an actor. The
  policy is pure, so these examples and the table in tests/unit/rbac/policy.test.ts are the whole truth about
  it. The actors come from @ladder/identity. Upstream states the same rules in guides/RBAC.md ("Auth
  Levels", "Whitelist Enforcement") and packages/svelte/utils/rbac/src/permissions.ts.

  @R-030 @ears-ubiquitous
  Rule: The policy shall treat a course as private unless its auth setting is absent or the whole number 0.

    Scenario: No auth setting, and auth 0, are public
      Given courses whose auth settings are "absent, 0"
      Then the policy treats every one of them as public

    Scenario: A typo fails closed
      Given courses whose auth settings are "1, 2, yes, true, -1, 0.5"
      Then the policy treats every one of them as private

  @R-031 @ears-ubiquitous
  Rule: The policy shall let a reader view a private course only when the reader is signed in and, where the course has a whitelist, is on it or is one of its educators.

    Scenario: Nobody signed in
      Given a private course whose educators are "ada" and whose whitelist is "bob"
      When nobody is signed in
      Then the policy refuses with "sign-in-required"

    Scenario: A signed-in reader who is not on the whitelist
      Given a private course whose educators are "ada" and whose whitelist is "bob"
      When "eve" is signed in
      Then the policy refuses with "not-enrolled"

    Scenario: A reader on the whitelist
      Given a private course whose educators are "ada" and whose whitelist is "bob"
      When "bob" is signed in
      Then the policy allows the reader as "student"

    Scenario: An educator is not on the whitelist and still gets in
      Given a private course whose educators are "ada" and whose whitelist is "bob"
      When "ada" is signed in
      Then the policy allows the reader as "educator"

    Scenario: A private course with no whitelist admits anyone signed in
      Given a private course whose educators are "ada" and whose whitelist is ""
      When "eve" is signed in
      Then the policy allows the reader as "student"
