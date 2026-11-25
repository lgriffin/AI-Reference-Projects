import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Course } from "@ladder/model";
import { buildSite, relativeHref } from "@ladder/lite";

/** lite needs only a Course, so it can render the tutors.json that upstream wrote for the shared fixture. */
const ORACLE = join(import.meta.dirname, "..", "..", "..", "..", "fixtures", "ladder-sample-course.tutors.json");
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
