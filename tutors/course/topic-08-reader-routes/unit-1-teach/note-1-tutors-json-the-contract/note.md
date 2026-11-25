# tutors.json: the contract

Why the generator and the reader meet in one file and nowhere else, what that file promises, what the reader
adds to it, and how the promise is checked from both sides. Worked from `tutors/variants/rung-5-reader` and
tutors-mono-repo at `2b96b69`.

## Where we are on the ladder

This is week 8, the first of two weeks on **rung 5 (Reader)**. Rungs 1 to 4 built a tool: a course folder
goes in, `tutors.json` and a static site come out, and by rung 4 every rule of that tool is an EARS sentence
with a scenario. Rung 5 is a copy of rung 4 with one new app, `apps/reader`, which runs in a browser. This
note is about the seam between the two. The second note this week follows a URL through the reader.

## Two programs that never call each other

The command line and the reader are in one workspace, and they share types. They do not share a single
function call.

```
course folder ──► apps/cli ──► @ladder/gen ──► tutors.json ──► apps/reader
                  Node, at build time            a file          a browser, at run time
```

Look at the root `package.json` of rung 5:

```json
"course": "node apps/cli/src/main.ts --json-only ../fixtures/ladder-sample-course apps/reader/static/courses/ladder-sample-course",
"dev": "pnpm course && pnpm --filter @ladder/reader dev",
"build": "pnpm course && pnpm --filter @ladder/reader build",
```

`pnpm course` is the generator's whole part in the reader's life. It runs before the reader starts, writes
one file into the folder the reader serves as static files, and exits. `--json-only` is a requirement of its
own:

> R-013 | Event-driven | When the command is given --json-only, the command shall write tutors.json and no
> pages. | cli

From then on the reader is alone with the file. It fetches `/courses/ladder-sample-course/tutors.json` like
any other web page fetches data, and it could just as well be fetching a file some other program wrote.
That is the point.

## Why not just import the generator?

In a small workspace it is tempting. `@ladder/gen` has a `buildCourse` function; the reader could import it.
There are three reasons it must not, and each is worth more than the convenience.

**The generator cannot run where the reader runs.** `gen` reads a course through `FileSystemPort`, and the
only real adapter, `NodeFileSystem`, lives in `apps/cli` and uses `node:fs`. A browser has no `node:fs`.
The architecture test states this as two rules, the Layering rule and the Browser rule. If the reader
imports `@ladder/gen`, the gate fails with:

```
Layering rule: @ladder/reader may import only [@ladder/model, @ladder/lite], because reader is browser code
that renders any tutors.json; the course is built before the reader runs (pnpm course, through apps/cli), so
gen and node: never reach the browser.
```

**One reader should show every course.** Upstream's reader is one deployed app. A lecturer builds a course
on their own machine and publishes the output to any static host; the reader is given the course's address
and fetches its `tutors.json`. Upstream's walkthrough puts it in two sentences
(`docs/COURSE-PAGE-WALKTHROUGH.md`):

> This file is the entire course: every topic, lab, talk and note, with their Markdown already inlined. The
> reader never reads a Markdown file from disk.

If the reader needed the generator, every course would need its own reader.

**The two halves change at different speeds.** A lecturer's course may have been generated last year. The
reader is deployed today. As long as the file keeps its shape, neither has to know when the other changed.
In Lean terms the file removes a **handoff**: nobody has to coordinate a release of the generator with a
release of the reader, because the only thing that crosses is data with an agreed shape.

A file with an agreed shape, which both sides rely on and neither side owns alone, is a **contract**.

## What the contract promises

Run the generator and look at one learning object. This is the note in the sample course, as rung 5 writes
it:

```json
{
  "title": "Reading Guide",
  "summary": "How to read this course.",
  "contentMd": "# Reading Guide\n\nHow to read this course.\n\n## Steps\n...",
  "id": "note-1-reading",
  "route": "/note/{{COURSEURL}}/topic-01-basics/unit-1-intro/note-1-reading",
  "type": "note"
}
```

