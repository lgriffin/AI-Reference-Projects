@security
Feature: The generator reads only inside the course folder
  As a lecturer building a course someone sent me
  I want the build to read nothing outside that course's folder
  So that a course cannot publish my own files

  The adversary is the course folder itself: a path with "..", an absolute path, or a symbolic link that
  leads out. The scenarios run on MemoryFileSystem, which holds links as the disk does; the port contract
  (tests/contract/file-system-port.contract.test.ts) proves NodeFileSystem refuses the same paths. Upstream
  keeps paths relative to the course root in packages/jsr/course-rules/src/ports.ts, and warns with V021 in
  packages/jsr/course-rules/src/warnings.ts (checkPortable).

  @R-024 @ears-unwanted
  Rule: If a path is absolute, climbs out with "..", or passes through a link that leads outside the course folder, then the generator shall refuse to read it with a PathEscapeError.

    Scenario: Paths that climb out or start at the root
      Given a course folder in memory
      When the generator's file system is asked for "../secrets.md, topic-1/../../etc/passwd, /etc/passwd, C:/Windows/win.ini, ~/.ssh/id_ed25519"
      Then every one of them is refused with a PathEscapeError

    Scenario: A course.md that is a link to a file outside the course
      Given a course folder in memory whose "course.md" is a link to "../../home/me/.ssh/config"
      When the generator builds the course
      Then the build is refused with a PathEscapeError that names "course.md"

    Scenario: A link that stays inside the course is followed
      Given a course folder in memory whose "extra.md" is a link to "topic-1/topic.md"
      When the generator's file system is asked for "extra.md"
      Then it reads "# Topic"

  @R-025 @ears-event-driven
  Rule: When a page of a topic, a talk, a note or a lab uses a file outside its own folder, the generator shall report warning V021, naming the page and the file, through the warn option.

    Scenario: A note that shows a picture from a private folder
      Given a course whose note links to "../../../private/answers.png"
      When the generator builds the course
      Then it warns 'V021 topic-1/unit-1/note-1/note.md: This page uses "../../../private/answers.png", which is outside its own folder'

    Scenario: A link inside the folder, a web address and a link in code are not reported
      Given a course whose note links to "img/diagram.png"
      When the generator builds the course
      Then it warns nothing

  @R-026 @ears-event-driven
  Rule: When a course folder holds properties.yaml or enrollment.yaml, the generator shall write the settings of properties.yaml as the course's properties and the educators and whitelist of enrollment.yaml as its enrollment.

    Scenario: A private course with an educator and a whitelist
      Given a course folder with the properties "auth: 1" and the enrollment "educators: ada; whitelist: bob, eve"
      When the generator builds the course
      Then the course's auth property is 1
      And the course's educators are "ada" and its whitelist is "bob, eve"

    Scenario: A course with neither file has neither field
      Given a course folder in memory
      When the generator builds the course
      Then the course has no properties and no enrollment
