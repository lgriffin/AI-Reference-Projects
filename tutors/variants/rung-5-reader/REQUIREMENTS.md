# REQUIREMENTS.md

Every rule of the generator, the site, the command and the reader, stated once as an EARS sentence with an id. The
sentence is the `Rule:` title of a feature in `tests/bdd/features`, word for word, tagged with its id and
its EARS pattern; the scenarios beneath it are the proof. `pnpm test:ears:audit`, run in the gate by
`tests/suite-health/requirements.test.ts`, checks that every id has a Rule with at least one scenario, that
every Rule and every test that cites an id cites one listed here, and that each sentence has the EARS form
its pattern names. "Implemented in" names the layer that holds the code (README.md, Architecture).

| Id | Pattern | Requirement | Implemented in |
| --- | --- | --- | --- |
| R-001 | Ubiquitous | The generator shall give each folder the learning-object kind named by the longest known prefix of its name. | gen |
| R-002 | Unwanted behaviour | If a course folder has no course.md, then the generator shall refuse to build it and say that course.md is missing. | gen |
| R-003 | Ubiquitous | The generator shall order the learning objects inside a topic, unit or side by kind, in upstream's preOrder, and then by folder name. | gen |
| R-004 | Event-driven | When a lab folder holds markdown files, the generator shall write one step per file, in file-name order, whose id is the file name between its first and last dot. | gen |
| R-005 | Unwanted behaviour | If a folder names a kind that this rung does not build, then the generator shall leave it out and report its path through the warn option. | gen |
| R-006 | Ubiquitous | The generator shall take a learning object's title and summary from the first two lines of its markdown after removing front matter. | gen |
| R-007 | Ubiquitous | The generator shall write the same value as upstream's tutors.json for every field this rung builds. | gen, wired to the disk by cli |
| R-008 | Ubiquitous | The site shall escape every piece of course text that it writes into a page. | lite |
| R-009 | Ubiquitous | The site shall write one page for the course, each topic, each talk, each note and each lab step, at the paths upstream's tutors-lite uses. | lite |
| R-010 | Event-driven | When a lab has more than one step, the site shall link each step page to the step before it and the step after it. | lite |
| R-011 | Event-driven | When a talk holds a Marp deck, the site shall show each slide of the deck as its own section. | lite |
| R-012 | Unwanted behaviour | If the command is not given both a course folder and an output folder, then the command shall print its usage and exit with status 2. | cli |
| R-013 | Event-driven | When the command is given --json-only, the command shall write tutors.json and no pages. | cli |
| R-014 | Ubiquitous | The reader shall fetch a course's tutors.json at most once, from /courses/ followed by the course id, and reuse it for every page of that course. | reader |
| R-015 | Unwanted behaviour | If a course id holds a character other than a letter, a digit, an underscore or a hyphen, then the reader shall treat the course as not found without asking the host for anything. | reader |
| R-016 | Unwanted behaviour | If the host answers a course's address with anything but a course, then the reader shall treat the course as not found. | reader |
| R-017 | Ubiquitous | The reader shall give the course, each topic, each talk, each note and each lab a page whose route holds the course id where tutors.json holds the COURSEURL placeholder. | reader |
| R-018 | Event-driven | When a lab is opened without a step in its URL, the reader shall show the lab's first step. | reader |
| R-019 | Event-driven | When a lab step is shown, the reader shall link to the step before it and the step after it, leaving out a link that the lab has no step for. | reader |
| R-020 | Unwanted behaviour | If a URL names a course, a page or a lab step that the course does not hold, then the reader shall answer 404 with a message that names what is missing. | reader |
| R-021 | Ubiquitous | The reader shall show breadcrumbs from the course down to the page on screen, leaving out units and sides. | reader |

## The form of a requirement

| Pattern | Reads | Tag |
| --- | --- | --- |
| Ubiquitous | The \<system\> shall \<response\>. | `@ears-ubiquitous` |
| Event-driven | When \<trigger\>, the \<system\> shall \<response\>. | `@ears-event-driven` |
| State-driven | While \<state\>, the \<system\> shall \<response\>. | `@ears-state-driven` |
| Optional | Where \<feature is included\>, the \<system\> shall \<response\>. | `@ears-optional` |
| Unwanted behaviour | If \<condition\>, then the \<system\> shall \<response\>. | `@ears-unwanted` |

The systems are `the generator` (`packages/gen`), `the site` (`packages/lite`), `the command`
(`apps/cli`) and `the reader` (`apps/reader`). One "shall" per sentence. No vague words ("appropriate", "handle", "quickly", ...): say what
can be observed.

## From pattern to layer

| The sentence says | Put the code in |
| --- | --- |
| The generator shall ... about a course folder | `packages/gen`, reading through `FileSystemPort` |
| The site shall ... about a page | `packages/lite`, building HTML with the `html` template |
| The command shall ... about arguments, files or exit codes | `apps/cli/src/run.ts` |
| The reader shall ... about a course, a page, a URL or a 404 | `apps/reader/src/lib/course`, plain TypeScript, so a scenario and Stryker can reach it |
| The reader shall ... about what a learner sees or clicks | a component in `apps/reader/src/lib/ui-*`, its logic in `lib/course`, proved by a scenario over that logic and by `pnpm test:e2e` |
| ... the same value as upstream | a conformance test against the oracle, and the layer the field comes from |

## Adding a requirement

1. Take the next id: `pnpm test:ears:audit --next-id`. Ids are never reused.
2. Add the row here, then the `Rule:` with the same sentence and a failing scenario.
3. Make it pass in the layer the row names. Run `pnpm test`, then `pnpm test:mutation` and
   `pnpm check:mutation-floors`.