The same note, as upstream's generator writes it
(`tutors/variants/fixtures/ladder-sample-course.tutors.json`):

```json
{
  "route": "/note/{{COURSEURL}}/topic-01-basics/unit-1-intro/note-1-reading",
  "type": "note",
  "title": "Reading Guide",
  "summary": "How to read this course.",
  "contentMd": "# Reading Guide\n\nHow to read this course.\n\n## Steps\n...",
  "frontMatter": {},
  "id": "note-1-reading",
  "img": "https://{{COURSEURL}}/topic-01-basics/unit-1-intro/note-1-reading/note.png",
  "imgFile": "note.png",
  "video": "",
  "videoids": { "videoid": "", "videoIds": [] },
  "hide": false,
  "authLevel": 0
}
```

Three things are promised, and you can read all of them here.

1. **A tree of learning objects.** Every object has a `type`, and a composite (`course`, `topic`, `unit`,
   `side`) has `los`, its children, in the order the author's folders sort. A lab's `los` are its steps.
   The types are the discriminated union you built in week 2, now in `packages/model/src/index.ts`.
2. **The content, already read.** `title`, `summary` and `contentMd` hold the Markdown. The reader never
   needs the course folder.
3. **A route for every object, with a hole in it.** `route` says where the reader shows the object, and
   holds `{{COURSEURL}}` where the course id will go.

Upstream's file holds more fields than rung 5 writes: images, videos, front matter, `hide`, `authLevel`.
Rung 5's reader ignores what it does not use. That is the usual rule for a consumer of a contract: rely on
what you need, tolerate the rest. It is also why the reader can read upstream's file at all.

### Why the route has a hole

The generator cannot fill in the course id, because it does not know it. The id is decided when the course
is **published**, not when it is built: upstream turns the address a student types into a host
(`determineCourseUrl` in `packages/svelte/course/src/course/services/lo-tree.ts`), and the same
`tutors.json` could be published at two addresses. So the generator writes a placeholder and the reader,
which is the only party that knows which id the course was opened with, fills it in. Rung 5 states this as
part of a requirement:

> R-017 | Ubiquitous | The reader shall give the course, each topic, each talk, each note and each lab a
> page whose route holds the course id where tutors.json holds the COURSEURL placeholder. | reader

Upstream states the same rule (`tests/bdd/features/course/course-loading.feature`):

```gherkin
@rule-0003 @ears-event-driven
Rule: When a student opens a course holding a learning object of any published type, the reader shall keep
      that type and replace the course URL placeholder in its route.
```

One more detail is visible in the file: a unit's route is its **topic's** route with a trailing slash,
`/topic/{{COURSEURL}}/topic-01-basics/`. A unit has no page of its own. It is a box on its topic's page.
Keep that in mind; it explains a line of code below.

## What the reader adds: decorating the tree

The fetched file is a tree you can only walk from the top. A page needs three things the file does not
give directly: the object **at a URL**, the objects **above** it, and routes with the **course id** in
them. `decorateCourseTree` in `apps/reader/src/lib/course/lo-tree.ts` adds all three in one walk:

```ts
export function decorateCourseTree(raw: Course, courseId: string): CourseTree {
  const course = structuredClone(raw);
  const tree: CourseTree = { courseId, course, loIndex: new Map(), parents: new Map() };
  const visit = (lo: Lo, parent?: Composite) => {
    lo.route = lo.route.replace("{{COURSEURL}}", courseId);
    if (parent) tree.parents.set(lo, parent);
    if (isPage(lo)) tree.loIndex.set(lo.route, lo);
    if (lo.type === "lab") for (const step of lo.los) step.route = step.route.replace("{{COURSEURL}}", courseId);
    if (isComposite(lo)) for (const child of lo.los) visit(child, lo);
  };
  course.route = `/course/${courseId}`;
  visit(course); // in pre-order, so loIndex holds the pages in the order the course reads
  return tree;
}
```

