@developer
Feature: A Course becomes a static website
  As a student reading a course without a server
  I want a page for each thing I read, linked the way upstream's tutors-lite links them
  So that I can read the course from a folder of HTML

  The scenarios call @ladder/lite's buildSite on a Course, either upstream's tutors.json for the shared
  fixture or a small course written in the scenario. Upstream states its static build's Rules in
  tests/bdd/features/generator/static-build.feature.

  @R-008 @ears-ubiquitous
  Rule: The site shall escape every piece of course text that it writes into a page.

    Scenario: A script in every field of every kind stays text
      Given a course whose every title, summary, body and link is "<script>alert(1)</script>"
      When the site is built
      Then no page holds "<script"

    Scenario: A quote cannot leave an attribute
      Given a course with a web link whose URL ends with a quote and an onclick attribute
      When the site is built
      Then no page holds a quote followed by "onclick="

  @R-009 @ears-ubiquitous
  Rule: The site shall write one page for the course, each topic, each talk, each note and each lab step, at the paths upstream's tutors-lite uses.

    Scenario: The pages of the shared fixture
      Given upstream's tutors.json for the shared fixture
      When the site is built
      Then the site has the pages "index.html, topic-01-basics/index.html, topic-01-basics/unit-1-intro/note-1-reading/index.html, topic-01-basics/unit-1-intro/talk-1-welcome/index.html, topic-02-practice/index.html, topic-02-practice/unit-1-lab/book-1-first-lab/Build.html, topic-02-practice/unit-1-lab/book-1-first-lab/Setup.html, topic-02-practice/unit-1-lab/book-1-first-lab/index.html"

    Scenario: Every page links home and up
      Given upstream's tutors.json for the shared fixture
      When the site is built
      Then the page "topic-01-basics/unit-1-intro/talk-1-welcome/index.html" links home to "../../../index.html" and up to "../../../topic-01-basics/index.html"

  @R-010 @ears-event-driven
  Rule: When a lab has more than one step, the site shall link each step page to the step before it and the step after it.

    Scenario: The middle step links both ways
      Given a course with a lab whose steps are "Intro, Setup, Build"
      When the site is built
      Then the step page "Setup.html" links to the previous page "index.html" and the next page "Build.html"
      And the step page "index.html" has no previous link
      And the step page "Build.html" has no next link

  @R-011 @ears-event-driven
  Rule: When a talk holds a Marp deck, the site shall show each slide of the deck as its own section.

    Scenario: Three slides, three sections
      Given a course with a talk whose deck is "# One\n\n---\n\n## Two\n\n---\n\nThree"
      When the site is built
      Then the talk's page has 3 slide sections, the second starting with "<h2>Two</h2>"
