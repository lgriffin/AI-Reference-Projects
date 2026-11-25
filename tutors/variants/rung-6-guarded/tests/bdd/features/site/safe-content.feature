@security
Feature: The site is safe to build from a course you did not write
  As a student reading a course someone else wrote
  I want no link, image or page of it to run script in my browser
  So that reading a course can never cost me my session or my data

  The adversary is the course author. The scenarios call @ladder/lite's buildSite on a small course written
  in the scenario, or on upstream's tutors.json for the shared fixture. Escaping (R-008) stops course text
  becoming markup; these Rules add the two walls behind it. Upstream removes script-bearing addresses with
  DOMPurify (packages/svelte/ui-primitives/src/utils/sanitize.ts) and names a Content-Security-Policy header in
  tests/security/header-contract.json.

  @R-022 @ears-unwanted
  Rule: If a link, an image or a web link in a course has an address whose scheme is not http, https or, for a link, mailto, then the site shall show its text without the address.

    Scenario: A javascript link keeps its text and loses its address
      Given a note whose Markdown is "[the reading list](javascript:alert)"
      When the site is built
      Then the note's page holds '<span class="blocked" title="unsafe address removed">the reading list</span>'
      And no page holds "javascript:"

    Scenario: Disguised schemes are refused too
      Given a note whose Markdown is "[a](JaVaScRiPt:x) [b](vbscript:x) [c](file:///etc/passwd) ![d](data:image/svg+xml;base64,AAAA) ![e](mailto:a@b.c)"
      When the site is built
      Then the note's page holds 5 blocked addresses

    Scenario: A web link whose address is script is a card without a link
      Given a web link whose address is "javascript:alert(document.cookie)"
      When the site is built
      Then the topic's page holds '<h3><span class="blocked" title="unsafe address removed">web-1</span></h3>'
      And no page holds "javascript:"

    Scenario: The addresses a course needs keep working
      Given a note whose Markdown is "[a](https://tutors.dev) [b](mailto:hello@tutors.dev) [c](../topic-2/index.html#top) ![d](img/cat.png)"
      When the site is built
      Then the note's page holds 0 blocked addresses
      And the note's page holds '<a href="mailto:hello@tutors.dev">b</a>'

  @R-023 @ears-ubiquitous
  Rule: The site shall carry in every page a Content Security Policy that allows no script and no style but the site's own style sheet.

    Scenario: Every page of the shared fixture carries the policy, first
      Given upstream's tutors.json for the shared fixture
      When the site is built
      Then every page carries the policy straight after its charset
      And no page holds "<script"

    Scenario: The policy names nothing that could run
      Then the policy's "default-src" is "'none'"
      And the policy has no "script-src"
      And the policy's "style-src" is the SHA-256 hash of the site's style sheet
      And the policy holds neither "unsafe-inline" nor "unsafe-eval"
