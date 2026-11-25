/**
 * V021's parts, one decision at a time (R-025): which sources a page uses, where each one lands, and which
 * land outside. Added in rung 6 for the mutants that survived the first Stryker run over portable.ts.
 */
import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { outsideWarning, pageSources, reachesOutside, resolveSource } from "@ladder/gen";

describe("pageSources: every image and link a page uses, outside code", () => {
  const CASES: [markdown: string, sources: string[]][] = [
    ["[a](one.md)", ["one.md"]],
    ["![a](img/one.png)", ["img/one.png"]],
    ["[a]( spaced.md )", ["spaced.md"]],
    ["[a](<with space.md>)", ["with space.md"]],
    ['[a](titled.md "A title")', ["titled.md"]],
    ["[a](titled.md 'A title')", ["titled.md"]],
    ['[a](titled.md   "A longer title"  )', ["titled.md"]],
    ["[a](one.md) and [b](two.md) and [again](one.md)", ["one.md", "two.md"]],
    ["[ref]: ../up.md", ["../up.md"]],
    ["   [ref]:   <../angle up.md>", ["../angle up.md"]],
    ["[ref]:../tight.md", ["../tight.md"]],
    ["text [ref]: not-a-definition.md", []],
    ['<a href="../x.html">x</a>', ["../x.html"]],
    ['<a class="c" href = "../spaced.html">x</a>', ["../spaced.html"]],
    ["<IMG alt='a' SRC='../y.png'>", ["../y.png"]],
    ['<img alt="a" src="../z.png">', ["../z.png"]],
    ["`[code](../no.md)`", []],
    ["```\n[fenced](../no.md)\n```", []],
    ["~~~\n[fenced](../no.md)\n~~~\n[after](yes.md)", ["yes.md"]],
    ["text ``` not a fence [a](yes.md)\n```\nstill prose [b](also.md)", ["yes.md", "also.md"]],
    ["```\n[in](../no.md)\ntext ``` not the end [still in](../no.md)\n```\n[out](yes.md)", ["yes.md"]],
    ["nothing here", []],
  ];
  for (const [markdown, sources] of CASES) test(JSON.stringify(markdown), () => assert.deepEqual(pageSources(markdown), sources));
});

describe("resolveSource: where a source lands, from the page's folder", () => {
  const CASES: [folder: string, source: string, lands: string | null][] = [
    ["topic-1/note-1", "img/a.png", "topic-1/note-1/img/a.png"],
    ["topic-1/note-1", "./img//a.png", "topic-1/note-1/img/a.png"],
    ["topic-1/note-1", "../other/b.md", "topic-1/other/b.md"],
    ["topic-1/note-1", "../../course.md", "course.md"],
    ["topic-1/note-1", "../../../above.md", null],
    ["", "course.md", "course.md"],
    ["", "../above.md", null],
    ["topic-1", "a.md?query#frag", "topic-1/a.md"],
    ["topic-1", "a.md#frag?not-a-query", "topic-1/a.md"],
    ["topic-1", "a%20b.md", "topic-1/a b.md"],
    ["topic-1", "100%.md", "topic-1/100%.md"],
    ["topic-1", "https://tutors.dev/x", null],
    ["topic-1", "MAILTO:a@b.c", null],
    ["topic-1", "x-my+scheme.1:y", null],
    ["topic-1", "/absolute/path.md", null],
    ["topic-1", "#top", null],
    ["topic-1", "notes/see:also.md", "topic-1/notes/see:also.md"],
    ["topic-1", "1:1.md", "topic-1/1:1.md"],
    ["topic-1", "a_b:c.md", "topic-1/a_b:c.md"],
  ];
  for (const [folder, source, lands] of CASES) test(`${JSON.stringify(source)} from "${folder}"`, () => assert.equal(resolveSource(folder, source), lands));
});

describe("reachesOutside: the sources that leave the page's own folder", () => {
  const outside = (markdown: string) => reachesOutside("topic-1/note-1", markdown);
  test("inside, the folder itself, the web, a fragment and an absolute path are not reported", () => {
    assert.deepEqual(outside("[a](img/a.png) [b](.) [c](https://tutors.dev) [d](#top) [e](/abs) [f](../note-1/x.md)"), []);
  });
  test("a sibling folder, a folder whose name only starts the same, and the parent are outside", () => {
    assert.deepEqual(outside("[a](../note-2/x.md) [b](../note-10/x.md) [c](..)"), ["../note-2/x.md", "../note-10/x.md", ".."]);
  });
  test("above the course is outside only when the source climbs: ../ or ./../", () => {
    assert.deepEqual(outside("[a](../../../x.md) [b](./../../../y.md)"), ["../../../x.md", "./../../../y.md"]);
    assert.deepEqual(reachesOutside("", "[a](../x.md) [b](https://tutors.dev/../x) [c](/../x)"), ["../x.md"]);
  });
});

test("the warning is upstream's V021, word for word, with the page and the source", () => {
  assert.equal(
    outsideWarning("topic-1/note.md", "../x.png"),
    'V021 topic-1/note.md: This page uses "../x.png", which is outside its own folder, so the link breaks when this is copied into another course. Move the file into this folder and link to it there.',
  );
});
