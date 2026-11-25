/**
 * The only way gen touches a course: a port that an adapter implements over whatever holds the files.
 * apps/cli supplies NodeFileSystem (node:fs); tests and, in later rungs, a browser supply
 * MemoryFileSystem. gen never imports node:fs, so every shell runs the same generator.
 * Mirrors upstream packages/jsr/course-rules/src/ports.ts, cut down to the reads gen needs.
 */

export interface DirEntry {
  name: string;
  kind: "file" | "dir";
}

export interface FileSystemPort {
  /** The entries directly inside `dir`, in any order. Paths are "/"-separated and relative to the course root ("" is the root). */
  list(dir: string): Promise<DirEntry[]>;
  /** The whole file as UTF-8 text. Rejects when there is no such file. */
  readText(path: string): Promise<string>;
  /** True for a file or a folder, and for the root "". */
  exists(path: string): Promise<boolean>;
}

/** Joins course-relative path segments with "/", dropping empty ones. */
export function joinPath(...parts: string[]): string {
  return parts.filter((part) => part !== "").join("/");
}
