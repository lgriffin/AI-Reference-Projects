@developer
Feature: A course folder becomes a Course
  As a lecturer who writes a course as folders of markdown
  I want the generator to read my folders the way upstream tutors does
  So that the same folder gives the same course here and on tutors.dev

  The scenarios build courses in a MemoryFileSystem through @ladder/gen's buildCourse, the same function the
  command runs over the disk. The contract test in tests/contract keeps the two adapters honest. Upstream
  states its generator's Rules in tests/bdd/features/generator/course-json.feature.

  @R-001 @ears-ubiquitous
  Rule: The generator shall give each folder the learning-object kind named by the longest known prefix of its name.

    Scenario: A note, a talk and a lab are recognised by their prefixes
      Given a course with a topic "topic-1" holding the folders "note-a, talk-b, book-c, lab-d, web-e, archive-f"
      When the course is built
      Then the topic "topic-1" holds the kinds "talk, lab, lab, note, web, archive"

    Scenario: A notebook is not a note
      Given a course with a topic "topic-1" holding the folders "notebook-1, note-1"
      When the course is built
      Then the topic "topic-1" holds the kinds "note"

    Scenario: A folder that names no kind is not content
      Given a course with a topic "topic-1" holding the folders "drafts, img, note-1"
      When the course is built
      Then the topic "topic-1" holds the kinds "note"

  @R-002 @ears-unwanted
  Rule: If a course folder has no course.md, then the generator shall refuse to build it and say that course.md is missing.

    Scenario: A folder of topics without course.md
      Given a folder holding only "topic-1/topic.md"
      When the course is built
      Then the build fails with "no course.md"

  @R-003 @ears-ubiquitous
  Rule: The generator shall order the learning objects inside a topic, unit or side by kind, in upstream's preOrder, and then by folder name.

    Scenario: Kinds first, then names
      Given a course with a topic "topic-1" holding the folders "web-a, note-b, note-a, unit-z, talk-z, book-q"
      When the course is built
      Then the topic "topic-1" holds the ids "unit-z, talk-z, book-q, note-a, note-b, web-a"

  @R-004 @ears-event-driven
  Rule: When a lab folder holds markdown files, the generator shall write one step per file, in file-name order, whose id is the file name between its first and last dot.

    Scenario: The steps of a lab
      Given a course with a lab "topic-1/book-1" holding the files "02.Build.md, 00.Lab-1-Intro.md, 01.Set.Up.md"
      When the course is built
      Then the lab "book-1" has the steps "Lab-1-Intro, Set.Up, Build"
      And each step of the lab "book-1" has the lab's route followed by its id

    Scenario: A lab with img/main.png takes its first step's id as its title
      Given a course with a lab "topic-1/book-1" holding the files "00.Lab-1-Intro.md, 01.Setup.md, img/main.png"
      When the course is built
      Then the lab "book-1" has the title "Lab-1-Intro"

  @R-005 @ears-unwanted
  Rule: If a folder names a kind that this rung does not build, then the generator shall leave it out and report its path through the warn option.

    Scenario: A notebook and a podcast are reported and left out
      Given a course with a topic "topic-1" holding the folders "notebook-1, podcast-2, note-3"
      When the course is built
      Then the topic "topic-1" holds the ids "note-3"
      And the build warned "skipped topic-1/notebook-1: this rung does not build this kind, skipped topic-1/podcast-2: this rung does not build this kind"

  @R-006 @ears-ubiquitous
  Rule: The generator shall take a learning object's title and summary from the first two lines of its markdown after removing front matter.

    Scenario: Front matter is not the title
      Given a course with a note "topic-1/note-1" whose markdown is "---\norder: 2\n---\n\n# Reading\nWhat to read first.\n\nMore text."
      When the course is built
      Then the learning object "note-1" has the title "Reading" and the summary "What to read first."

    Scenario: A heading's marks are not part of the title
      Given a course with a note "topic-1/note-1" whose markdown is "#   Spaced   \n\n  Summary after a blank line  \n"
      When the course is built
      Then the learning object "note-1" has the title "Spaced" and the summary "Summary after a blank line"

  @R-007 @ears-ubiquitous
  Rule: The generator shall write the same value as upstream's tutors.json for every field this rung builds.

    Scenario: The shared fixture matches upstream's oracle
      Given the shared fixture course read from the disk
      When the course is built
      Then every field this rung builds equals the field in upstream's tutors.json
