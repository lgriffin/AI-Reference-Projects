/**
 * Honest Double, as a property: over random course trees, MemoryFileSystem answers every question exactly
 * as NodeFileSystem does over the same files on disk. tests/contract states the cases; this explores.
 * Replay a failure: FUZZ_SEED=<seed> FUZZ_PATH=<path> pnpm test:fuzz
 */
import fc from "fast-check";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, expect, test } from "vitest";
import { MemoryFileSystem } from "@ladder/gen";
import type { FileSystemPort } from "@ladder/gen";
import { nodeFileSystem, sorted } from "../support/adapters.ts";
import { fuzzParameters } from "../support/fuzz.ts";

const scratch = mkdtempSync(join(tmpdir(), "rung-6-honest-"));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));
let run = 0;

const segment = fc.constantFrom("topic-1", "unit-1", "note-1", "book-1", "img", "Ünï", "a.md", "b.md");
const path = fc.array(segment, { minLength: 1, maxLength: 4 }).map((parts) => parts.join("/"));
/** File maps where no file is also a folder, as on a real disk. */
const tree = fc.dictionary(path, fc.string({ maxLength: 8 }), { minKeys: 1, maxKeys: 8 }).filter((files) => {
  const paths = Object.keys(files);
  return !paths.some((p) => paths.some((q) => q.startsWith(`${p}/`)));
});

const settle = async <T>(promise: Promise<T>) => promise.then((value) => ({ value }), () => "rejected" as const);

const agrees = (makeDouble: (files: Record<string, string>) => FileSystemPort) =>
  fc.asyncProperty(tree, fc.array(path, { maxLength: 6 }), async (files, probes) => {
    const real = nodeFileSystem(files, {}, mkdtempSync(join(scratch, `${run++}-`)));
    const double = makeDouble(files);
    const folders = new Set(["", ...Object.keys(files).flatMap((p) => p.split("/").slice(0, -1).map((_, i, parts) => parts.slice(0, i + 1).join("/")))]);
    for (const dir of [...folders, ...probes]) {
      const [a, b] = [await settle(real.list(dir)), await settle(double.list(dir))];
      expect(typeof b === "string" ? b : sorted(b.value), `list("${dir}")`).toEqual(typeof a === "string" ? a : sorted(a.value));
    }
    for (const probe of [...Object.keys(files), ...probes]) {
      expect(await double.exists(probe), `exists("${probe}")`).toBe(await real.exists(probe));
      expect(await settle(double.readText(probe)), `readText("${probe}")`).toEqual(await settle(real.readText(probe)));
    }
  });

test("MemoryFileSystem agrees with NodeFileSystem on list, exists and readText over random trees", async () => {
  await fc.assert(agrees((files) => new MemoryFileSystem(files)), fuzzParameters(40));
});

test("the honesty property can fail: it catches rung 3's double, which listed a missing folder as empty", async () => {
  const rung3Double = (files: Record<string, string>): FileSystemPort => {
    const memory = new MemoryFileSystem(files);
    return { exists: (p) => memory.exists(p), readText: (p) => memory.readText(p), list: (dir) => memory.list(dir).catch(() => []) };
  };
  expect((await fc.check(agrees(rung3Double), fuzzParameters(40))).failed).toBe(true);
});
