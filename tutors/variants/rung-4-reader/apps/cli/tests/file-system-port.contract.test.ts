/**
 * Honest Double: one contract for FileSystemPort, run against the real adapter (NodeFileSystem, over a
 * temporary folder) and its stand-in (MemoryFileSystem). If the double drifts from node:fs, this fails,
 * so gen's fast tests on MemoryFileSystem stay truthful. A new adapter joins the list below;
 * tests/architecture checks that it does.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { MemoryFileSystem } from "@ladder/gen";
import type { FileSystemPort } from "@ladder/gen";
import { NodeFileSystem } from "../src/node-file-system.ts";

const FILES: Record<string, string> = {
  "course.md": "# Course\n",
  "topic-1/topic.md": "# Topic ✓\n",
  "topic-1/unit-1/talk-1/talk.md": "# Talk\n",
};

function nodeFileSystem(files: Record<string, string>): FileSystemPort {
  const root = mkdtempSync(join(tmpdir(), "rung-4-port-"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return new NodeFileSystem(root);
}

const ADAPTERS: [name: string, make: (files: Record<string, string>) => FileSystemPort][] = [
  ["NodeFileSystem", nodeFileSystem],
  ["MemoryFileSystem", (files) => new MemoryFileSystem(files)],
];

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
  });
}
