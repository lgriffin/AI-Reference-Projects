/**
 * The only way gen touches a course: a port that an adapter implements over whatever holds the files.
 * apps/cli supplies NodeFileSystem (node:fs); tests and, in later rungs, a browser supply
 * MemoryFileSystem. gen never imports node:fs, so every shell runs the same generator.
 * Mirrors upstream packages/jsr/course-rules/src/ports.ts, cut down to the reads gen needs.
 *
 * Rung 6 adds containment to the contract: every path stays inside the course folder. A path that
 * climbs out (`..`), starts at the root (`/etc/passwd`, `C:\`), or reaches a file through a link that
 * leads outside is refused with a PathEscapeError, by every adapter. The check lives here, at the
 * boundary, so no caller can forget it.
 */

export interface DirEntry {
  name: string;
  kind: "file" | "dir";
}

export interface FileSystemPort {
  /** The entries directly inside `dir`, in any order. Paths are "/"-separated and relative to the course root ("" is the root). Links are not listed. */
  list(dir: string): Promise<DirEntry[]>;
  /** The whole file as UTF-8 text. Rejects when there is no such file, and with PathEscapeError when the path or a link leaves the course. */
  readText(path: string): Promise<string>;
  /** True for a file or a folder, and for the root "". Rejects with PathEscapeError when the path leaves the course. */
  exists(path: string): Promise<boolean>;
}

/** Joins course-relative path segments with "/", dropping empty ones. */
export function joinPath(...parts: string[]): string {
  return parts.filter((part) => part !== "").join("/");
}

/** A path that would leave the course folder. Adapters throw it; the CLI reports it and stops. */
export class PathEscapeError extends Error {
  readonly path: string;
  constructor(path: string, why: string) {
    super(`refused to read "${path}": ${why}. gen reads only inside the course folder.`);
    this.name = "PathEscapeError";
    this.path = path;
  }
}

/**
 * The course-relative form of `path`, or a PathEscapeError. Accepts "a/b", "./a/b", "a\\b" and "a/./b";
 * refuses "..", "/abs", "C:/abs", "\\\\server\\share", "~/x" and NUL bytes. Every adapter calls it first.
 */
export function containedPath(path: string): string {
  if (path.includes("\0")) throw new PathEscapeError(path, "it holds a NUL byte");
  const slashed = path.replaceAll("\\", "/");
  if (slashed.startsWith("/") || /^[a-zA-Z]:/.test(slashed)) throw new PathEscapeError(path, "it is absolute");
  if (slashed === "~" || slashed.startsWith("~/")) throw new PathEscapeError(path, "it starts at a home folder");
  const parts = slashed.split("/").filter((part) => part !== "" && part !== ".");
  if (parts.includes("..")) throw new PathEscapeError(path, 'it climbs out with ".."');
  return parts.join("/");
}
