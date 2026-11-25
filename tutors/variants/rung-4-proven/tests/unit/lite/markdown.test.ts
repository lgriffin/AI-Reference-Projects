import { test } from "vitest";
import assert from "node:assert/strict";
import { renderInline, renderMarkdown } from "@ladder/lite";

const md = (text: string) => renderMarkdown(text).value;

test("headings, paragraphs and lists", () => {
  assert.equal(md("# Title\n\nOne\ntwo\n\n## Next"), "<h1>Title</h1>\n<p>One two</p>\n<h2>Next</h2>");
  assert.equal(md("- a\n- b\n\n1. c\n2. d"), "<ul><li>a</li><li>b</li></ul>\n<ol><li>c</li><li>d</li></ol>");
});

test("code fences keep their text and name their language", () => {
  assert.equal(md("```ts\nconst a = 1;\n**not bold**\n```"), '<pre><code class="language-ts">const a = 1;\n**not bold**</code></pre>');
  assert.equal(md("~~~\nplain\n~~~"), "<pre><code>plain</code></pre>");
});

test("links, images, code spans and emphasis", () => {
  assert.equal(renderInline("[Tutors](https://tutors.dev)"), '<a href="https://tutors.dev">Tutors</a>');
  assert.equal(renderInline("![a cat](img/cat.png)"), '<img src="img/cat.png" alt="a cat">');
  assert.equal(renderInline("**bold**, *em* and _em_"), "<strong>bold</strong>, <em>em</em> and <em>em</em>");
  assert.equal(renderInline("`a *b* c`"), "<code>a *b* c</code>");
  assert.equal(renderInline("[x](https://a.dev/a_b_c)"), '<a href="https://a.dev/a_b_c">x</a>', "emphasis never reaches inside a URL");
  assert.equal(renderInline("snake_case_name"), "snake_case_name");
});

test("every piece of input is escaped: text, code, link text, URLs and alt text", () => {
  assert.equal(md("<script>alert(1)</script>"), "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
  assert.equal(md("```\n</code><script>x</script>\n```"), "<pre><code>&lt;/code&gt;&lt;script&gt;x&lt;/script&gt;</code></pre>");
  assert.equal(renderInline("[<b>hi</b>](x)"), '<a href="x">&lt;b&gt;hi&lt;/b&gt;</a>');
  assert.equal(renderInline('[x](https://a.dev/"onmouseover="alert(1))'), '<a href="https://a.dev/&quot;onmouseover=&quot;alert(1">x</a>)');
  assert.equal(renderInline('![" onerror="alert(1)](a.png)'), '<img src="a.png" alt="&quot; onerror=&quot;alert(1)">');
  assert.equal(renderInline("`<i>`"), "<code>&lt;i&gt;</code>");
  assert.equal(md("# <img src=x onerror=alert(1)>"), "<h1>&lt;img src=x onerror=alert(1)&gt;</h1>");
});

// Added in rung 5 to kill mutants that survived the first Stryker run (see RUNG.md, "Mutation testing").

test("block marks count only at the start of a line", () => {
  assert.equal(md("C# is # fun"), "<p>C# is # fun</p>");
  assert.equal(md("x - y and 1. z"), "<p>x - y and 1. z</p>");
  assert.equal(md("#  Two spaces"), "<h1>Two spaces</h1>");
});

test("list items take the whole line, after any indent and any spaces", () => {
  assert.equal(md("- apple\n-  pear\n - plum"), "<ul><li>apple</li><li>pear</li><li>plum</li></ul>");
  assert.equal(md("10. ten\n11.  eleven\n 12) twelve"), "<ol><li>ten</li><li>eleven</li><li>twelve</li></ol>");
});

test("a fence closes only on a line that starts with it, and old Mac line ends split lines", () => {
  assert.equal(md("```\nx ```\n```"), "<pre><code>x ```</code></pre>");
  assert.equal(md("# T\rText"), "<h1>T</h1>\n<p>Text</p>");
  assert.equal(md("a\n   \nb"), "<p>a</p>\n<p>b</p>");
});

test("underscores make emphasis only around whole words", () => {
  assert.equal(renderInline("_a_ b"), "<em>a</em> b");
  assert.equal(renderInline("_a_b"), "_a_b");
});
