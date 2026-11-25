import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildCourse } from "../src/course-builder.ts";
import type { Course } from "../src/model.ts";
import { buildSite, relativeHref } from "../src/site-builder.ts";

const ROOT = join(import.meta.dirname, "..");
const FIXTURE = join(ROOT, "..", "fixtures", "ladder-sample-course");

test("the fixture renders a page per course, topic, talk, note and lab step, at upstream's paths", () => {
  const paths = buildSite(buildCourse(FIXTURE)).map((page) => page.path).sort();
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
  const site = new Map(buildSite(buildCourse(FIXTURE)).map((page) => [page.path, page.html]));
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

test("the command writes the site and tutors.json", () => {
  const out = mkdtempSync(join(tmpdir(), "rung-2-"));
  const run = spawnSync(process.execPath, [join(ROOT, "src", "main.ts"), FIXTURE, out], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  assert.ok(existsSync(join(out, "topic-01-basics", "index.html")));
  assert.equal(JSON.parse(readFileSync(join(out, "tutors.json"), "utf8")).id, "ladder-sample-course");
});
