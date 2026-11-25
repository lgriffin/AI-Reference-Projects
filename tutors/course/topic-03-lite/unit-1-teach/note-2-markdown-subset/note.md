# A Markdown subset

A Markdown renderer in 74 lines that you can read whole: what it renders, how its block loop and inline
tokenizer work, why the order of its steps matters, and what it leaves out on purpose. From
`tutors/variants/rung-2-lite/src/markdown.ts`.

## Why write one at all?

Upstream renders Markdown with **markdown-it** and a set of plugins (`packages/jsr/model/src/utils/markdown-utils.ts`):
anchors, a table of contents, emoji, sub and sup, mark, footnotes, definition lists, a video directive, a
podcast player, KaTeX for maths and a syntax highlighter. Rung 2's fence forbids every dependency, and the
ladder leaves a full Markdown library to the Summit. So rung 2 has its own renderer: small enough to read,
handling what Tutors courses mostly use, and showing the rest as text. You will understand every line. That is
the point of the rung.

## What it renders

| Markdown | HTML |
| --- | --- |
| `# Title` to `###### Title` | `<h1>` to `<h6>` |
| lines separated by a blank line | `<p>`, lines joined with a space |
| `- a`, `* a`, `+ a` | `<ul><li>` |
| `1. a`, `1) a` | `<ol><li>` |
| a fence of three backticks or tildes, with a language | `<pre><code class="language-ts">` |
| `**bold**`, `*em*`, `_em_` | `<strong>`, `<em>` |
| a code span in backticks | `<code>` |
| `[text](url)`, `![alt](src)` | `<a href>`, `<img>` |

Everything else is a paragraph of escaped text. Nothing is ever dropped.

## Blocks: one loop, one line at a time

~~~ts
export function renderMarkdown(markdown: string): SafeHtml {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.trim() === "") i++;
    else if (fence)   { /* collect to the closing fence, escape it all */ }
    else if (heading) { /* one line */ }
    else if (BULLET.test(line) || NUMBERED.test(line)) { /* collect matching lines */ }
    else              { /* a paragraph, until a blank line or a new block */ }
  }
  return new SafeHtml(out.join("\n"));
}
~~~

Each branch starts at line `i`, consumes the lines it owns, and leaves `i` at the next unclaimed line. Adding a
block (a table, a quote) means adding one branch, before the paragraph. That is exactly what this week's
assignment asks you to do.

## Code fences come first

~~~ts
const FENCE = /^(```|~~~)\s*([\w+-]*)/;
...
} else if (fence) {
  const code: string[] = [];
  for (i++; i < lines.length && !lines[i]!.startsWith(fence[1]!); i++) code.push(lines[i]!);
  i++; // the closing fence
  const language = fence[2] ? ` class="language-${escapeHtml(fence[2])}"` : "";
  out.push(`<pre><code${language}>${escapeHtml(code.join("\n"))}</code></pre>`);
}
~~~

Inside a fence nothing is Markdown: `**not bold**` stays as written, and every character is escaped. The
closing fence must use the same marker it opened with, so a fence of tildes can hold backticks.

## Paragraphs end where a block begins

~~~ts
const startsBlock = (line: string) => FENCE.test(line) || HEADING.test(line) || BULLET.test(line) || NUMBERED.test(line);
...
for (; i < lines.length && lines[i]!.trim() !== "" && (paragraph.length === 0 || !startsBlock(lines[i]!)); i++)
  paragraph.push(lines[i]!.trim());
out.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
~~~

A paragraph takes lines until a blank line or a line that starts another block, so a list straight after a
sentence is still a list. CommonMark has the same idea, with many more cases.

## Inline: tokens first, emphasis second

~~~ts
/** Code spans, images and links: rendered whole, so emphasis never reaches inside a URL. */
const TOKEN = /(`[^`]*`|!\[[^\]]*\]\([^)\s]*\)|\[[^\]]+\]\([^)\s]*\))/;

export function renderInline(text: string): string {
  return text.split(TOKEN).map((part, i) => {
    if (i % 2 === 0) return emphasis(escapeHtml(part));                     // plain text
    if (part.startsWith("`")) return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
    const [, bang, label, url] = part.match(/^(!?)\[([^\]]*)\]\(([^)\s]*)\)$/)!;
    return bang ? `<img src="${escapeHtml(url!)}" alt="${escapeHtml(label!)}">`
                : `<a href="${escapeHtml(url!)}">${emphasis(escapeHtml(label!))}</a>`;
  }).join("");
}
~~~

`split` with a capturing group keeps the tokens at the odd indexes and the plain text at the even ones. So
each piece is handled by exactly one rule.

## Why the order matters

~~~ts
assert.equal(renderInline("[x](https://a.dev/a_b_c)"), '<a href="https://a.dev/a_b_c">x</a>');
assert.equal(renderInline("snake_case_name"), "snake_case_name");
assert.equal(renderInline("`a *b* c`"), "<code>a *b* c</code>");
~~~

If emphasis ran first, `a_b_c` inside a URL would become `a<em>b</em>c`, and a code span would lose its
asterisks. Cutting the tokens out first means each rule sees only the text it owns. And `_em_` needs a
non-word character on each side, so `snake_case_name` is left alone.

The second ordering rule is the one the note "Escaping by construction" depends on: `emphasis` receives
**escaped** text, so the only tags in its output are `<strong>` and `<em>`, which it added itself.

## The tests are the specification

~~~ts
// tests/markdown.test.ts
test("headings, paragraphs and lists", () => {
  assert.equal(md("# Title\n\nOne\ntwo\n\n## Next"), "<h1>Title</h1>\n<p>One two</p>\n<h2>Next</h2>");
  assert.equal(md("- a\n- b\n\n1. c\n2. d"), "<ul><li>a</li><li>b</li></ul>\n<ol><li>c</li><li>d</li></ol>");
});
~~~

One input, one exact output. The assignment's grading test is written the same way, with markdown-it's
output as the oracle, as rung 1's conformance test used upstream's `tutors.json`.

## What it leaves out, and what that costs

| Left out | What an author sees |
| --- | --- |
| tables | the pipes, as a paragraph (the assignment fixes this) |
| block quotes, horizontal rules | the `>` or `***`, as text |
| nested lists | a flat list |
| raw HTML in Markdown | the tags, escaped, as text |
| setext headings, reference links, footnotes | the source, as text |
| maths, Mermaid, highlighting | the source, in a paragraph or a code block |

Every gap shows the author's source, escaped. A gap is visible, never dangerous. In Lean terms, the renderer
avoids the waste of extra features: it does what the courses in front of it need, and each addition (like
tables) is pulled by a real course, not pushed in case it is useful.

## Self-check

1. **(Remember)** Which Markdown blocks does rung 2 render, and what happens to the rest?
2. **(Understand)** Why does the fence branch come before the heading branch?
3. **(Understand)** What does `split` with a capturing group return, and why are tokens at odd indexes?
4. **(Apply)** Predict the output of `renderInline("**a** [b_c](https://x.dev/b_c)")`, then check it with
   `node -e`.
5. **(Analyse)** A table needs two lines to recognise. Which part of the block loop has to change, and why
   must the new branch come before the paragraph branch?
6. **(Evaluate)** Is a flat list a better gap than dropping nested items? Who in the value stream sees the
   difference?
