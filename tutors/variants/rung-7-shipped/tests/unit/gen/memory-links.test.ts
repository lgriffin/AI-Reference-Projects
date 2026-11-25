/**
 * MemoryFileSystem's links, one decision at a time (R-024). The contract proves the double agrees with the
 * disk; these rows are for the mutants that survived the first Stryker run over its link-following.
 */
import { test } from "vitest";
import assert from "node:assert/strict";
import { MemoryFileSystem, PathEscapeError } from "@ladder/gen";

const FILES = { "course.md": "# C\n", "topic-1/topic.md": "# T\n", "topic-1/unit-1/note.md": "# N\n" };
const refused = (error: unknown) => error instanceof PathEscapeError && /a link leads outside/.test(error.message);

test("a link's target is read from the link's own folder", async () => {
  const fs = new MemoryFileSystem(FILES, { "topic-1/unit-1/up.md": "../topic.md", "topic-1/unit-1/same.md": "./note.md", "topic-1/unit-1/odd.md": ".//note.md", "topic-1/root.md": "../course.md" });
  assert.equal(await fs.readText("topic-1/unit-1/up.md"), "# T\n");
  assert.equal(await fs.readText("topic-1/unit-1/same.md"), "# N\n");
  assert.equal(await fs.readText("topic-1/unit-1/odd.md"), "# N\n");
  assert.equal(await fs.readText("topic-1/root.md"), "# C\n");
});

test("a link to a folder is followed for what lies beneath it", async () => {
  const fs = new MemoryFileSystem(FILES, { shortcut: "topic-1/unit-1" });
  assert.equal(await fs.readText("shortcut/note.md"), "# N\n");
  assert.deepEqual(await fs.list("shortcut"), [{ name: "note.md", kind: "file" }]);
});

test("a link whose target is absolute, a drive, or climbs out of the course is refused", async () => {
  for (const target of ["/etc/passwd", "C:/Windows/win.ini", "c:\\secret", "../outside.md", "topic-1/../../outside.md"]) {
    await assert.rejects(new MemoryFileSystem(FILES, { "leak.md": target }).readText("leak.md"), refused, target);
  }
  await assert.rejects(new MemoryFileSystem(FILES, { "topic-1/leak.md": "../../outside.md" }).readText("topic-1/leak.md"), refused);
});

test("a target that only looks absolute is a name: a colon after the first letter, a slash at the end", async () => {
  const fs = new MemoryFileSystem({ ...FILES, "ab:c.md": "# odd\n", "1:x.md": "# digit\n" }, { "one.md": "ab:c.md", "two.md": "1:x.md", "three": "topic-1/" });
  assert.equal(await fs.readText("one.md"), "# odd\n");
  assert.equal(await fs.readText("two.md"), "# digit\n");
  assert.equal(await fs.readText("three/topic.md"), "# T\n");
});

test("a chain of links is followed eight deep, and no deeper, so a loop ends", async () => {
  const chain = (length: number) => Object.fromEntries(Array.from({ length }, (_, i) => [`link-${i}.md`, i === length - 1 ? "course.md" : `link-${i + 1}.md`]));
  assert.equal(await new MemoryFileSystem(FILES, chain(8)).readText("link-0.md"), "# C\n");
  await assert.rejects(new MemoryFileSystem(FILES, chain(9)).readText("link-0.md"), /too many links/);
  await assert.rejects(new MemoryFileSystem(FILES, { "a.md": "b.md", "b.md": "a.md" }).readText("a.md"), /a\.md: too many links/);
});