Read it line by line.

- `structuredClone(raw)`: the reader decorates a **copy**. The fetched JSON is left as it came, and a
  scenario under R-017 checks that ("The fetched file is left as it came"). A contract you mutate is a
  contract you can no longer compare with anything.
- `lo.route.replace(...)`: the hole is filled.
- `tree.parents.set(lo, parent)`: each object learns what holds it. `breadCrumbs` walks this map upwards.
- `tree.loIndex.set(lo.route, lo)`: an index from route to object, but only for **pages**: course, topic,
  talk, note, lab. A unit is not in it.
- `visit(course)` in pre-order: a `Map` keeps insertion order, so `loIndex` is also the course in reading
  order. Next week's assignment is built on that one fact.

After this, finding the page for a URL is one line:

```ts
export function findLo(tree: CourseTree, path: string): PageLo | undefined {
  return tree.loIndex.get(decodeURI(path).replace(/\/$/, ""));
}
```

The `replace(/\/$/, "")` is the unit's trailing slash from above. Follow a unit's route and you land on its
topic.

Upstream does the same work under the same name. `decorateCourseTree` in
`packages/jsr/model/src/services/lo-tree.ts` sets `course.route`, calls `injectCourseUrl` over every object
(`packages/jsr/model/src/utils/lo-utils.ts`), builds `course.loIndex`, records each object's breadcrumbs,
and then goes further than rung 5: `createWalls`, companions, the calendar. Rung 5's `CourseTree` is those
first four steps and nothing else, because nothing else has been asked for yet.

## Keeping the contract: three checks from two sides

A contract nobody checks is a rumour. Rung 5 checks this one three times.

**From the generator's side: conformance.** `tests/conformance/tutors-json.test.ts` (R-007) builds the
sample course with the real wiring and compares every field this rung writes with upstream's file:

```ts
test("R-007: every field this rung builds matches upstream, learning object by learning object", () => {
  assert.deepEqual(project(course), project(oracle));
});
```

You met this in week 2 as "an oracle that judges". It means: what our generator writes, upstream's reader
could read.

**From the reader's side: the oracle as input.** The reader's unit tests and every reader scenario do not
use the file our generator wrote. They use upstream's. From the header of `tests/unit/reader/lo-tree.test.ts`:

```ts
/**
 * The reader's course logic, run on the tutors.json that upstream's generator wrote for the shared fixture
 * (tutors/variants/fixtures/ladder-sample-course.tutors.json). If the reader reads upstream's file, the file is the contract.
 */
```

and from the feature, every `Given`:

```gherkin
Given a host that serves upstream's tutors.json for the shared fixture as the course "once"
```

It means: what upstream's generator writes, our reader can read. Put the two checks together and you have
both directions without the two halves ever being run together.

**At the door: what is not a course.** The reader fetches over a network from a host it does not control,
so it must decide what to do with an answer that is not a course. Two requirements say so:

> R-015 | Unwanted behaviour | If a course id holds a character other than a letter, a digit, an underscore
> or a hyphen, then the reader shall treat the course as not found without asking the host for anything.
>
> R-016 | Unwanted behaviour | If the host answers a course's address with anything but a course, then the
> reader shall treat the course as not found.

and one function keeps both:

```ts
export function courseUrl(courseId: string): string | undefined {
  return /^[\w-]+$/.test(courseId) ? `/courses/${courseId}/tutors.json` : undefined;
}

const isCourse = (json: unknown): json is Course =>
  typeof json === "object" && json !== null && (json as Course).type === "course" && Array.isArray((json as Course).los);
```

