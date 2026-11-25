/**
 * Write the readiness A3 for the version in package.json: out/readiness.md.
 *
 *   node scripts/release-readiness.ts [--out out/readiness.md]
 *
 * Gathers the changelog section, the claims check, the SLO results, the last container smoke result
 * (out/container-smoke.json, written by pnpm container:smoke) and whether the tree is committed, and lays
 * them out as one page (scripts/lib/a3.ts). Advisory, as the release harness's A3 is: it exits 0 whenever
 * it wrote the page, and the checks themselves are what CI gates on.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { renderA3, type Readiness } from "./lib/a3.ts";
import { claimProblems } from "./check-release-claims.ts";
import { sloResults } from "./check-slo.ts";
import { isMain, runMain } from "./lib/cli.ts";

const ROOT = join(import.meta.dirname, "..");

/** The body of `## [version]` in a Keep a Changelog file, or undefined. */
export function changelogSection(changelog: string, version: string): string | undefined {
  const start = changelog.indexOf(`## [${version}]`);
  if (start === -1) return undefined;
  const body = changelog.slice(changelog.indexOf("\n", start) + 1);
  const end = body.search(/^## \[/m);
  return (end === -1 ? body : body.slice(0, end)).trim() || undefined;
}

function git(args: string[]): string | undefined {
  const result = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : undefined;
}

/** The last smoke result, if it was for this commit: a pass for another commit says nothing about this one. */
function containerResult(commit: string): Readiness["container"] {
  try {
    const { status, reason, revision } = JSON.parse(readFileSync(join(ROOT, "out", "container-smoke.json"), "utf8"));
    if (revision !== commit) return { status: "not run", reason: `the last smoke check was for commit ${String(revision).slice(0, 7)}, not this one: run pnpm container:smoke again` };
    return { status, reason };
  } catch {
    return { status: "not run", reason: "no out/container-smoke.json: run pnpm container:smoke" };
  }
}

export function gather(): Readiness {
  const version = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version as string;
  const status = git(["status", "--porcelain", "--", "."]);
  const commit = git(["rev-parse", "HEAD"]) ?? "unknown";
  let slo: Readiness["slo"];
  try {
    slo = sloResults();
  } catch (error) {
    slo = { error: error instanceof Error ? error.message : String(error) };
  }
  return {
    app: "tutors-ladder",
    version,
    commit,
    date: new Date().toISOString().slice(0, 10),
    changelog: changelogSection(readFileSync(join(ROOT, "CHANGELOG.md"), "utf8"), version),
    dirty: status === undefined ? "unknown" : status.length > 0,
    claims: claimProblems(),
    slo,
    container: containerResult(commit),
  };
}

export function main(argv: string[]): number {
  const at = argv.indexOf("--out");
  const out = resolve(ROOT, at === -1 ? "out/readiness.md" : argv[at + 1]!);
  const page = renderA3(gather());
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, page);
  process.stdout.write(`${page.split("\n").find((l) => l.startsWith("**"))}\nwrote ${out}\n`);
  return 0;
}

if (isMain(import.meta.url)) await runMain("release-readiness", () => main(process.argv.slice(2)));
