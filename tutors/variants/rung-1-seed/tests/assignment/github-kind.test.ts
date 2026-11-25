/**
 * Grading test for the Seed assignment (course topic-02-seed, "Add the github kind").
 * Skipped unless LADDER_ASSIGNMENT=1, so the Single Gate stays green before you start:
 *
 *     LADDER_ASSIGNMENT=1 node --test tests/assignment/*.test.ts
 *
 * The expected values were captured from upstream `tutors build` (tutors-mono-repo 2b96b69) on the
 * same course this test writes. Do not change them to make the test pass: change src/.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { buildCourse, folderKind } from "../../src/course-builder.ts";
import { preOrder } from "../../src/model.ts";

const skip = process.env.LADDER_ASSIGNMENT !== "1" && "set LADDER_ASSIGNMENT=1 to grade the github assignment";

type Json = { [key: string]: unknown };

/** A course with a github link beside a note, a web link and an archive, and one inside a unit. */
const FILES: Record<string, string> = {
  "course.md": "# Mini\n\nA mini course.\n",
  "topic-01-code/topic.md": "# Code\n\nWhere the code is.\n",
  "topic-01-code/archive-1-solutions/archive.md": "# Solutions\n\nThe finished code.\n",
  "topic-01-code/archive-1-solutions/solutions.zip": "zip",
  "topic-01-code/github-1-repo/github.md": "# The Repo\n\nWhere the code lives.\n",
  "topic-01-code/github-1-repo/githubid": "https://github.com/tutors-sdk/tutors-mono-repo\n",
  "topic-01-code/web-1-docs/web.md": "# Docs\n\nThe docs.\n",
  "topic-01-code/web-1-docs/weburl": "https://tutors.dev\n",
  "topic-01-code/note-1-intro/note.md": "# Intro\n\nRead me first.\n",
  "topic-01-code/unit-1-more/unit.md": "# More\n\nA unit.\n",
  "topic-01-code/unit-1-more/github-2-second/github.md": "# Second Repo\n\nAnother one.\n",
  "topic-01-code/unit-1-more/github-2-second/githubid": "https://github.com/tutors-sdk/tutors-reference-course\r\nignored second line\n",
};

/** What upstream wrote for topic-01-code, cut to the fields this rung builds. */
const UPSTREAM: Json = {
  type: "topic", id: "topic-01-code", title: "Code", summary: "Where the code is.", route: "/topic/{{COURSEURL}}/topic-01-code",
  los: [
    {
      type: "unit", id: "unit-1-more", title: "More", summary: "A unit.", route: "/topic/{{COURSEURL}}/topic-01-code/",
      los: [{ type: "github", id: "github-2-second", title: "Second Repo", summary: "Another one.", route: "https://github.com/tutors-sdk/tutors-reference-course" }],
    },
    { type: "note", id: "note-1-intro", title: "Intro", summary: "Read me first.", route: "/note/{{COURSEURL}}/topic-01-code/note-1-intro" },
    { type: "web", id: "web-1-docs", title: "Docs", summary: "The docs.", route: "https://tutors.dev" },
    { type: "github", id: "github-1-repo", title: "The Repo", summary: "Where the code lives.", route: "https://github.com/tutors-sdk/tutors-mono-repo" },
    { type: "archive", id: "archive-1-solutions", title: "Solutions", summary: "The finished code.", route: "/archive/{{COURSEURL}}/topic-01-code/archive-1-solutions" },
  ],
};

function courseFolder(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "rung-1-github-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

const outline = (lo: Json): Json => {
  const out: Json = { type: lo.type, id: lo.id, title: lo.title, summary: lo.summary, route: lo.route };
  if (Array.isArray(lo.los)) out.los = lo.los.map((child: Json) => outline(child));
  return out;
};

test("AC1: a folder whose name starts with github is a github learning object", { skip }, () => {
  assert.equal(folderKind("github-1-repo") as string, "github", "folderKinds must map the github prefix to the github kind, not to null");
});

test("AC2: github sorts after web and before archive, as upstream preOrder says", { skip }, () => {
  const order = preOrder as Record<string, number>;
  assert.equal(order.github, 10, "upstream preOrder gives github 10 (web is 9, archive is 11)");
});

test("AC3 and AC4: a github link takes its route from the first line of githubid, wherever it sits", { skip }, () => {
  const course = buildCourse(courseFolder(FILES)) as unknown as Json;
  const topic = (course.los as Json[])[0]!;
  assert.deepEqual(outline(topic), UPSTREAM);
});

test("AC5: a github folder without githubid still builds, with an empty route", { skip }, () => {
  const course = buildCourse(courseFolder({ "course.md": "# C\n", "topic-1/topic.md": "# T\n", "topic-1/github-1/github.md": "# Repo\n" })) as unknown as Json;
  const topic = (course.los as Json[])[0]!;
  const github = (topic.los as Json[])[0]!;
  assert.equal(github.type, "github");
  assert.equal(github.route, "");
});
