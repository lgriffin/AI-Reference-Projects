# Runes and component layering

How rung 5's reader turns data into what a student sees: Svelte 5 components, the runes that keep them up
to date, the shared state that the shell reads, and the three UI layers that mirror upstream's packages.
With one trap that no unit test can see. Worked from `tutors/variants/rung-5-reader` and tutors-mono-repo
at `2b96b69`.

## Where we are on the ladder

Week 9, the second and last week of **rung 5 (Reader)**. Week 8 followed a URL as far as
`return { topic }` at the end of a `load` function. This note picks up on the other side of that line, in
the `.svelte` files. The second note this week asks how any of it is specified and proved. The rung's
assignment, a pager, is a component with its logic in plain TypeScript, so everything here is preparation
for it.

## A component is a file with three parts

Open `apps/reader/src/lib/ui-components/layout/Cards.svelte`. It is the whole card grid:

```svelte
<script lang="ts">
  import type { Lo } from "@ladder/model";
  import { cardRoute } from "../../course/lo-tree.ts";
  import Card from "./Card.svelte";

  let { los = [] }: { los?: Lo[] } = $props();
</script>

{#if los.length > 0}
  <ul class="cards">
    {#each los as lo (lo.route)}
      <li><Card cardDetails={{ route: cardRoute(lo), title: lo.title, type: lo.type, summary: lo.summary }} /></li>
    {/each}
  </ul>
{/if}

<style>
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); gap: 1rem; ... }
</style>
```

- The **script** declares what the component takes in. `$props()` is the only way in.
- The **markup** is HTML with three additions used here: `{expression}`, `{#if}` and `{#each}`. The
  `(lo.route)` after `{#each ... as lo` is a **key**: it tells Svelte which card is which when the list
  changes, so it moves cards instead of rewriting them.
- The **style** is scoped. `.cards` here cannot leak into another component, and another component's
  `.cards` cannot leak in. Svelte also warns about a selector that matches nothing, and the reader's gate
  treats warnings as errors. You will see that matter in the lab.

There is no `render` function, no virtual DOM to reason about, and no `this`. The compiler turns the file
into code that updates exactly the parts of the page that depend on what changed. Runes are how it knows
what depends on what.

## The runes the reader uses

A rune is a compiler keyword that starts with `$`. It is not imported. Rung 5 uses three, and names a
fourth.

### `$props`: what comes in

```ts
let { cardDetails }: { cardDetails: CardDetails } = $props();
```

Props flow down, from parent to child. The type annotation is ordinary TypeScript, and `svelte-check`
(which runs in `pnpm typecheck`, the first part of the gate) checks every place the component is used
against it. Pass `Card` a `summary` that might be `undefined` and the gate fails before a test runs.

### `$state`: a value that changes

The home page is the smallest example in the reader (`src/routes/+page.svelte`):

```svelte
<script lang="ts">
  let courseId = $state("ladder-sample-course");
</script>

<label>Course id <input bind:value={courseId} /></label>
<a href={`/course/${courseId}`}>Open the course</a>
```

`courseId` is a variable. Assign to it, or let `bind:value` assign to it as the student types, and
everything that reads it is updated: here, the link's `href`. There is no handler and no "set state" call.

### `$derived`: a value computed from others

```svelte
<!-- ui-components/structure/Composite.svelte -->
let { composite }: { composite: Course | Topic } = $props();
const { units, sides, standardLos } = $derived(arrange(composite));
```

`arrange` (in `lib/course/lo-tree.ts`) sorts a composite's children into unit boxes, side boxes and loose
cards. `$derived` says: whenever `composite` changes, compute this again.

Why would `composite` change? Because SvelteKit **reuses** components. Navigate from one topic to another
and the route is the same folder, so the same `Composite` instance stays on the page and receives a new
prop. Without `$derived`, `arrange` would run once, when the component was created, and the second topic
would show the first topic's cards. Svelte knows this is a likely mistake and warns:

```
WARNING "src/lib/ui-components/structure/Composite.svelte" 14:49 "This reference only captures the initial
value of `composite`. Did you mean to reference it inside a closure instead?
https://svelte.dev/e/state_referenced_locally"
```

