# Assertion levels in rung 2

Where each rule of the Lite variant is kept on the Assertion Ladder, what the Rung Fence allows, and what
lifting it would mean. Paths are relative to `tutors/variants/rung-2-lite/`.

## The rules, level by level

| Rule | Level | Pattern | Where it is kept |
| --- | --- | --- | --- |
| Every kind has a card | L5 Prevented | Unrepresentable Mistake | the `switch` in `card` (`src/site-builder.ts`) ends in `assertNever(lo)` |
| Every kind has pages, or says it has none | L5 Prevented | Unrepresentable Mistake | the `switch` in `pagesFor` ends in `assertNever(lo)`; `web` and `archive` return `[]` on purpose |
| A field is read only on the kind that has it | L5 Prevented | Unrepresentable Mistake | narrowing on `lo.type`: `lo.archiveFile` compiles only inside `case "archive"` |
| Course text is escaped on every page | L3 Checked | Executable Rule | "course text never reaches a page unescaped" in `tests/site-builder.test.ts`, for every field of every kind |
| The renderer escapes text, code, link text, URLs and alt text | L3 Checked | Executable Rule | `tests/markdown.test.ts` |
| HTML is built with the `html` template, which escapes by default | L1 Shown, then L3 | Worked Slice | every template in `src/site-builder.ts`; `tests/html.test.ts` pins the template's behaviour |
| Only `html.ts` and `markdown.ts` make `SafeHtml` | L4 Explained | Teaching Failure | `tests/html.test.ts`, "Trusted HTML rule", which names the fix |
| Pages are at upstream `tutors-lite`'s paths | L3 Checked | Executable Rule | "the fixture renders a page per course, topic, talk, note and lab step, at upstream's paths" |
| The generator still agrees with upstream | L3 Checked | Executable Rule | `tests/conformance.test.ts` |
| No dependency, no package import, no network, no other process, no client-side script | L4 Explained | Teaching Failure | `tests/rung-fence.test.ts` |
| Never build HTML by concatenation; a new piece of course text gets an escaping case | L2 Told | Short Manifest | `AGENTS.md`, "Escaping" |
| Weakening an escaping test, or adding a file that makes `SafeHtml`, needs a person | Human Boundary | Human Boundary | `AGENTS.md`, "Ask a human first" |
| One command says the work is done | all | Single Gate | `npm test` (22 tests) |

## Why escaping sits at L3, not L5

TypeScript could carry part of the rule: `page()` takes its body as `SafeHtml`, not `string`, so a raw
string cannot be passed as a page body by mistake. But `new SafeHtml(text)` is always one call away, and a
type cannot tell trusted text from course text. So the rule climbs to L3 (a test over every page) and to
L4 for the one escape hatch (a test that names the only files allowed to use it). That is the weakest
level that covers the risk; a stronger one would need a branded type and a sanitiser, which is rung 6.

## What the Rung Fence allows

| Allowed | Refused, and where it arrives |
| --- | --- |
| `node:` built-ins and relative imports | npm packages, including a Markdown library (rung 4, Reader) |
| writing HTML pages | client-side script, `onclick=` and friends (rung 4, Reader, with Svelte) |
| no dependency at all | TypeScript as a dev dependency (rung 3, Layers); a sanitiser (rung 6, Guarded) |
| reading a folder, writing files | network access (rung 4, Reader); other processes or threads (no rung) |

The change from rung 1 is one rule: "HTML output" became "client-side JavaScript". Compare the two
`FORBIDDEN` lists side by side: that is the fence's Rung Delta.

## What lifting the fence means

Rung 3 (Layers) keeps the behaviour and changes the structure: it adds `typescript` and `@types/node` as
root dev dependencies and allows `@ladder/*` workspace imports. A person makes that change, in its own
commit, after reading rung 3's `RUNG.md`. If an agent wants a Markdown library to "do tables properly", the
fence sends it to rung 4; on this rung, extend `src/markdown.ts`, which is the assignment.

## Upstream, for comparison

Upstream keeps the escaping rule lower and in a different place. markdown-it runs with `html: true` and
Vento with `autoescape: false`, so the static site trusts the author (L0 for injected markup). The reader
sanitises what it shows, which is rung 6's subject. Upstream's `course-emitter.ts` decides pages with a
chain of `if` statements and casts, so a new kind gets no page without a word (L0); rung 2's two switches
make that L5.