R-016 looks fussy until you remember how the reader is hosted. It is a static build with a fallback page:
ask the host for a file that does not exist and it answers `200 OK` with `200.html`. So `response.ok` is
true and the body is HTML. The first scenario under R-016 is exactly that case, "A static host answers a
missing file with its fallback page". Without the rule a student who mistypes a course id would see a
JSON parse error instead of "Not found: the course ...".

## One fetch

The last promise is about waiting. A course is fetched once per visit and kept:

> R-014 | Ubiquitous | The reader shall fetch a course's tutors.json at most once, from /courses/ followed
> by the course id, and reuse it for every page of that course. | reader

`readCourse` keeps a `Map` from course id to decorated tree, and the scenario counts requests: three pages,
one request. Upstream's rule is the same, for more kinds of address (`@rule-0659`: "the reader shall fetch
that course's tutors.json once, from the one URL the address names").

One file is allowed to fetch. If any other reader file calls `fetch(`, the Loader rule fails and names the
file and the fix. A contract with one door is easy to guard; a contract with five is not.

## Lean: what the student is spared

Read the requirements again as wastes removed for the student reading a course:

| Requirement | Waste the student is spared |
| --- | --- |
| R-014, one fetch | waiting on every click |
| R-015, R-016, not a course | a defect shown as a crash |
| R-017, a page per object | a link that leads nowhere |
| R-020, a 404 that names what is missing | relearning: guessing what went wrong |
| R-021, breadcrumbs | motion: clicking around to find where you are |

And read the contract itself as a waste removed for contributors: the handoff between whoever changes the
generator and whoever changes the reader. They agree on a file, and two conformance checks tell each of them
the moment they break it.

## Which Assertion Ladder rungs guard these rules

| Rule | Level | Where it is kept |
| --- | --- | --- |
| Every learning object has a known `type` | L5 Prevented | the `Lo` union in `packages/model`; an unknown case does not compile |
| The generator writes what upstream writes | L3 Checked | `tests/conformance/tutors-json.test.ts` |
| The reader reads what upstream writes | L3 Checked | `tests/unit/reader`, `reader.feature`, on the upstream oracle |
| R-014 to R-017 hold | L3 Checked, L4 by the audit's messages | scenarios in `reader.feature`; `pnpm test:ears:audit` |
| The reader never imports `gen` or `node:` | L4 Explained | Layering and Browser rules, `tests/architecture/architecture.test.ts` |
| Only the course service fetches | L4 Explained | Loader rule, `tests/architecture/reader-layers.test.ts` |
| Generator and reader meet only in `tutors.json` | L2 Told, L1 Shown | `README.md` "Architecture"; `pnpm course` as the worked example |

Nothing here is L0. That is deliberate: a contract that is only implied is the first thing a coding agent
will break, by "helpfully" importing `buildCourse` into a `+page.ts`.

## Check yourself

1. **(Remember)** Which command writes the `tutors.json` the reader serves, and which requirement covers
   its flag?
2. **(Understand)** Why does the generator write `{{COURSEURL}}` instead of the course id?
3. **(Understand)** A unit's route ends in a slash and is not in `loIndex`. What does a student see if they
   follow it, and which line makes that work?
4. **(Apply)** Run the tree walk from Lab 8, step 4, on both files. Which fields does upstream's file hold
   that rung 5's does not?
5. **(Analyse)** The reader's tests read upstream's file; the conformance test compares our generator with
   upstream's file. Describe a change to the generator that the first would miss and the second would catch.
6. **(Analyse)** A host answers every unknown path with `200.html`. Trace what `readCourse("nope", fetch)`
   does, line by line, and say which requirement each line keeps.
7. **(Evaluate)** `decorateCourseTree` clones the course before decorating it. Upstream decorates in place.
   What does each choice cost, and which would you choose for a reader with fifty kinds of page?
8. **(Evaluate)** "Generator and reader meet only in `tutors.json`" is kept at L4 by the Layering rule.
   Would you raise it to L5? What would that take?
