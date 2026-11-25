@student
Feature: The reader shows a course from its tutors.json
  As a student reading a course in a browser
  I want each URL to open the right page, and a clear answer when it names nothing
  So that I can move through a course by link, by breadcrumb and by lab step

  The scenarios call the reader's plain logic in apps/reader/src/lib/course (the course service, lo-tree and
  live-lab), the code each route's +page.ts runs, with a stand-in host that serves upstream's tutors.json for
  the shared fixture. They need no browser: what a learner sees and clicks is proved again, in Chromium, by
  `pnpm test:e2e`. Upstream states the same kind of Rule for its reader in
  tests/bdd/features/course/course-loading.feature (fetch tutors.json once, replace the course URL
  placeholder) and course-navigation.feature (a lab opens at its first step, breadcrumbs).

  @R-014 @ears-ubiquitous
  Rule: The reader shall fetch a course's tutors.json at most once, from /courses/ followed by the course id, and reuse it for every page of that course.

    Scenario: Three pages of one course, one request
      Given a host that serves upstream's tutors.json for the shared fixture as the course "once"
      When a learner opens "/course/once, /topic/once/topic-02-practice, /note/once/topic-01-basics/unit-1-intro/note-1-reading"
      Then every page is found
      And the host was asked only for "/courses/once/tutors.json"

  @R-015 @ears-unwanted
  Rule: If a course id holds a character other than a letter, a digit, an underscore or a hyphen, then the reader shall treat the course as not found without asking the host for anything.

    Scenario: A course id that climbs out of the courses folder
      Given a host that serves upstream's tutors.json for the shared fixture as the course "guarded"
      When the reader reads the course "../secrets"
      Then the course is not found
      And the host was asked for nothing

    Scenario: A course id that names another host
      Given a host that serves upstream's tutors.json for the shared fixture as the course "guarded"
      When the reader reads the course "https://example.org"
      Then the course is not found
      And the host was asked for nothing

  @R-016 @ears-unwanted
  Rule: If the host answers a course's address with anything but a course, then the reader shall treat the course as not found.

    Scenario: A static host answers a missing file with its fallback page
      Given a host that answers every address with its HTML fallback page
      When the reader reads the course "fallback"
      Then the course is not found

    Scenario: The file is JSON, but not a course
      Given a host that answers every address with a topic's JSON
      When the reader reads the course "not-a-course"
      Then the course is not found

    Scenario: The host has no such file
      Given a host that answers every address with status 404
      When the reader reads the course "missing"
      Then the course is not found

  @R-017 @ears-ubiquitous
  Rule: The reader shall give the course, each topic, each talk, each note and each lab a page whose route holds the course id where tutors.json holds the COURSEURL placeholder.

    Scenario: The pages of the shared fixture, in reading order
      Given upstream's tutors.json for the shared fixture, read as the course "sample"
      Then the reader has the pages "/course/sample, /topic/sample/topic-01-basics, /talk/sample/topic-01-basics/unit-1-intro/talk-1-welcome, /note/sample/topic-01-basics/unit-1-intro/note-1-reading, /topic/sample/topic-02-practice, /lab/sample/topic-02-practice/unit-1-lab/book-1-first-lab"

    Scenario: The fetched file is left as it came
      Given upstream's tutors.json for the shared fixture, read as the course "sample"
      Then the first topic's route in the fetched file still holds "{{COURSEURL}}"

  @R-018 @ears-event-driven
  Rule: When a lab is opened without a step in its URL, the reader shall show the lab's first step.

    Scenario: The lab's own route
      Given a host that serves upstream's tutors.json for the shared fixture as the course "labs"
      When a learner opens "/lab/labs/topic-02-practice/unit-1-lab/book-1-first-lab"
      Then the reader shows step 1 of 3, "Objectives"

    Scenario: A route that names a step opens that step
      Given a host that serves upstream's tutors.json for the shared fixture as the course "labs"
      When a learner opens "/lab/labs/topic-02-practice/unit-1-lab/book-1-first-lab/Build"
      Then the reader shows step 3 of 3, "Build"

  @R-019 @ears-event-driven
  Rule: When a lab step is shown, the reader shall link to the step before it and the step after it, leaving out a link that the lab has no step for.

    Scenario: A step in the middle links both ways
      Given a lab with the steps "Intro, Setup, Build"
      When the step "Setup" is shown
      Then it links back to "Intro" and on to "Build"

    Scenario: The first step has no step before it
      Given a lab with the steps "Intro, Setup, Build"
      When the step "Intro" is shown
      Then it links back to "" and on to "Setup"

    Scenario: The last step has no step after it
      Given a lab with the steps "Intro, Setup, Build"
      When the step "Build" is shown
      Then it links back to "Setup" and on to ""

    Scenario: A step id arrives URL-encoded
      Given a lab with the steps "Before, Two Words, After"
      When the step "Two%20Words" is shown
      Then it links back to "Before" and on to "After"

  @R-020 @ears-unwanted
  Rule: If a URL names a course, a page or a lab step that the course does not hold, then the reader shall answer 404 with a message that names what is missing.

    Scenario: An unknown course
      Given a host that serves upstream's tutors.json for the shared fixture as the course "found"
      When a learner opens "/course/nope"
      Then the reader answers not found with 'Not found: the course "nope"'

    Scenario: An unknown lab step
      Given a host that serves upstream's tutors.json for the shared fixture as the course "found"
      When a learner opens "/lab/found/topic-02-practice/unit-1-lab/book-1-first-lab/Nope"
      Then the reader answers not found with "Not found: a lab step at /lab/found/topic-02-practice/unit-1-lab/book-1-first-lab/Nope"

    Scenario: A talk the course does not hold
      Given a host that serves upstream's tutors.json for the shared fixture as the course "found"
      When a learner opens "/talk/found/topic-01-basics/unit-1-intro/no-such-talk"
      Then the reader answers not found with "Not found: a talk at /talk/found/topic-01-basics/unit-1-intro/no-such-talk"

  @R-021 @ears-ubiquitous
  Rule: The reader shall show breadcrumbs from the course down to the page on screen, leaving out units and sides.

    Scenario: A note inside a unit
      Given upstream's tutors.json for the shared fixture, read as the course "sample"
      Then the breadcrumbs of "/note/sample/topic-01-basics/unit-1-intro/note-1-reading" are "Ladder Sample Course, Basics, Reading Guide"

    Scenario: The course page is its own only crumb
      Given upstream's tutors.json for the shared fixture, read as the course "sample"
      Then the breadcrumbs of "/course/sample" are "Ladder Sample Course"
