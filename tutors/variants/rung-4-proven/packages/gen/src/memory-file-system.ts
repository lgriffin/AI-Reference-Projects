/**
 * A course held in memory: a map from "/"-separated relative path to text. Folders exist as prefixes
 * of file paths. Fast and honest: the same contract test runs against it and against NodeFileSystem.
 * Mirrors upstream packages/jsr/course-rules/src/adapters/memory-fs.ts.
 */
import type { DirEntry, FileSystemPort } from "./file-system-port.ts";

export class MemoryFileSystem implements FileSystemPort {
  private readonly files = new Map<string, string>();

  constructor(files: Record<string, string> = {}) {
    for (const [path, text] of Object.entries(files)) this.files.set(normalise(path), text);
  }

  list(dir: string): Promise<DirEntry[]> {
    const prefix = normalise(dir) === "" ? "" : `${normalise(dir)}/`;
    // Like readdir: a folder that is not there, or a file, cannot be listed. Rung 4's contract test found this drift.
    if (prefix !== "" && ![...this.files.keys()].some((key) => key.startsWith(prefix))) return Promise.reject(new Error(`${dir}: no such folder`));
    const entries = new Map<string, DirEntry>();
    for (const path of this.files.keys()) {
      if (!path.startsWith(prefix)) continue;
      const rest = path.slice(prefix.length);
      const slash = rest.indexOf("/");
      if (slash === -1) entries.set(rest, { name: rest, kind: "file" });
      else entries.set(rest.slice(0, slash), { name: rest.slice(0, slash), kind: "dir" });
    }
    return Promise.resolve([...entries.values()]);
  }

  readText(path: string): Promise<string> {
    const text = this.files.get(normalise(path));
    return text === undefined ? Promise.reject(new Error(`${path}: no such file`)) : Promise.resolve(text);
  }

  exists(path: string): Promise<boolean> {
    const target = normalise(path);
    if (target === "") return Promise.resolve(true);
    return Promise.resolve(this.files.has(target) || [...this.files.keys()].some((key) => key.startsWith(`${target}/`)));
  }
}

function normalise(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.?\/+/, "").replace(/\/+$/, "");
}
