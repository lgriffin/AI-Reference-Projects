# Routing and load in SvelteKit

How a URL becomes a page in rung 5's reader: route folders, parameters, layouts, `load` functions, the
static build, and the one design decision that makes the reader testable without a browser. Worked from
`tutors/variants/rung-5-reader` and tutors-mono-repo at `2b96b69`.

## Where we are on the ladder

Week 8, rung 5 (Reader). The first note this week explained the file the reader starts from. This note
follows one URL from the address bar to the component that draws it. Next week's notes take over from
there: what the component does with its data, and how a user interface is specified.

Everything below runs in the browser. Keep one URL in mind throughout:

```
/topic/ladder-sample-course/topic-02-practice
```

## A URL is a folder

SvelteKit has no routing table. The folders under `src/routes` **are** the routes.

```
apps/reader/src/routes/
  +layout.ts                                  for every page: ssr = false
  +layout.svelte                              for every page: imports app.css
  +page.svelte                                /
  +error.svelte                               shown when a load answers with an error
  (course-reader)/
    +layout.svelte                            the shell around every course page
    found.ts                                  not a route: a helper the loads share
    course/[courseid]/+page.ts, +page.svelte
    topic/[courseid]/[...loid]/+page.ts, +page.svelte
    talk/[courseid]/[...loid]/...
    note/[courseid]/[...loid]/...
    lab/[courseid]/[...loid]/...
```

Four pieces of syntax are enough to read it.

- **`+page.svelte`** is a page. A folder is a route only if it holds one.
- **`[courseid]`** matches exactly one path segment and gives it a name. For our URL,
  `params.courseid` is `ladder-sample-course`.
- **`[...loid]`** is a rest parameter: it matches everything that is left, slashes included. For our URL
  `params.loid` is `topic-02-practice`; for a note it is `topic-01-basics/unit-1-intro/note-1-reading`.
- **`(course-reader)`** is a group. The brackets mean "do not add this to the URL". It exists so that the
  routes inside it can share a layout.

Files whose names do not start with `+`, such as `found.ts`, are ignored by the router. They are ordinary
modules that live beside the routes that use them.

Upstream uses the same names, so what you learn here transfers directly. List
`apps/reader/src/routes/(course-reader)/` in tutors-mono-repo and you find `course`, `topic`, `talk`,
`note` and `lab` with the same parameter folders, and a dozen more (`video`, `wall`, `search`, `quiz`,
`notebook`, `whiteboard`, ...).

## Layouts wrap pages

A `+layout.svelte` wraps every page beneath it. Our URL is wrapped twice.

The root layout only loads the stylesheet. The group's layout is the interesting one
(`routes/(course-reader)/+layout.svelte`):

```svelte
<script lang="ts">
  import { afterNavigate } from "$app/navigation";
  import type { Snippet } from "svelte";
  import TutorsShell from "#lib/ui-navigators/TutorsShell.svelte";
  import { currentCourse, currentLo } from "#lib/runes/index.svelte.ts";

  let { children }: { children: Snippet } = $props();

  afterNavigate(() => document.getElementById("main-content")?.focus({ preventScroll: true }));
</script>

<svelte:head>
  <title>{[currentLo.value?.title, currentCourse.value?.course.title].filter(Boolean).join(" | ")}</title>
</svelte:head>

<TutorsShell>
  {@render children()}
</TutorsShell>
```

It does three jobs: it draws the shell (the skip link, the top bar, the `main` region), it sets the
browser tab's title, and after every navigation it moves keyboard focus to the main region, so that a
screen reader starts reading the new page and not the old one. Upstream's layout at the same path does the
same with `afterNavigate` and `#main-content`, among much else.

`#lib/...` is how the reader names its own `src/lib` folder. SvelteKit 3 no longer provides `$lib`, so the
reader declares the alias itself, in `apps/reader/package.json`:

```json
"imports": { "#lib/*": "./src/lib/*" }
```

