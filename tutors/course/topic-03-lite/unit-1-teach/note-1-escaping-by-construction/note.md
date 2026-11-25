# Escaping by construction

Why every piece of course text must be escaped before it becomes HTML, why "remember to escape" fails, and
how rung 2 makes the safe form the one you get by default. Paths are relative to
`tutors/variants/rung-2-lite/` unless they name upstream (tutors-mono-repo at `2b96b69`).

## The problem: text that is not yours

Every page rung 2 writes holds text the generator did not write: titles, summaries, step names, URLs, archive
names and whole Markdown bodies. Most of it is harmless. Some of it is not:

~~~
# Arrays <and> objects        <- a title
A "quick" look at 'quotes'     <- a summary
~~~

Put that text into HTML as it is, and the browser reads `<and>` as a tag and a `"` as the end of an
attribute. The page breaks. With a little more effort, an author (or anyone who can edit a course, or open a
pull request against one) puts a script on every reader's page. That is cross-site scripting, XSS, and it is
the most common security defect on the web.

The fix is old and simple: **escape** text before it becomes HTML, so that every character the browser would
treat as markup becomes an entity it shows as text. The hard part is never forgetting.

## Five characters

~~~ts
// src/html.ts
const ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Text as HTML: safe in element content and in quoted attribute values. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ENTITIES[char]!);
}
~~~

| Character | Why it matters |
| --- | --- |
| `<`, `>` | would start or end a tag |
| `&` | would start an entity; replacing it in the same pass means nothing is escaped twice |
| `"`, `'` | would end a quoted attribute value |

These five make text safe in two **contexts**: element content (`<p>here</p>`) and quoted attribute values
(`<a href="here">`). Every attribute rung 2 writes is quoted, so those two contexts are all it has. The
OWASP cheat sheet (linked in this week's practice unit) lists the others (unquoted attributes, inside a
`<script>`, inside CSS, inside a URL), each with its own rules. Rung 2 avoids them by never writing into them.

## Forgetting is the bug

The obvious way to build HTML in JavaScript is a template literal:

~~~ts
const card = `<h3><a href="${dir}index.html">${lo.title}</a></h3>`;            // forgot
const card = `<h3><a href="${dir}index.html">${escapeHtml(lo.title)}</a></h3>`; // remembered, this time
~~~

With string concatenation, the safe form is the one you have to remember, and the unsafe form is the one you
get by default. Fifty templates later, one is forgotten, and no test notices until someone writes a title
with a `<` in it. A coding agent, which writes the obvious form quickly and in volume, forgets at scale.

The Assertion Ladder names the move that fixes this. Do not tell people to remember (L2). Change the
construction so the default is safe, and make the unsafe form something you have to ask for, by name, in a
place a test can watch.

## The Auto-escaping Template

Rung 2's answer is about twenty lines in `src/html.ts`:

~~~ts
/** HTML that is safe to write into a page as it is. */
export class SafeHtml {
  readonly value: string;
  constructor(value: string) { this.value = value; }
}

type Value = string | number | SafeHtml | null | undefined | false | readonly Value[];

function render(value: Value): string {
  if (value instanceof SafeHtml) return value.value;          // already HTML: keep it
  if (Array.isArray(value)) return value.map(render).join("");
  if (value === null || value === undefined || value === false) return "";
  return escapeHtml(String(value));                           // anything else: escape it
}

/** A tagged template: html`<h1>${title}</h1>` escapes `title` unless it is SafeHtml. */
export function html(strings: TemplateStringsArray, ...values: Value[]): SafeHtml {
  return new SafeHtml(strings.reduce((out, string, i) => out + render(values[i - 1]) + string));
}
~~~

A **tagged template** is a function call in disguise. `` html`<h1>${title}</h1>` `` calls
`html(["<h1>", "</h1>"], title)`. The literal parts (`strings`) were typed by the programmer into the source
code, so they are trusted. The values are data, so each one is escaped, unless it is already `SafeHtml`.

~~~ts
html`<h1>${"<b>x</b>"}</h1>`.value          // "<h1>&lt;b&gt;x&lt;/b&gt;</h1>"
html`<p>${html`<b>${"&"}</b>`}</p>`.value   // "<p><b>&amp;</b></p>": nested HTML kept, inner value escaped
html`<ul>${["<a>", html`<li>b</li>`]}</ul>` // arrays: each item rendered by the same rule
html`${null}${undefined}${false}${0}`       // "0": absent values vanish, so `cond && html`...`` works
~~~

