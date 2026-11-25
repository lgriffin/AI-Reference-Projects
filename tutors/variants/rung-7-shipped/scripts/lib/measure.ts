/**
 * Build the fixture site with the real command, as a separate process, and measure it: the time each
 * build took and every file it wrote. The command runs as CI runs it, so the scripts never import the
 * packages they judge (tests/architecture/release.test.ts: the Scripts rule). The reader is measured as
 * built: whatever `pnpm build` left in apps/reader/build, without the courses copied into it.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Measurement } from "./slo.ts";

export const ROOT = join(import.meta.dirname, "..", "..");
export const FIXTURE = join(ROOT, "..", "fixtures", "ladder-sample-course");
export const READER_BUILD = join(ROOT, "apps", "reader", "build");

/** Every file under `dir`, with its size. Paths are relative and use "/". */
export function filesIn(dir: string): { path: string; bytes: number }[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .map((path) => ({ path: path.replaceAll("\\", "/"), full: join(dir, path) }))
    .filter(({ full }) => statSync(full).isFile())
    .map(({ path, full }) => ({ path, bytes: statSync(full).size }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

/** The built reader's own files, or undefined when it is not built. The courses under courses/ are content, not the reader. */
export function readerFiles(build = READER_BUILD): Measurement["files"] | undefined {
  if (!existsSync(join(build, "200.html"))) return undefined;
  return filesIn(build).filter(({ path }) => !path.startsWith("courses/"));
}

/** Build `runs` times and keep the slowest time: a budget should hold on a bad day, not only on the best. */
export function measureBuild(runs = 3, course = FIXTURE): Measurement {
  let buildMs = 0;
  let files: Measurement["files"] = [];
  for (let i = 0; i < runs; i++) {
    const out = mkdtempSync(join(tmpdir(), "rung-7-measure-"));
    const start = performance.now();
    execFileSync(process.execPath, [join(ROOT, "apps/cli/src/main.ts"), course, out], { stdio: "pipe" });
    buildMs = Math.max(buildMs, performance.now() - start);
    files = filesIn(out);
    rmSync(out, { recursive: true, force: true });
  }
  const reader = readerFiles();
  return { buildMs, files, ...(reader ? { reader } : {}) };
}
