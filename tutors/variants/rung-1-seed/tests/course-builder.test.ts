import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { assertNever, buildCourse, folderKind, stripFrontMatter } from "../src/course-builder.ts";

/** Writes a course into a fresh temporary folder from a map of relative path to content. */
function courseFolder(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "rung-1-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

test("a folder's kind is the longest prefix of its name", () => {
  assert.equal(folderKind("note-1"), "note");
  assert.equal(folderKind("notebook-1"), null, "a notebook is not a note: upstream builds it, this rung does not");
  assert.equal(folderKind("book-a"), "lab", "book is the upstream name for a lab folder");
  assert.equal(folderKind("side-extra"), "side");
  assert.equal(folderKind("img"), undefined, "a folder with no kind is not content");
});

test("front matter is removed from the markdown body", () => {
  assert.equal(stripFrontMatter("---\nmarp: true\n---\n\n# Deck\n"), "# Deck\n");
  assert.equal(stripFrontMatter("# No front matter\n"), "# No front matter\n");
});

test("children are ordered by kind, then by folder name", () => {
  const root = courseFolder({
    "course.md": "# C\n",
    "topic-1/topic.md": "# T\n",
    "topic-1/web-a/web.md": "# W\n",
    "topic-1/note-b/note.md": "# N2\n",
    "topic-1/note-a/note.md": "# N1\n",
    "topic-1/talk-z/talk.md": "# Talk\n",
  });
  const topic = buildCourse(root).los[0]!;
  assert.ok(topic.type === "topic");
  assert.deepEqual(topic.los.map((lo) => lo.id), ["talk-z", "note-a", "note-b", "web-a"]);
});

test("folders of no kind and kinds this rung does not build are left out", () => {
  const root = courseFolder({
    "course.md": "# C\n",
    "topic-1/topic.md": "# T\n",
    "topic-1/drafts/note.md": "# not content\n",
    "topic-1/notebook-1/nb.md": "# a notebook\n",
  });
  const topic = buildCourse(root).los[0]!;
  assert.ok(topic.type === "topic");
  assert.deepEqual(topic.los, []);
});

test("lab steps take their id from the file name", () => {
  const root = courseFolder({
    "course.md": "# C\n",
    "topic-1/topic.md": "# T\n",
    "topic-1/book-1/00.Lab-1-Intro.md": "# Objectives\n",
    "topic-1/book-1/01.Set.Up.md": "## Setting up\n",
  });
  const topic = buildCourse(root).los[0]!;
  assert.ok(topic.type === "topic");
  const lab = topic.los[0]!;
  assert.ok(lab.type === "lab");
  assert.equal(lab.title, "Objectives", "without img/main.png a lab keeps its markdown title");
  assert.deepEqual(lab.los.map((step) => [step.id, step.title]), [["Lab-1-Intro", "Objectives"], ["Set.Up", "Setting up"]]);
});

test("a kind that slips past the type checker fails loudly at run time", () => {
  assert.throws(() => assertNever("podcast" as never), /unhandled learning object kind: podcast/);
});
