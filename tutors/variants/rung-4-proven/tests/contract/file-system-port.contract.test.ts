/**
 * Honest Double: one contract for FileSystemPort, run against the real adapter (NodeFileSystem, over a
 * temporary folder) and its stand-in (MemoryFileSystem). If the double drifts from node:fs, this fails,
 * so gen's fast tests and scenarios on MemoryFileSystem stay truthful. A new adapter joins ADAPTERS;
 * tests/architecture checks that it does. tests/fuzz/file-system-port.fuzz.test.ts runs the same
 * comparison over random course trees.
 *
 * Rung 4 extended the contract with the failure cases. The first run caught a real drift: listing a folder
 * that is not there rejected on disk and gave [] in memory, so a test on the double could pass where the
 * command would crash.
 */
import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { MemoryFileSystem } from "@ladder/gen";
import type { FileSystemPort } from "@ladder/gen";
import { nodeFileSystem, sorted } from "../support/adapters.ts";

const FILES: Record<string, string> = {
  "course.md": "# Course\n",
  "topic-1/topic.md": "# Topic ✓\n",
  "topic-1/unit-1/talk-1/talk.md": "# Talk\n",
  "topic-1/unit-1/talk-1/empty.md": "",
  "topic-2/Ünïcödé.md": "# Unicode\r\nwindows line ends\r\n",
};

const ADAPTERS: [name: string, make: (files: Record<string, string>) => FileSystemPort][] = [
  ["NodeFileSystem", nodeFileSystem],
  ["MemoryFileSystem", (files) => new MemoryFileSystem(files)],
];

for (const [name, make] of ADAPTERS) {
  describe(`FileSystemPort contract: ${name}`, () => {
    test("list gives the files and folders directly inside a folder", async () => {
      const fs = make(FILES);
      assert.deepEqual(sorted(await fs.list("")), [{ name: "course.md", kind: "file" }, { name: "topic-1", kind: "dir" }, { name: "topic-2", kind: "dir" }]);
      assert.deepEqual(sorted(await fs.list("topic-1")), [{ name: "topic.md", kind: "file" }, { name: "unit-1", kind: "dir" }]);
      assert.deepEqual(await fs.list("topic-1/unit-1"), [{ name: "talk-1", kind: "dir" }]);
    });

    test("list rejects a folder that is not there, and a file", async () => {
      const fs = make(FILES);
      await assert.rejects(fs.list("topic-9"), "a missing folder cannot be listed: readdir rejects with ENOENT");
      await assert.rejects(fs.list("course.md"), "a file cannot be listed: readdir rejects with ENOTDIR");
    });

    test("readText gives the whole file as UTF-8, unchanged, and rejects a missing file or a folder", async () => {
      const fs = make(FILES);
      assert.equal(await fs.readText("topic-1/topic.md"), "# Topic ✓\n");
      assert.equal(await fs.readText("topic-2/Ünïcödé.md"), "# Unicode\r\nwindows line ends\r\n", "line ends are the generator's business, not the port's");
      assert.equal(await fs.readText("topic-1/unit-1/talk-1/empty.md"), "", "an empty file is a file");
      await assert.rejects(fs.readText("topic-1/missing.md"));
      await assert.rejects(fs.readText("topic-1"), "a folder is not a file");
    });

    test("an empty course folder lists as empty", async () => {
      assert.deepEqual(await make({}).list(""), []);
    });

    test("a leading ./ or /, and trailing slashes, name the same place", async () => {
      const fs = make(FILES);
      for (const path of ["./topic-1", "/topic-1", "//topic-1", "topic-1/", "topic-1//"]) {
        assert.equal(await fs.exists(path), true, `exists("${path}")`);
        assert.deepEqual(sorted(await fs.list(path)), [{ name: "topic.md", kind: "file" }, { name: "unit-1", kind: "dir" }], `list("${path}")`);
      }
    });

    test("exists is true for the root, a folder and a file, and false otherwise", async () => {
      const fs = make(FILES);
      assert.equal(await fs.exists(""), true);
      assert.equal(await fs.exists("topic-1/unit-1"), true);
      assert.equal(await fs.exists("course.md"), true);
      assert.equal(await fs.exists("topic-2/Ünïcödé.md"), true);
      assert.equal(await fs.exists("topic-9"), false);
      assert.equal(await fs.exists("topic"), false, "a prefix of a folder's name is not the folder");
      assert.equal(await fs.exists("course.md/x"), false);
    });
  });
}