The reader's `check` script is `svelte-check --fail-on-warnings`, so in rung 5 that warning is a red gate.
Upstream makes the opposite choice: `onwarn` in `packages/svelte/app-config/src/svelte.js` returns early
for exactly this code, `state_referenced_locally`. A codebase with hundreds of components and a long
history may have many deliberate one-time reads, and a warning that fires on all of them teaches people to
ignore warnings. A new, small codebase can afford to treat every one as a defect. Neither is wrong. It is
a judgement about where a rule should sit on the Assertion Ladder, and you are asked to make it in the
self-check.

### `$effect`: after the page updates

Rung 5 has none. Upstream's root layout has one that sets `<html lang>` when the locale changes
(`apps/reader/src/routes/+layout.svelte`). An effect is for reaching outside Svelte: the document, a timer,
a third-party widget. If you find yourself using one to compute a value, you wanted `$derived`.

## Sharing state: a rune behind `.value`

Props go down. But the top bar needs the current course, and the top bar is not a child of the page: it
wraps it. Passing the course up and around would be awkward. The reader shares it instead
(`src/lib/runes/index.svelte.ts`):

```ts
export const rune = <T>(initialValue: T) => {
  let value = $state(initialValue);
  return {
    get value() { return value; },
    set value(next: T) { value = next; },
  };
};

export const currentCourse = rune<CourseTree | null>(null);
export const currentLo = rune<Lo | null>(null);
```

The file is named `.svelte.ts` because runes only work in files the Svelte compiler processes. The
getter and setter matter: `$state` is tracked when it is **read**, so the object must read it each time
`.value` is asked for, not copy it once.

Each `load` writes; components read:

```ts
// routes/(course-reader)/topic/[courseid]/[...loid]/+page.ts
currentCourse.value = tree;
currentLo.value = topic;
```

```svelte
<!-- ui-navigators/TutorsShell.svelte -->
const course = $derived(currentCourse.value?.course);
```

Upstream has the same `rune` function, word for word apart from a variable name, in
`packages/svelte/runes/src/index.svelte.ts`, and the same two runes among a dozen others. There they are
created lazily, behind another getter, because upstream also renders on a server, where module-level
state would be shared between visitors. Rung 5 never renders on a server (`ssr = false`), so it can be
plain.

### The trap: what you read is not what you wrote

This is the most important paragraph in the note, because nothing in the gate will tell you.

`$state` makes plain objects and arrays **deeply reactive**. It does so by wrapping them in a JavaScript
`Proxy`. So:

```ts
currentLo.value = note;              // note is a plain object from the tree
currentLo.value.title                // "Reading Guide": property reads pass straight through
currentLo.value === note             // false: you get the proxy, not the object
```

For almost everything this is invisible. It stops being invisible the moment you use the value's
**identity**. And the tree does:

```ts
// lib/course/lo-tree.ts
parents: Map<Lo, Composite>;         // keyed by the object itself

export function breadCrumbs(tree: CourseTree, lo: Lo): PageLo[] {
  const crumbs: PageLo[] = [];
  for (let at: Lo | undefined = lo; at; at = tree.parents.get(at)) if (isPage(at)) crumbs.unshift(at);
  return crumbs;
}
```

A `Map` is not proxied, and its keys are the original objects. Hand `breadCrumbs` the proxy from
`currentLo.value` and `tree.parents.get(proxy)` is `undefined`: the page appears to have no parents. The
function is correct. Its unit tests pass. Its scenario passes. The breadcrumb in the browser would be one
item long.

Why does the reader not already have this bug? Look at who calls `breadCrumbs`:

```svelte
<!-- ui-navigators/SecondaryNavigator.svelte -->
let { lo }: { lo: Lo } = $props();
const crumbs = $derived(currentCourse.value ? breadCrumbs(currentCourse.value, lo) : []);
```

`lo` arrives as a **prop**, from the page's `data`, which is the original object. Only the tree comes
through the rune, and reading `tree.parents` through a proxy still gives the real `Map`. It works because
of where the object came from, which is exactly the kind of thing that is easy to change without noticing.

The habit that makes the trap harmless: **across a rune, identify things by value**. A route is a string;
two equal strings are equal whichever side of a proxy they are on. In Lab 9 you write a function that
takes the object, watch the browser disagree with a green gate, and change it to take the route. The
assignment's hint says the same thing in its own words: find the neighbours "by its `route`".