Returning `SafeHtml`, not `string`, is what lets templates nest. An inner template's result is marked as
already HTML, so the outer one keeps it rather than escaping it twice.

Now the card is written the obvious way, and the obvious way is safe (`src/site-builder.ts`):

~~~ts
function card(lo: Lo, dir: string): SafeHtml {
  const kind = html`<span class="kind">${lo.type}</span>`;
  switch (lo.type) {
    case "course": case "topic": case "talk": case "note": case "lab":
      return html`<li class="card">${kind}<h3><a href="${dir}index.html">${lo.title}</a></h3><p>${lo.summary}</p></li>`;
    ...
~~~

`lo.title` is a `string`, so it is escaped. `kind` is `SafeHtml`, so it is kept. Nobody had to remember
anything. That is what "by construction" means: the property comes from how the code is built, not from the
care of whoever builds it.

## The Markdown renderer keeps the promise

The biggest piece of course text is the body of a note or a lab step, which is Markdown. `renderMarkdown`
(`src/markdown.ts`) returns `SafeHtml`, which is a strong claim: it says "this output may go into a page
unescaped". The renderer earns it by escaping **first** and adding tags **second**. Inline text is escaped,
then emphasis is applied to the escaped text:

~~~ts
if (i % 2 === 0) return emphasis(escapeHtml(part));   // plain text: escape, then add <strong>/<em>
~~~

Since every `<`, `>`, `&` and quote of the input is already an entity, the only tags in the output are the
ones the renderer itself added. The note "A Markdown subset" walks through the renderer line by line.

## The one way around it, watched

`new SafeHtml(text)` trusts `text` completely. Used on course text, it undoes everything. Rung 2 needs it in
exactly two places: inside `html.ts` (the template itself, and the page's fixed stylesheet) and inside
`markdown.ts` (which escaped its input first). So the rule "only those two files make `SafeHtml`" is kept as a
test with a teaching message (`tests/html.test.ts`):

~~~ts
test("only html.ts and markdown.ts make SafeHtml, because only they escape what they wrap", () => {
  const makers = readdirSync(src).filter((file) => /new SafeHtml\(/.test(readFileSync(join(src, file), "utf8")));
  assert.deepEqual(makers.sort(), ["html.ts", "markdown.ts"],
    "Trusted HTML rule: `new SafeHtml(...)` skips escaping, so it may appear only in src/html.ts and src/markdown.ts. " +
    "Build the HTML with the html`` template instead; it escapes every value for you.");
});
~~~

And `AGENTS.md` puts "adding a file that makes `SafeHtml`" behind the Human Boundary. The escape hatch exists,
but using it in a new place needs a person.

## Escaping is tested on whole pages

Unit tests of `escapeHtml` are not enough; what matters is that no page holds a raw tag. So
`tests/site-builder.test.ts` builds a course in which **every** field of **every** kind is a script tag (the
title, summary and body of the course, a topic, a note, a lab step; a web link's URL; an archive's file name)
and checks every page the site builder returns:

~~~ts
const evil = "<script>alert(1)</script>";
...
for (const page of buildSite(course)) assert.doesNotMatch(page.html, /<script/, `${page.path} contains an unescaped <script>`);
~~~

`AGENTS.md` turns that into standard work: "Every new piece of course text on a page gets a case in the
escaping test." The assignment this week adds tables, and with them a table case.

In Lab 3 you take the shortcut an agent in a hurry might take: build the archive card's heading by hand with
`new SafeHtml(...)`. Two tests fail:

~~~
not ok 11 - only html.ts and markdown.ts make SafeHtml, because only they escape what they wrap
not ok 21 - course text never reaches a page unescaped
  error: 't/index.html contains an unescaped <script>'
~~~

The first (L4) knows **where** escaping may be skipped and names the fix. The second (L3) knows **that** a page
holds a raw tag, and which page. Each would catch breaks the other misses.

## Why this rule stops at L3 and L4, not L5

TypeScript carries part of the rule: `page()` takes its body as `SafeHtml`, not `string`, so a raw string
cannot be passed as a page body by mistake. But `new SafeHtml(text)` is always one call away, and no type can
tell trusted text from course text: both are `string`. Making it L5 would need a branded type whose
constructor only a sanitiser may call, and a sanitiser is rung 6's subject. So the rule climbs to L3 for all
pages and L4 for the one escape hatch, the weakest levels that cover the risk.

## What escaping does not cover

Escaping stops new tags and broken attributes. It does not judge a **URL**:

~~~ts
renderInline("[click](javascript:document.body.remove%28%29)")
// '<a href="javascript:document.body.remove%28%29">click</a>'
~~~

The output is escaped and valid, and it still runs code when clicked. Stopping that needs an allow-list of
URL schemes, which is **sanitising**, not escaping. `RUNG.md` names the gap; rung 6 (Guarded, week 10)
closes it, and the fence that refuses a sanitiser library on this rung says so.

## Upstream chose the other side

Upstream's static site trusts the author. In `packages/jsr/model/src/utils/markdown-utils.ts`, markdown-it is
set up with `html: true` ("Enable HTML tags in source"), so raw HTML in a note reaches the page as markup.
In `packages/jsr/gen/src/templates/template-engine.ts`, the Vento template engine runs with
`autoescape: false`. In Lab 3 you add a `<script>` to a note and build it with both: upstream's page runs it,
rung 2's shows it as text.

Neither is a mistake on its own terms. Lecturers use raw HTML in notes (a `<details>` block, a coloured
`<span>`), and upstream's reader sanitises what it shows. Rung 2 chose the safe default and gives up raw HTML.
Weighing that trade is an Evaluate question, and week 10 returns to it.

## Standard work and waste

Rung 2's `AGENTS.md` has a section rung 1's did not:

~~~
## Escaping

Build HTML only with the `html` tagged template; it escapes every value. Never build HTML by string
concatenation, and never pass course text to `new SafeHtml(...)`. Every new piece of course text on a page
gets a case in the escaping test of `tests/site-builder.test.ts`.
~~~

That is standard work: the agreed way to write a page. The gate (`npm test`, 22 tests) holds the parts that
can be checked, so a defect is caught in the contributor's terminal, not in a student's browser, which is the
most expensive place in the value stream to find one. And the Teaching Failure on the Trusted HTML rule
removes a quieter waste, relearning: whoever meets it, person or agent, is told the fix on the spot instead
of rediscovering it.

## Which levels guard this week's rules

| Rule | Level | Pattern | Where it is kept |
| --- | --- | --- | --- |
| Every kind has a card | L5 Prevented | Unrepresentable Mistake | the `switch` in `card` ends in `assertNever(lo)` |
| Every kind has pages, or says it has none | L5 Prevented | Unrepresentable Mistake | the `switch` in `pagesFor` ends in `assertNever(lo)` |
| A page body is HTML, not a raw string | L5 Prevented | Unrepresentable Mistake | `page(..., body: SafeHtml)` |
| Course text is escaped on every page | L3 Checked | Executable Rule | "course text never reaches a page unescaped" |
| The renderer escapes text, code, link text, URLs and alt text | L3 Checked | Executable Rule | `tests/markdown.test.ts` |
| HTML is built with the `html` template | L1 Shown, L2 Told | Worked Slice, Short Manifest | every template in `src/site-builder.ts`; `AGENTS.md`, "Escaping" |
| Only `html.ts` and `markdown.ts` make `SafeHtml` | L4 Explained | Teaching Failure | `tests/html.test.ts`, "Trusted HTML rule" |
| No dependency, network, other process or client-side script | L4 Explained | Teaching Failure | `tests/rung-fence.test.ts` |
| Weakening an escaping test, or a new `SafeHtml` maker, needs a person | Human Boundary | Human Boundary | `AGENTS.md`, "Ask a human first" |
| `javascript:` URLs are refused | L0 on this rung | (none) | named in `RUNG.md`; rung 6 lifts it |

## Self-check

1. **(Remember)** Which five characters does `escapeHtml` replace, and with what?
2. **(Understand)** In `` html`<a href="${url}">${title}</a>` ``, which parts are trusted and which are
   escaped? Why?
3. **(Understand)** Why does `html` return `SafeHtml` rather than `string`? What would go wrong with nested
   templates otherwise?
4. **(Understand)** Why must the renderer escape **before** it adds `<strong>` and `<em>`?
5. **(Apply)** Write the archive card so that it links the archive file, escaped correctly, using only `html`.
6. **(Analyse)** The Trusted HTML rule and the page escaping test both fail for the shortcut in Lab 3. Describe
   a break that only the first would catch, and one that only the second would catch.
7. **(Evaluate)** Upstream runs markdown-it with `html: true`. Argue for and against that choice from the
   lecturer's and the student's side of the value stream.
8. **(Evaluate)** Should rung 2 reject `javascript:` links now with a small allow-list, rather than waiting for
   rung 6? What does the Rung Fence say, and do you agree?