Upstream's `apps/reader/package.json` has the same line.

## The load function

Before a page is drawn, SvelteKit runs the `load` function exported from the `+page.ts` beside it. This is
the whole of the topic route's:

```ts
// routes/(course-reader)/topic/[courseid]/[...loid]/+page.ts
import { requestLo } from "#lib/course/course-service.ts";
import { currentCourse, currentLo } from "#lib/runes/index.svelte.ts";
import { found } from "../../../found.ts";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params, url, fetch }) => {
  const { tree, found: topic } = found(await requestLo("topic", params.courseid, url.pathname, fetch));
  currentCourse.value = tree;
  currentLo.value = topic;
  return { topic };
};
```

What it receives:

- `params`: the named segments, `{ courseid: "ladder-sample-course", loid: "topic-02-practice" }`.
- `url`: the whole URL. The reader uses `url.pathname` as the key into the tree's index, because the
  routes in `tutors.json` **are** paths. That is why `params.loid` is never read: the rest parameter is
  there to make the folder match, and the full path does the lookup.
- `fetch`: SvelteKit's own `fetch`. The load does not call it. It hands it on to the course service.

What it does, in order: asks the course service for the topic at this path; turns a "not found" answer
into a 404 (that is `found`); records the course and the page in two shared runes (next week); returns the
topic.

What it returns arrives in the page as `data`:

```svelte
<!-- +page.svelte, beside it -->
<script lang="ts">
  import Composite from "#lib/ui-components/structure/Composite.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<Composite composite={data.topic} />
```

`./$types` is generated by SvelteKit from the folder: `PageLoad` knows this route has `courseid` and
`loid`, and `PageProps` knows `data` has a `topic` because the load returned one. Rename `topic` in the
load and the page stops compiling. That is an **Unrepresentable Mistake** (L5), kept by `svelte-check`,
which runs in the gate.

All five loads have this shape. Read the lab's to see how little changes:

```ts
const { tree, found: liveLab } = found(await requestLab(params.courseid, url.pathname, fetch));
```

## A route decides nothing

This is the design decision of the rung, and it is easy to miss because it is an absence.

A `load` has a natural way to say "no such page": SvelteKit's `error(404, "message")`. The first version of
this reader did exactly that, inside each route. It worked. Then testing moved to rung 4, the reader had to
be specified first, and a problem appeared: a rule that lives in a `+page.ts` can only be proved by running
SvelteKit, which means running a browser. A scenario could not reach it. Stryker could not mutate it.

So the decision moved. `RUNG.md` records the refactor:

> One refactor made them testable without a browser. The old routes decided what was missing and called
> SvelteKit's `error()` themselves; now `requestLo` and `requestLab` in `course-service.ts` answer with the
> page or with the 404 message, and `routes/(course-reader)/found.ts` only turns the message into a 404.

The course service returns a small union:

```ts
export type PageRequest<T> = { tree: CourseTree; found: T } | { notFound: string };

export async function requestLo<K extends Exclude<PageKind, "lab">>(kind: K, courseId: string, path: string, fetch: Fetch) {
  const tree = await readCourse(courseId, fetch);
  if (!tree) return missingCourse(courseId);
  const lo = findLo(tree, path);
  return lo?.type === kind ? { tree, found: lo } : { notFound: `Not found: a ${kind} at ${path}` };
}
```

and one seven-line file is the only place that turns it into SvelteKit:

```ts
// routes/(course-reader)/found.ts
export function found<T>(request: PageRequest<T>): { tree: CourseTree; found: T } {
  if ("notFound" in request) error(404, request.notFound);
  return request;
}
```

Now the requirement

> R-020 | Unwanted behaviour | If a URL names a course, a page or a lab step that the course does not hold,
> then the reader shall answer 404 with a message that names what is missing. | reader

can be proved by a scenario that never opens a browser:

