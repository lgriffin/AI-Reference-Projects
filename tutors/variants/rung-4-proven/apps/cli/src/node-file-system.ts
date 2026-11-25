/**
 * The FileSystemPort over node:fs, rooted at a course folder. The real adapter: the contract test in
 * apps/cli/tests runs the same cases against it and against MemoryFileSystem (Honest Double).
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { DirEntry, FileSystemPort } from "@ladder/gen";

export class NodeFileSystem implements FileSystemPort {
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  async list(dir: string): Promise<DirEntry[]> {
    const entries = await readdir(join(this.root, dir), { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() || entry.isDirectory())
      .map((entry) => ({ name: entry.name, kind: entry.isDirectory() ? "dir" : "file" }));
  }

  readText(path: string): Promise<string> {
    return readFile(join(this.root, path), "utf8");
  }

  async exists(path: string): Promise<boolean> {
    return stat(join(this.root, path)).then(
      () => true,
      () => false,
    );
  }
}
