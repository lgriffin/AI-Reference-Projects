/**
 * Build the fixture site with the real command, as a separate process, and measure it: the time each
 * build took and every file it wrote. The command runs as CI runs it, so the scripts never import the
 * packages they judge (tests/architecture: the Scripts rule).
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Measurement } from "./slo.ts";

export const ROOT = join(import.meta.dirname, "..", "..");
export const FIXTURE = join(ROOT, "..", "fixtures", "ladder-sample-course");

/** Every file under `dir`, with its size. Paths are relative and use "/". */
export function filesIn(dir: string): { path: string; bytes: number }[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .map((path) => ({ path: path.replaceAll("\\", "/"), full: join(dir, path) }))
    .filter(({ full }) => statSync(full).isFile())
    .map(({ path, full }) => ({ path, bytes: statSync(full).size }))
    .sort((a, b) => a.path.localeCompare(b.path));
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
  return { buildMs, files };
}