```gherkin
Scenario: A talk the course does not hold
  Given a host that serves upstream's tutors.json for the shared fixture as the course "found"
  When a learner opens "/talk/found/topic-01-basics/unit-1-intro/no-such-talk"
  Then the reader answers not found with "Not found: a talk at /talk/found/topic-01-basics/unit-1-intro/no-such-talk"
```

The step "a learner opens" calls `openPage` in `tests/bdd/support/reader.ts`, which does what SvelteKit's
router does, in eight lines: pick the route by the path's first segment, take the second as the course id,
call the same function the route's `+page.ts` calls.

Notice also `lo?.type === kind`. The path `/talk/.../note-1-reading` names a real page, but it is a note,
and the talk route must not show it. The check costs one comparison and closes a whole family of wrong
pages.

Three architecture rules keep the decision from sliding back, each with a teaching message:

- the **Framework rule**: `lib/course` does not import `$app/*` or `@sveltejs/kit`;
- the **Plain logic rule**: `lib/course` holds no components and no runes;
- the **Loader rule**: only `course-service.ts` fetches.

Compare upstream's lab load, which decides in the route:

```ts
const lastSegment = url.pathname.substring(url.pathname.lastIndexOf("/") + 1);
if (lastSegment.startsWith("book")) {
  liveLab.setFirstPageActive();
} else {
  liveLab.setActivePage(lastSegment);
}
```

Upstream proves this behaviour too (`@rule-0005`, "the reader shall show that lab with its first step"),
with a larger harness. Rung 5 is smaller, so it moves the decision to where the smallest test can reach
it. The lesson is not "upstream is wrong". It is: **decide where a rule lives by asking what can prove
it**.

## The lab route: one folder, two kinds of URL

The lab is the one route where the rest parameter earns its name. Both of these match
`lab/[courseid]/[...loid]`:

```
/lab/ladder-sample-course/topic-02-practice/unit-1-lab/book-1-first-lab
/lab/ladder-sample-course/topic-02-practice/unit-1-lab/book-1-first-lab/Setup
```

`readLab` tells them apart by asking the tree, not by parsing the name:

```ts
const lab = findLo(tree, path);
if (lab?.type === "lab") return liveLab(lab);                    // R-018: the lab's own route, first step
const cut = path.replace(/\/$/, "").lastIndexOf("/");
const parent = findLo(tree, path.slice(0, cut));                 // otherwise the last segment is a step
return parent?.type === "lab" ? liveLab(parent, path.slice(cut + 1).replace(/\/$/, "")) : undefined;
```

`liveLab` (in `lib/course/live-lab.ts`) returns plain data: the lab, the step, its index, and the steps
either side (R-019). An unknown step gives `undefined`, which `requestLab` turns into
`Not found: a lab step at ...`.

## No server: `ssr = false` and one fallback page

`routes/+layout.ts` is two lines of code:

```ts
export const ssr = false;
export const prerender = false;
```

Every page renders in the browser. Nothing renders on a server, so the build needs no server. The adapter
in `apps/reader/vite.config.ts` writes plain files:

```ts
sveltekit({
  adapter: adapter({ pages: "build", assets: "build", fallback: "200.html" }),
}),
```

After `pnpm build`, `apps/reader/build` holds exactly one HTML file, `200.html`, beside the scripts and the
`courses/` folder. A static host is told to answer any path that is not a file with that page. The page
loads the router, the router reads the address bar, and the route's `load` runs. This is a single-page
app.

Upstream builds its static reader the same way: `staticAdapter()` in
`packages/svelte/app-config/src/svelte.js`, with `STATIC_FALLBACK = '200.html'`. Upstream also has a server
build (`adapter-node`, sign-in, endpoints under `api/`), which arrives on this ladder at rungs 6 and 7. Its
root layout is nonetheless universal, not a server load, and its comment says why:

> The root load is universal, not a server load (Rule 0771): it runs in the browser, so no navigation asks
> for __data.json and the static build (SVELTEKIT_ADAPTER=static) needs no server.

