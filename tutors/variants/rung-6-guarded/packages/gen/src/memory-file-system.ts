/**
 * A course held in memory: a map from "/"-separated relative path to text. Folders exist as prefixes
 * of file paths. Fast and honest: the same contract test runs against it and against NodeFileSystem.
 * Mirrors upstream packages/jsr/course-rules/src/adapters/memory-fs.ts.
 *
 * Rung 6: it can also hold links (like symbolic links on disk), so the containment cases of the
 * contract run here too. A link is never listed; reading through it follows it, unless it leads
 * outside the course, which is refused exactly as NodeFileSystem refuses it.
 */
import { containedPath, joinPath, PathEscapeError } from "./file-system-port.ts";
import type { DirEntry, FileSystemPort } from "./file-system-port.ts";

/** How many links one read may follow before it gives up, as an operating system does. */
const MAX_LINKS = 8;

export class MemoryFileSystem implements FileSystemPort {
  private readonly files = new Map<string, string>();
  private readonly links = new Map<string, string>();

  /** `files` maps a path to its text; `links` maps a path to its target, relative to the link's folder or absolute. */
  constructor(files: Record<string, string> = {}, links: Record<string, string> = {}) {
    for (const [path, text] of Object.entries(files)) this.files.set(containedPath(path), text);
    for (const [path, target] of Object.entries(links)) this.links.set(containedPath(path), target);
  }

  list(dir: string): Promise<DirEntry[]> {
    return attempt(() => {
      const resolved = this.resolve(dir);
      const prefix = resolved === "" ? "" : `${resolved}/`;
      const entries = new Map<string, DirEntry>();
      for (const path of this.files.keys()) {
        if (!path.startsWith(prefix)) continue;
        const rest = path.slice(prefix.length);
        const slash = rest.indexOf("/");
        if (slash === -1) entries.set(rest, { name: rest, kind: "file" });
        else entries.set(rest.slice(0, slash), { name: rest.slice(0, slash), kind: "dir" });
      }
      return [...entries.values()];
    });
  }

  readText(path: string): Promise<string> {
    return attempt(() => {
      const text = this.files.get(this.resolve(path));
      if (text === undefined) throw new Error(`${path}: no such file`);
      return text;
    });
  }

  exists(path: string): Promise<boolean> {
    return attempt(() => {
      const target = this.resolve(path);
      return target === "" || this.files.has(target) || [...this.files.keys()].some((key) => key.startsWith(`${target}/`));
    });
  }

  /** The stored path that `path` names once every link along it is followed; refuses a link that leaves the course. */
  private resolve(path: string, followed = 0): string {
    const parts = containedPath(path).split("/").filter((part) => part !== "");
    for (let i = 1; i <= parts.length; i++) {
      const link = parts.slice(0, i).join("/");
      const target = this.links.get(link);
      if (target === undefined) continue;
      if (followed >= MAX_LINKS) throw new Error(`${path}: too many links`);
      const landed = landing(parts.slice(0, i - 1), target);
      if (landed === null) throw new PathEscapeError(path, "a link leads outside the course folder");
      return this.resolve(joinPath(landed, ...parts.slice(i)), followed + 1);
    }
    return parts.join("/");
  }
}

/** Where a link in `folder` pointing at `target` lands, or null when that is outside the course. */
function landing(folder: string[], target: string): string | null {
  const slashed = target.replaceAll("\\", "/");
  if (slashed.startsWith("/") || /^[a-zA-Z]:/.test(slashed)) return null;
  const parts = [...folder];
  for (const part of slashed.split("/")) {
    if (part === "" || part === ".") continue;
    if (part !== "..") parts.push(part);
    else if (parts.pop() === undefined) return null;
  }
  return parts.join("/");
}

/** Runs a synchronous step as the port's promise, so a refusal rejects rather than throws. */
function attempt<T>(step: () => T): Promise<T> {
  try {
    return Promise.resolve(step());
  } catch (error) {
    return Promise.reject(error);
  }
}
