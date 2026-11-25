/** Ways to stand up a FileSystemPort over a map of files, shared by the contract and fuzz tiers. */
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { FileSystemPort } from "@ladder/gen";
import { NodeFileSystem } from "../../apps/cli/src/node-file-system.ts";

/** Writes the files into a new temporary folder and returns the real adapter over it. */
export function nodeFileSystem(files: Record<string, string>, root = mkdtempSync(join(tmpdir(), "rung-5-port-"))): FileSystemPort {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return new NodeFileSystem(root);
}

/** Entries by name, so adapters that list in different orders compare equal. */
export const sorted = (entries: { name: string; kind: string }[]) => [...entries].sort((a, b) => (a.name < b.name ? -1 : 1));
