import { test } from "vitest";
import assert from "node:assert/strict";
import { assertNever, buildCourse, folderKind, MemoryFileSystem, parseMarkdown, stripFrontMatter } from "@ladder/gen";

const build = (files: Record<string, string>, warn?: (message: string) => void) => buildCourse(new MemoryFileSystem(files), "c", { warn });

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

test("a course without course.md is refused", async () => {
  await assert.rejects(build({ "topic-1/topic.md": "# T\n" }), /no course.md/);
});

test("children are ordered by kind, then by folder name", async () => {
  const course = await build({
    "course.md": "# C\n",
    "topic-1/topic.md": "# T\n",
    "topic-1/web-a/web.md": "# W\n",
    "topic-1/note-b/note.md": "# N2\n",
    "topic-1/note-a/note.md": "# N1\n",
    "topic-1/talk-z/talk.md": "# Talk\n",
  });
  const topic = course.los[0]!;
  assert.ok(topic.type === "topic");
  assert.deepEqual(topic.los.map((lo) => lo.id), ["talk-z", "note-a", "note-b", "web-a"]);
});

test("folders of no kind are left out, and kinds this rung does not build are reported", async () => {
  const warnings: string[] = [];
  const course = await build(
    { "course.md": "# C\n", "topic-1/topic.md": "# T\n", "topic-1/drafts/note.md": "# not content\n", "topic-1/notebook-1/nb.md": "# a notebook\n" },
    (message) => warnings.push(message),
  );
  const topic = course.los[0]!;
  assert.ok(topic.type === "topic");
  assert.deepEqual(topic.los, []);
  assert.deepEqual(warnings, ["skipped topic-1/notebook-1: this rung does not build this kind"]);
});

test("lab steps take their id from the file name; img/main.* gives the lab its first step's short title", async () => {
  const course = await build({
    "course.md": "# C\n",
    "topic-1/topic.md": "# T\n",
    "topic-1/book-1/00.Lab-1-Intro.md": "# Objectives\n",
    "topic-1/book-1/01.Set.Up.md": "## Setting up\n",
    "topic-1/book-2/00.Lab-2.md": "# Two\n",
    "topic-1/book-2/img/main.png": "",
  });
  const topic = course.los[0]!;
  assert.ok(topic.type === "topic");
  const [first, second] = topic.los;
  assert.ok(first?.type === "lab" && second?.type === "lab");
  assert.equal(first.title, "Objectives");
  assert.deepEqual(first.los.map((step) => [step.id, step.title]), [["Lab-1-Intro", "Objectives"], ["Set.Up", "Setting up"]]);
  assert.equal(second.title, "Lab-2");
});

test("a kind that slips past the type checker fails loudly at run time", () => {
  assert.throws(() => assertNever("podcast" as never), /unhandled learning object kind: podcast/);
});

// Added in rung 4 to kill mutants that survived the first Stryker run (see RUNG.md, "Mutation testing").

test("front matter is only a block at the very start, closed by --- with optional trailing spaces", () => {
  assert.equal(stripFrontMatter("# T\n---\na: 1\n---\nbody\n"), "# T\n---\na: 1\n---\nbody\n", "a --- block later in the file is content");
  assert.equal(stripFrontMatter("---\na: 1\n---   \n# T\n"), "# T\n");
  assert.equal(stripFrontMatter("---\na: 1\n---"), "", "front matter alone, with no newline at the end");
  assert.equal(stripFrontMatter("---\na: 1\n---\n   \n\n# T\n\nb"), "# T\n\nb", "blank lines after it go; blank lines in the body stay");
});

test("the summary is the first line after the title, trimmed", () => {
  assert.equal(parseMarkdown("# T\nsummary  \nnext line\n").summary, "summary");
});

test("hidden files are not read, and a folder named like a markdown file is not read as one", async () => {
  const course = await build({
    "course.md": "# C\n",
    "topic-1/.draft.md": "# Draft\n",
    "topic-1/topic.md": "# Topic\n",
    "topic-1/talk-1/old.md/slide.png": "",
    "topic-1/talk-1/talk.md": "# Talk\n",
  });
  const topic = course.los[0]!;
  assert.equal(topic.title, "Topic");
  assert.ok(topic.type === "topic");
  assert.equal(topic.los[0]!.title, "Talk");
});

test("a lab step's title drops only the leading marks, and a weburl is trimmed", async () => {
  const course = await build({
    "course.md": "# C\n",
    "topic-1/topic.md": "# T\n",
    "topic-1/book-1/01.Step.md": "Plain title #1\n",
    "topic-1/web-1/web.md": "# W\n",
    "topic-1/web-1/weburl": "https://tutors.dev  \n",
  });
  const topic = course.los[0]!;
  assert.ok(topic.type === "topic");
  const [lab, web] = topic.los;
  assert.ok(lab?.type === "lab");
  assert.equal(lab.los[0]!.title, "Plain title #1");
  assert.equal(web?.route, "https://tutors.dev");
});
