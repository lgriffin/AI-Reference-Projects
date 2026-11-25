@security
Feature: The reader is safe to point at a course you did not write
  As a student reading a course in a browser
  I want the reader to run nothing a course asks it to, and to keep a private course private
  So that opening a course is as safe as reading a page of text

  The adversary is the tutors.json the reader fetches. The scenarios call the reader's plain logic in
  apps/reader/src/lib/course with a stand-in host and a stand-in session (@ladder/identity's FakeSession);
  `pnpm test:e2e` proves the same in Chromium, where a hostile course is opened and no script runs. The
  reader's private-course notice is a courtesy to an honest reader: tutors.json is a file on the host, so
  only the host can refuse to serve it (SECURITY.md, "Out of scope"). Upstream's reader turns a reader away
  in packages/svelte/connect/src/services/connect.svelte.ts and sanitises in
  packages/svelte/ui-primitives/src/utils/sanitize.ts.

  @R-032 @ears-unwanted
  Rule: If the policy refuses the reader in the session, then the reader shall answer 403 with a notice that the course is private and show none of its pages.

    Scenario: Nobody is signed in, as in every static build
      Given a host that serves a private course "exam" whose whitelist is "bob"
      When a learner opens "/course/exam, /topic/exam/topic-01-enrolled" with nobody signed in
      Then every page is refused with 'Private course: "exam" is not shown, because it is for signed-in readers, and this reader has no sign-in.'

    Scenario: A signed-in reader who is not enrolled
      Given a host that serves a private course "exam" whose whitelist is "bob"
      When a learner opens "/course/exam" signed in as "eve"
      Then every page is refused with 'Private course: "exam" is not shown, because you are not on its enrolment list.'

    Scenario: An enrolled reader sees the course
      Given a host that serves a private course "exam" whose whitelist is "bob"
      When a learner opens "/course/exam, /topic/exam/topic-01-enrolled" signed in as "bob"
      Then every page is found

    Scenario: A public course needs no sign-in
      Given a host that serves upstream's tutors.json for the shared fixture as the course "open"
      When a learner opens "/course/open" with nobody signed in
      Then every page is found

  @R-033 @ears-unwanted
  Rule: If a route in tutors.json is an address the site would refuse to link to, then the reader shall show its learning object without a link.

    Scenario: A web link whose address is script
      Given a tutors.json whose web link has the route "javascript:alert(document.cookie)"
      When the reader reads it as the course "hostile"
      Then the web link's card has no link

    Scenario: A web link to the web keeps its link
      Given a tutors.json whose web link has the route "https://tutors.dev"
      When the reader reads it as the course "hostile"
      Then the web link's card links to "https://tutors.dev"

  @R-034 @ears-ubiquitous
  Rule: The reader shall carry a Content Security Policy that allows script and style only from its own origin, and inline only what SvelteKit itself writes, each named by its hash.

    Scenario: The policy the build is given
      Then the reader's policy allows "script-src, style-src, connect-src" from "self" alone
      And the reader's policy starts from "default-src" "none"
      And the reader's build asks SvelteKit for a policy by "hash"
      And the only style attribute the policy allows is the one on SvelteKit's route announcer