## Snippets: what a parent puts inside

A layout wraps a page. The page arrives as a **snippet** named `children`:

```svelte
<!-- ui-navigators/TutorsShell.svelte -->
<script lang="ts">
  import type { Snippet } from "svelte";
  let { children }: { children: Snippet } = $props();
</script>

<a class="skip" href="#main-content">Skip to content</a>
<header>...</header>
<main id="main-content" tabindex="-1">
  {@render children()}
</main>
```

Snippets replace Svelte 4's slots. If an example or an agent gives you `<slot />`, it was written for an
older Svelte. The same goes for `on:click` (now `onclick`) and `export let` (now `$props`).

The three lines of markup are also the reader's accessibility frame, mirrored from upstream's
`TutorsShell`: a skip link, one `main` landmark, and `tabindex="-1"` so that the course layout can move
focus there after each navigation.

## Three layers, one direction

The reader's `src/lib` has five folders. Three hold components.

```
src/lib/ui-components    Card, Cards, Units, Composite, Note, Lab      show learning objects
src/lib/ui-navigators    TutorsShell, SecondaryNavigator               frame a page
src/lib/ui-primitives    Icon, Markdown, lo-colours                    smallest pieces, no data
src/lib/runes            currentCourse, currentLo                      shared state
src/lib/course           course-service, lo-tree, live-lab             plain TypeScript
```

Each folder imports only from folders beneath it. `tests/architecture/reader-layers.test.ts` states that
as data:

```ts
"lib/ui-primitives": { may: [], kit: false,
  job: "primitives (Icon, Markdown) are the smallest pieces; like upstream's ui-primitives they import no data, so any layer above can use them" },
"lib/ui-navigators": { may: ["lib/ui-primitives", "lib/runes", "lib/course"], kit: true,
  job: "navigators (the shell, the breadcrumbs) frame a page; they sit below the components, as upstream's ui-navigators" },
"lib/ui-components": { may: ["lib/ui-navigators", "lib/ui-primitives", "lib/runes", "lib/course"], kit: true,
  job: "components (Card, Composite, Lab) show learning objects" },
```

`may` is what the layer may import; `kit` is whether it may use SvelteKit; `job` is the reason, which the
failure message quotes. Make `Icon.svelte` import a rune and the gate says:

```
Reader layering rule: lib/ui-primitives may import only [nothing else in the reader], because primitives
(Icon, Markdown) are the smallest pieces; like upstream's ui-primitives they import no data, so any layer
above can use them. Pass what you need down as a prop, or move the code to the layer that may import it
(README.md, The reader).
  apps/reader/src/lib/ui-primitives/Icon.svelte imports "../runes/index.svelte.ts" (lib/runes)
```

Why should a primitive not read `currentLo`? Because the moment it does, it can only be used on a page that
has a current learning object. A primitive that takes everything as props can be used anywhere, by any
layer, in any test. The rule protects reuse, and it removes a Lean waste you met in week 4: coupling that
turns one change into several.

### The same three layers upstream

Upstream's are packages, not folders: `packages/svelte/ui-primitives`, `ui-navigators` and `ui-components`.
`ARCHITECTURE.md` gives the direction in one sentence:

> The one-directional dependency flow is: `ui-components` -> `ui-navigators` -> `ui-primitives`.

and `.dependency-cruiser.cjs` gives the primitive rule its reason:

```js
name: "ui-primitives-no-data-features",
comment: "UI primitives are low-level presentational components: they take users, events and permissions
  as props or context, and never reach into the data and access packages (community, connect, data-api,
  rbac) themselves. Theme and tour services stay allowed.",
```

`tests/architecture/dependency-rules.test.ts` then does something rung 5's test does not: for each layer
rule (`layer-ui-primitives`, `layer-ui-navigators`, `layer-ui-components`) it runs the rule against a
small fixture file that reaches up, and expects a violation. A rule that has been proved able to fail is
worth more than one that has only ever passed.

Rung 5 mirrors the component files by name, so you can open them side by side:

| Rung 5 (`src/lib/`) | Upstream (`packages/svelte/`) |
| --- | --- |
| `ui-components/layout/Card.svelte`, `Cards.svelte`, `Units.svelte` | `ui-components/src/learning-objects/layout/` |
| `ui-components/structure/Composite.svelte` | `ui-components/src/learning-objects/structure/Composite.svelte` |
| `ui-components/content/Note.svelte`, `lab/Lab.svelte` | `ui-components/src/learning-objects/content/` |
| `ui-navigators/TutorsShell.svelte`, `SecondaryNavigator.svelte` | `ui-navigators/src/` |
| `ui-primitives/Icon.svelte` | `ui-primitives/src/components/Icon.svelte` |
| `ui-primitives/lo-colours.ts` | `themes/src/styles/lo-colours.ts` |

Upstream's are larger: locks, themes, images, video, translation. The shape is the same, which is the
point of a ladder.

## Two rules the compiler keeps for you

**Escaping.** `{cardDetails.summary}` is escaped by Svelte: course text can never become markup. The one
way round it is `{@html ...}`, and the reader has exactly one, in `ui-primitives/Markdown.svelte`, applied
to what `renderMarkdown` from `@ladder/lite` returns. You built that function in week 3 to escape every
character before adding a tag. The Raw HTML rule fails on `{@html` anywhere else and says where sanitising
arrives (rung 6).

**A colour per kind.** `ui-primitives/lo-colours.ts` is a `Record<LoType, string>`. Add a kind to
`@ladder/model` and it does not compile until the kind has a colour. Week 2's Unrepresentable Mistake,
now in a user interface.

## Lean: components and the student

Two of this week's ideas are Lean ideas in plain clothes.

- **A component should show, not decide.** Every decision left in a component is a decision only a
  browser can check, and a browser check is slow and says little when it fails. Moving the decision to
  `lib/course` shortens the feedback loop from seconds-with-a-browser to milliseconds. Shorter loops mean
  defects are found where they are made, which is the cheapest place.
- **The student's screen is where value is delivered.** The proxy trap above is a defect that passes every
  check in the gate and reaches the student. The countermeasure is not heroics. It is one habit (compare
  values) and one check in the right place (the browser tier).

## Which Assertion Ladder rungs guard these rules

| Rule | Level | Where it is kept |
| --- | --- | --- |
| A component is given the props it declares | L5 Prevented | `svelte-check`, in the gate |
| Every kind has a colour | L5 Prevented | `Record<LoType, string>` in `lo-colours.ts` |
| Course text is escaped | L5 by default | Svelte's `{text}` |
| A computed value follows its inputs (`$derived`) | L4 Explained | Svelte's warning, made an error by `--fail-on-warnings` |
| UI layers point down; primitives import no data | L4 Explained | Reader layering rule |
| Only `Markdown.svelte` writes raw HTML | L4 Explained | Raw HTML rule |
| Skip link, `main#main-content`, `aria-current`, labelled controls | L2 Told, L3 in part | `AGENTS.md`, "Escaping and accessibility"; the smoke test checks some |
| Compare values, not objects, across a rune | L1 Shown, L2 if you write it down | this note; `SecondaryNavigator` as the example |

The last row is the weakest in the rung. It is a real rule, with a real failure, kept by nothing but
example. Raising it is a good Kaizen.

## Check yourself

1. **(Remember)** Name the three parts of a `.svelte` file and the rune that declares a component's inputs.
2. **(Understand)** Why does `Composite.svelte` need `$derived(arrange(composite))` when `composite` is
   "just a prop"?
3. **(Understand)** Why is the runes file named `index.svelte.ts`, and why does `rune` return a getter
   instead of the value?
4. **(Apply)** Write a component `Count.svelte` that takes `los: Lo[]` and shows "3 learning objects",
   using `$props` and `$derived`. Which layer does it belong in, and why?
5. **(Analyse)** `breadCrumbs(currentCourse.value, lo)` works in `SecondaryNavigator`. Explain precisely
   why it would fail if `lo` were `currentLo.value`, naming the data structure involved.
6. **(Analyse)** A primitive imports `currentLo`. Which test fails, what reason does its message give, and
   what does the suggested fix ("pass what you need down as a prop") protect?
7. **(Evaluate)** Rung 5 fails the gate on `state_referenced_locally`; upstream silences it. Argue each
   side in two sentences, then say at what size of codebase you would switch.
8. **(Evaluate)** "Compare values, not objects, across a rune" is L1. Propose a way to raise it to L3 or
   L4. What would the check look at, and what would its message say?
