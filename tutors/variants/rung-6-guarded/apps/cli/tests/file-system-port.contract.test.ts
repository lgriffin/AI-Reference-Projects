/**
 * Honest Double: one contract for FileSystemPort, run against the real adapter (NodeFileSystem, over a
 * temporary folder) and its stand-in (MemoryFileSystem). If the double drifts from node:fs, this fails,
 * so gen's fast tests on MemoryFileSystem stay truthful. A new adapter joins the list below;
 * tests/architecture checks that it does.
 *
 * Rung 6 adds containment: both adapters refuse "..", absolute paths and links that lead out of the
 * course, with the same error, and neither lists a link. The double holds links too, so these cases
 * run on it exactly as on the disk.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { MemoryFileSystem, PathEscapeError } from "@ladder/gen";
import type { FileSystemPort } from "@ladder/gen";
import { NodeFileSystem } from "../src/node-file-system.ts";

const FILES: Record<string, string> = {
  "course.md": "# Course\n",
  "topic-1/topic.md": "# Topic ✓\n",
  "topic-1/unit-1/talk-1/talk.md": "# Talk\n",
};

/** Links, as a link's path and its target relative to the link's folder, like `ln -s <target> <path>`. */
type Links = Record<string, string>;

/** A temporary folder holding `course/` (the root the adapter sees) and, beside it, `outside/secret.txt`. */
function nodeFileSystem(files: Record<string, string>, links: Links = {}): FileSystemPort {
  const base = mkdtempSync(join(tmpdir(), "rung-6-port-"));
  const root = join(base, "course");
  mkdirSync(root);
  mkdirSync(join(base, "outside"));
  writeFileSync(join(base, "outside", "secret.txt"), "secret\n");
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  for (const [path, target] of Object.entries(links)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    symlinkSync(target, join(root, path));
  }
  return new NodeFileSystem(root);
}

const ADAPTERS: [name: string, make: (files: Record<string, string>, links?: Links) => FileSystemPort][] = [
  ["NodeFileSystem", nodeFileSystem],
  ["MemoryFileSystem", (files, links) => new MemoryFileSystem(files, links)],
];

const LINKS: Links = {
  "inside.md": "topic-1/topic.md", // a link that stays in the course: allowed
  "topic-1/leak.md": "../../outside/secret.txt", // a link out of the course: refused
  "topic-1/escape": "../../outside", // a folder link out of the course: refused
};

const refused = (error: unknown) => error instanceof PathEscapeError;

const sorted = (entries: { name: string; kind: string }[]) => [...entries].sort((a, b) => (a.name < b.name ? -1 : 1));

for (const [name, make] of ADAPTERS) {
  describe(`FileSystemPort contract: ${name}`, () => {
    test("list gives the files and folders directly inside a folder", async () => {
      const fs = make(FILES);
      assert.deepEqual(sorted(await fs.list("")), [{ name: "course.md", kind: "file" }, { name: "topic-1", kind: "dir" }]);
      assert.deepEqual(sorted(await fs.list("topic-1")), [{ name: "topic.md", kind: "file" }, { name: "unit-1", kind: "dir" }]);
      assert.deepEqual(await fs.list("topic-1/unit-1"), [{ name: "talk-1", kind: "dir" }]);
    });

    test("readText gives the whole file as UTF-8, and rejects a missing file", async () => {
      const fs = make(FILES);
      assert.equal(await fs.readText("topic-1/topic.md"), "# Topic ✓\n");
      await assert.rejects(fs.readText("topic-1/missing.md"));
    });

    test("exists is true for the root, a folder and a file, and false otherwise", async () => {
      const fs = make(FILES);
      assert.equal(await fs.exists(""), true);
      assert.equal(await fs.exists("topic-1/unit-1"), true);
      assert.equal(await fs.exists("course.md"), true);
      assert.equal(await fs.exists("topic-2"), false);
    });

    test("refuses a path that climbs out or is absolute, for every method", async () => {
      const fs = make(FILES);
      for (const path of ["..", "../outside/secret.txt", "topic-1/../../outside", "/etc/passwd", "C:/Windows/win.ini"]) {
        await assert.rejects(fs.readText(path), refused, `readText(${path})`);
        await assert.rejects(fs.list(path), refused, `list(${path})`);
        await assert.rejects(fs.exists(path), refused, `exists(${path})`);
      }
    });

    test("does not list links, follows one that stays inside, and refuses one that leads out", async () => {
      const fs = make(FILES, LINKS);
      assert.deepEqual(sorted(await fs.list("")), [{ name: "course.md", kind: "file" }, { name: "topic-1", kind: "dir" }]);
      assert.deepEqual(sorted(await fs.list("topic-1")), [{ name: "topic.md", kind: "file" }, { name: "unit-1", kind: "dir" }]);
      assert.equal(await fs.readText("inside.md"), "# Topic ✓\n");
      await assert.rejects(fs.readText("topic-1/leak.md"), refused);
      await assert.rejects(fs.exists("topic-1/leak.md"), refused);
      await assert.rejects(fs.list("topic-1/escape"), refused);
      await assert.rejects(fs.readText("topic-1/escape/secret.txt"), refused);
    });
  });
}
