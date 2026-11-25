/**
 * Grading test for the Lite assignment (course topic-03-lite, "Markdown tables").
 * Skipped unless LADDER_ASSIGNMENT=1, so the Single Gate stays green before you start:
 *
 *     LADDER_ASSIGNMENT=1 node --test tests/assignment/*.test.ts
 *
 * The expected HTML is what markdown-it (upstream's renderer) writes for the same input, with the
 * newlines between tags removed. Newlines between tags are ignored here, so either style passes.
 * Do not change the expectations to make the test pass: change src/markdown.ts.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderMarkdown } from "../../src/markdown.ts";
import { buildSite } from "../../src/site-builder.ts";
import type { Course } from "../../src/model.ts";

const skip = process.env.LADDER_ASSIGNMENT !== "1" && "set LADDER_ASSIGNMENT=1 to grade the tables assignment";

/** The renderer's output with whitespace between tags removed. */
const md = (text: string) => renderMarkdown(text).value.replace(/>\s+</g, "><").trim();

test("AC1: a header row, a delimiter row and body rows make a table", { skip }, () => {
  assert.equal(
    md("| Kind | Prefix |\n| --- | --- |\n| talk | talk- |\n| lab | book- |"),
    "<table><thead><tr><th>Kind</th><th>Prefix</th></tr></thead>" +
      "<tbody><tr><td>talk</td><td>talk-</td></tr><tr><td>lab</td><td>book-</td></tr></tbody></table>",
  );
});

test("AC2: the outer pipes are optional", { skip }, () => {
  assert.equal(md("a | b\n--|--\nc | d"), "<table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td>c</td><td>d</td></tr></tbody></table>");
});

test("AC3: colons in the delimiter row align the column", { skip }, () => {
  assert.equal(
    md("| L | C | R |\n|:--|:-:|--:|\n| 1 | 2 | 3 |"),
    '<table><thead><tr><th style="text-align:left">L</th><th style="text-align:center">C</th><th style="text-align:right">R</th></tr></thead>' +
      '<tbody><tr><td style="text-align:left">1</td><td style="text-align:center">2</td><td style="text-align:right">3</td></tr></tbody></table>',
  );
});

test("AC4: a short row gets empty cells, and a table with no body rows has no tbody", { skip }, () => {
  assert.equal(md("| A | B |\n|---|---|\n| 1 |"), "<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td></td></tr></tbody></table>");
  assert.equal(md("| A | B |\n|---|---|"), "<table><thead><tr><th>A</th><th>B</th></tr></thead></table>");
});

test("AC5: cells are inline Markdown: code, emphasis and links", { skip }, () => {
  assert.equal(
    md("| Code | Link |\n|---|---|\n| `npm test` | [**Tutors**](https://tutors.dev) |"),
    '<table><thead><tr><th>Code</th><th>Link</th></tr></thead><tbody><tr><td><code>npm test</code></td><td><a href="https://tutors.dev"><strong>Tutors</strong></a></td></tr></tbody></table>',
  );
});

test("AC6: without a matching delimiter row, pipes are just text in a paragraph", { skip }, () => {
  assert.equal(md("| A | B |\n| not a delimiter |"), "<p>| A | B | | not a delimiter |</p>");
  assert.equal(md("| A | B |\n|---|"), "<p>| A | B | |---|</p>", "the delimiter row must have one cell per header cell");
});

test("AC7: the table ends at a blank line or a line with no pipe", { skip }, () => {
  assert.equal(md("| A |\n|---|\n| 1 |\n\nAfter"), "<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table><p>After</p>");
  assert.equal(md("| A |\n|---|\n| 1 |\nAfter"), "<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table><p>After</p>");
});

test("AC8: every cell is escaped, in the renderer and on a page", { skip }, () => {
  const evil = "<script>alert(1)</script>";
  assert.equal(md(`| ${evil} |\n|---|\n| <img src=x onerror=alert(1)> |`), "<table><thead><tr><th>&lt;script&gt;alert(1)&lt;/script&gt;</th></tr></thead><tbody><tr><td>&lt;img src=x onerror=alert(1)&gt;</td></tr></tbody></table>");
  const course: Course = {
    type: "course", id: "c", title: "C", summary: "", contentMd: "# C", route: "/",
    los: [{
      type: "topic", id: "t", title: "T", summary: "", contentMd: "# T", route: "/topic/t",
      los: [{ type: "note", id: "n", title: "N", summary: "", contentMd: `| A |\n|---|\n| ${evil} |`, route: "/note/n" }],
    }],
  };
  const note = buildSite(course).find((page) => page.path === "t/n/index.html");
  assert.ok(note, "the note has a page");
  assert.match(note.html, /<table>/, "the note's table is rendered");
  assert.doesNotMatch(note.html, /<script/, "a table cell reached the page unescaped");
});
