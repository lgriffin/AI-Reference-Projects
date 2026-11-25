import { test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Course } from "@ladder/model";
import { buildSite, relativeHref } from "@ladder/lite";

import { ORACLE } from "../../support/paths.ts";

/** lite needs only a Course, so it can render the tutors.json that upstream wrote for the shared fixture. */
const upstream: Course = JSON.parse(readFileSync(ORACLE, "utf8"));

test("upstream's tutors.json renders a page per course, topic, talk, note and lab step, at upstream's paths", () => {
  const paths = buildSite(upstream).map((page) => page.path).sort();
  assert.deepEqual(paths, [
    "index.html",
    "topic-01-basics/index.html",
    "topic-01-basics/unit-1-intro/note-1-reading/index.html",
    "topic-01-basics/unit-1-intro/talk-1-welcome/index.html",
    "topic-02-practice/index.html",
    "topic-02-practice/unit-1-lab/book-1-first-lab/Build.html",
    "topic-02-practice/unit-1-lab/book-1-first-lab/Setup.html",
    "topic-02-practice/unit-1-lab/book-1-first-lab/index.html",
  ]);
});

test("pages show their content and link to each other", () => {
  const site = new Map(buildSite(upstream).map((page) => [page.path, page.html]));
  assert.match(site.get("index.html")!, /<a href="topic-01-basics\/index.html">Basics<\/a>/);
  assert.match(site.get("topic-02-practice/index.html")!, /<a href="https:\/\/tutors.dev">Tutors<\/a>/, "a web link points outside");
  assert.match(site.get("topic-01-basics/unit-1-intro/talk-1-welcome/index.html")!, /<section class="slide"><h2>What you will build<\/h2>/);
  assert.match(site.get("topic-02-practice/unit-1-lab/book-1-first-lab/Setup.html")!, /<a href="Build.html">Next<\/a>/);
  assert.equal(relativeHref("a/b/index.html", "index.html"), "../../index.html");
});

test("course text never reaches a page unescaped", () => {
  const evil = "<script>alert(1)</script>";
  const course: Course = {
    type: "course", id: "c", title: evil, summary: evil, contentMd: `# ${evil}\n\n${evil}`, route: "/",
    los: [{
      type: "topic", id: "t", title: evil, summary: evil, contentMd: evil, route: "/topic/t",
      los: [
        { type: "note", id: "n", title: evil, summary: evil, contentMd: evil, route: "/note/n" },
        { type: "web", id: "w", title: evil, summary: evil, contentMd: "", route: `"><script>alert(1)</script>` },
        { type: "archive", id: "a", title: evil, summary: evil, contentMd: "", route: "", archiveFile: evil },
        { type: "lab", id: "l", title: evil, summary: evil, contentMd: "", route: "", los: [{ type: "step", id: "s", shortTitle: "s", title: evil, contentMd: evil, route: "" }] },
      ],
    }],
  };
  for (const page of buildSite(course)) assert.doesNotMatch(page.html, /<script/, `${page.path} contains an unescaped <script>`);
});

// Added in rung 4 to kill mutants that survived the first Stryker run (see RUNG.md, "Mutation testing").

const talkCourse = (deck: string): Course => ({
  type: "course", id: "c", title: "C", summary: "", contentMd: "# C", route: "/",
  los: [{ type: "talk", id: "t", title: "T", summary: "", contentMd: deck, route: "" }],
});
const slideCount = (deck: string) => buildSite(talkCourse(deck)).find((p) => p.path === "t/index.html")!.html.split('<section class="slide">').length - 1;

test("a slide break is a line of three dashes, with nothing else but trailing spaces", () => {
  assert.equal(slideCount("# A\n---  \n# B"), 2);
  assert.equal(slideCount("# A\n---x\n# B"), 1);
  assert.equal(slideCount("# A\nwait ---\n# B"), 1);
});

test("a lab step page lists every step, the current one in bold and the others as links", () => {
  const lab: Course = {
    type: "course", id: "c", title: "C", summary: "", contentMd: "# C", route: "/",
    los: [{ type: "lab", id: "l", title: "L", summary: "", contentMd: "", route: "", los: ["One", "Two"].map((name) => ({ type: "step" as const, id: name, shortTitle: name, title: name, contentMd: "", route: "" })) }],
  };
  const second = buildSite(lab).find((p) => p.path === "l/Two.html")!.html;
  assert.match(second, /<ol><li><a href="index.html">One<\/a><\/li><li><strong>Two<\/strong><\/li><\/ol>/);
  assert.match(second, /<p><a href="index.html">Previous<\/a> <\/p>/, "the last step links back, and not on");
});
