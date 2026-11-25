# REQUIREMENTS.md

Every rule of the generator, the site, the command, the reader, the policy and the audit, stated once as an EARS sentence with an id. The
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
| R-022 | Unwanted behaviour | If a link, an image or a web link in a course has an address whose scheme is not http, https or, for a link, mailto, then the site shall show its text without the address. | lite |
| R-023 | Ubiquitous | The site shall carry in every page a Content Security Policy that allows no script and no style but the site's own style sheet. | lite |
| R-024 | Unwanted behaviour | If a path is absolute, climbs out with "..", or passes through a link that leads outside the course folder, then the generator shall refuse to read it with a PathEscapeError. | gen, and the disk adapter in cli |
| R-025 | Event-driven | When a page of a topic, a talk, a note or a lab uses a file outside its own folder, the generator shall report warning V021, naming the page and the file, through the warn option. | gen |
| R-026 | Event-driven | When a course folder holds properties.yaml or enrollment.yaml, the generator shall write the settings of properties.yaml as the course's properties and the educators and whitelist of enrollment.yaml as its enrollment. | gen |
| R-027 | Unwanted behaviour | If a path leaves the course folder while a course is built, then the command shall write nothing and exit with status 1. | cli |
| R-028 | Unwanted behaviour | If a course is private and the command is not given --private, then the command shall write nothing, say that the course is private and exit with status 1. | cli |
| R-029 | Event-driven | When the command is given --private for a private course, the command shall write every page with a private notice and a noindex mark. | cli, marked by lite |
| R-030 | Ubiquitous | The policy shall treat a course as private unless its auth setting is absent or the whole number 0. | rbac |
| R-031 | Ubiquitous | The policy shall let a reader view a private course only when the reader is signed in and, where the course has a whitelist, is on it or is one of its educators. | rbac |
| R-032 | Unwanted behaviour | If the policy refuses the reader in the session, then the reader shall answer 403 with a notice that the course is private and show none of its pages. | reader |
| R-033 | Unwanted behaviour | If a route in tutors.json is an address the site would refuse to link to, then the reader shall show its learning object without a link. | reader |
| R-034 | Ubiquitous | The reader shall carry a Content Security Policy that allows script and style only from its own origin, and inline only the start-up script that SvelteKit names by its hash. | reader |
| R-035 | Unwanted behaviour | If a dependency is neither a workspace package nor a registry version that the lockfile pins with an integrity hash, then the audit shall report it and exit with status 1. | scripts |
| R-036 | Unwanted behaviour | If an audit allowance has no reason, no expiry date or an expiry date in the past, then the audit shall report it and exit with status 1. | scripts |

## The form of a requirement

| Pattern | Reads | Tag |
| --- | --- | --- |
| Ubiquitous | The \<system\> shall \<response\>. | `@ears-ubiquitous` |
| Event-driven | When \<trigger\>, the \<system\> shall \<response\>. | `@ears-event-driven` |
| State-driven | While \<state\>, the \<system\> shall \<response\>. | `@ears-state-driven` |
| Optional | Where \<feature is included\>, the \<system\> shall \<response\>. | `@ears-optional` |
| Unwanted behaviour | If \<condition\>, then the \<system\> shall \<response\>. | `@ears-unwanted` |

The systems are `the generator` (`packages/gen`), `the site` (`packages/lite`), `the command`
(`apps/cli`), `the reader` (`apps/reader`), `the policy` (`packages/rbac`) and `the audit`
(`scripts/supply-chain.ts`). One "shall" per sentence. No vague words ("appropriate", "handle", "quickly", ...): say what
can be observed.

## From pattern to layer

| The sentence says | Put the code in |
| --- | --- |
| The generator shall ... about a course folder | `packages/gen`, reading through `FileSystemPort` |
| The site shall ... about a page | `packages/lite`, building HTML with the `html` template |
| The command shall ... about arguments, files or exit codes | `apps/cli/src/run.ts` |
| The reader shall ... about a course, a page, a URL or a 404 | `apps/reader/src/lib/course`, plain TypeScript, so a scenario and Stryker can reach it |
| The reader shall ... about what a learner sees or clicks | a component in `apps/reader/src/lib/ui-*`, its logic in `lib/course`, proved by a scenario over that logic and by `pnpm test:e2e` |
| The policy shall ... about who may view or do what | `packages/rbac`, pure: every answer from its arguments alone, so a table of cases is the whole truth |
| The audit shall ... about a dependency, the lockfile or an allowance | `scripts/supply-chain.ts`, as a function that returns findings |
| ... shall refuse, or shall show ... without (a security rule) | the layer where the hostile value enters: the port's adapter for a path, `renderMarkdown` for an address, `decorateCourseTree` for a route |
| ... the same value as upstream | a conformance test against the oracle, and the layer the field comes from |

## Adding a requirement

1. Take the next id: `pnpm test:ears:audit --next-id`. Ids are never reused.
2. Add the row here, then the `Rule:` with the same sentence and a failing scenario.
3. Make it pass in the layer the row names. Run `pnpm test`, then `pnpm test:mutation` and
   `pnpm check:mutation-floors`.

## Security requirements

R-022 to R-036 arrived with rung 6 (Guarded). A security requirement is written like any other, with two
habits. It is most often an **unwanted behaviour** ("If ..., then the ... shall ..."): it names what an
attacker supplies and what the system does instead. And its scenarios are **adversarial**: the Given is a
hostile course, path or address, and the Then says what a reader can no longer be made to see or run. The
corpus in `tests/unit/lite/xss-corpus.test.ts` and the properties in `tests/fuzz/safe-url.fuzz.test.ts` are
the same requirement (R-022) met by many more adversaries than a scenario can list.
