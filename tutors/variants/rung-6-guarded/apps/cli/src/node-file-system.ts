/**
 * The FileSystemPort over node:fs, rooted at a course folder. The real adapter: the contract test in
 * apps/cli/tests runs the same cases against it and against MemoryFileSystem (Honest Double).
 *
 * Rung 6: every path passes containedPath first (no "..", nothing absolute), and then its real path,
 * with every symbolic link followed, must still be inside the course folder. A course.md that is a link
 * to ~/.ssh/config is refused, not published.
 */
import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { containedPath, PathEscapeError } from "@ladder/gen";
import type { DirEntry, FileSystemPort } from "@ladder/gen";

export class NodeFileSystem implements FileSystemPort {
  private readonly root: string;
  private realRoot: Promise<string> | undefined;

  constructor(root: string) {
    this.root = resolve(root);
  }

  async list(dir: string): Promise<DirEntry[]> {
    const entries = await readdir(await this.inside(dir), { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() || entry.isDirectory()) // a link is neither, so it is never listed
      .map((entry) => ({ name: entry.name, kind: entry.isDirectory() ? "dir" : "file" }));
  }

  async readText(path: string): Promise<string> {
    return readFile(await this.inside(path), "utf8");
  }

  async exists(path: string): Promise<boolean> {
    const full = await this.inside(path);
    return stat(full).then(
      () => true,
      () => false,
    );
  }

  /** The absolute path for `path`, once it is known to stay inside the course with every link followed. */
  private async inside(path: string): Promise<string> {
    const full = join(this.root, containedPath(path));
    const real = await realpath(full).catch(() => undefined);
    if (real === undefined) return full; // nothing there: the caller's read or stat reports it
    this.realRoot ??= realpath(this.root);
    const root = await this.realRoot;
    if (real !== root && !real.startsWith(root + sep)) throw new PathEscapeError(path, "a link leads outside the course folder");
    return real;
  }
}
