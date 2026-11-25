/** Ways to stand up a FileSystemPort over a map of files, shared by the contract and fuzz tiers. */
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { FileSystemPort } from "@ladder/gen";
import { NodeFileSystem } from "../../apps/cli/src/node-file-system.ts";

/** Links, as a link's path and its target relative to the link's folder, like `ln -s <target> <path>`. */
export type Links = Record<string, string>;

/**
 * Writes the files and links into `course/` in a new temporary folder and returns the real adapter over
 * it. Beside the course, outside it, sits `outside/secret.txt`: what a containment case tries to reach.
 */
export function nodeFileSystem(files: Record<string, string>, links: Links = {}, base = mkdtempSync(join(tmpdir(), "rung-6-port-"))): FileSystemPort {
  const root = join(base, "course");
  mkdirSync(join(base, "outside"), { recursive: true });
  writeFileSync(join(base, "outside", "secret.txt"), "secret\n");
  mkdirSync(root, { recursive: true });
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

/** Entries by name, so adapters that list in different orders compare equal. */
export const sorted = (entries: { name: string; kind: string }[]) => [...entries].sort((a, b) => (a.name < b.name ? -1 : 1));