Upstream's `docs/COURSE-PAGE-WALKTHROUGH.md` still lists `apps/reader/src/routes/+layout.server.ts`. That
file is gone. Documentation is L2; the code and its tests are L3 and above. When they disagree, believe
the code and report the drift.

In rung 5 the Rung Fence keeps the choice. Add any `+page.server.ts` or `+layout.server.ts` and the gate
fails with:

```
Rung Fence, rung 5 (Reader): ... is server code. The reader is a static build (adapter-static, ssr = false):
every load runs in the browser. Upstream's server routes serve sign-in and learning records, which arrive
with identity in rung 6 (Guarded). Move the work into a universal +page.ts.
```

## Adding a route, as standard work

Rung 5's `README.md` has the recipe in its "Extension points" table, and `REQUIREMENTS.md` has the order.
Together they are the standard work for a new page:

1. **Specify first.** Take the next id (`pnpm test:ears:audit --next-id`). Write the sentence in
   `REQUIREMENTS.md`, layer `reader`. Copy it as a `Rule:` in `reader.feature` with a scenario. See the
   audit and then the scenario fail.
2. **Logic.** A function in `lib/course` that answers with a `PageRequest`: the page, or the 404 message.
   Unit tests beside the others in `tests/unit/reader`.
3. **Route.** A folder under `(course-reader)`, a `+page.ts` whose load calls the function through
   `found`, a `+page.svelte` that hands `data` to one component.
4. **A way in.** A link a student can click. A route nobody can reach is inventory.
5. **The gate**, then the browser tier if a student can see the change.

This is **pull**. Step 1 exists so that every route starts from a need you can state in one sentence, for a
named customer. If you cannot write the sentence, you have nothing to build yet.

## Which Assertion Ladder rungs guard these rules

| Rule | Level | Where it is kept |
| --- | --- | --- |
| A page's `data` matches what its load returns | L5 Prevented | `./$types`, `svelte-check` in the gate |
| `lib/course` does not use SvelteKit | L4 Explained | Framework rule, `tests/architecture/reader-layers.test.ts` |
| `lib/course` is plain TypeScript | L4 Explained | Plain logic rule |
| Only the course service fetches | L4 Explained | Loader rule |
| No server code in the reader | L4 Explained | `tests/rung-fence.test.ts` |
| R-018, R-019, R-020 hold | L3 Checked | scenarios in `reader.feature`, unit tests in `tests/unit/reader` |
| A click really reaches the page; a 404 is a 404 page | L3 Checked, outside the gate | `pnpm test:e2e` |
| A route decides nothing | L2 Told, L1 Shown | `AGENTS.md`; five routes to imitate |

The last row is the weak one. Nothing fails if you put an `if` in a `+page.ts`. Self-check question 8 asks
what you would do about it.

## Check yourself

1. **(Remember)** What do `[courseid]`, `[...loid]` and `(course-reader)` each mean in a folder name?
2. **(Understand)** Why does the topic load use `url.pathname` and never read `params.loid`?
3. **(Understand)** `apps/reader/build` holds one HTML file. How does a student who bookmarks a lab step
   get that step?
4. **(Apply)** Write the `load` for a new route `/unit/[courseid]/[...loid]`, assuming a function
   `requestUnit` exists in the course service. Which line would you copy from the topic route unchanged?
5. **(Analyse)** `requestLo("talk", ...)` is given the path of a note. Trace what it returns and why.
6. **(Analyse)** Compare upstream's lab load with rung 5's. Each decides "first step or named step" in a
   different place. What can test each one?
7. **(Evaluate)** Upstream's `readTopic` returns `topic ?? course`: an unknown topic shows the course page.
   Rung 5 answers 404. Which serves a student better, and when might upstream's choice be the kinder one?
8. **(Evaluate)** "A route decides nothing" is only Told (L2). Sketch an architecture rule that would raise
   it to L4. What would it look for in a `+page.ts`, and what false alarms might it raise?
