/**
 * Write the readiness A3 for the version in package.json: out/readiness.md.
 *
 *   node scripts/release-readiness.ts [--out out/readiness.md]
 *
 * Gathers the changelog section, the claims check, the SLO results, the offline supply-chain audit, the
 * last mutation run against its floors (reports/mutation/mutation.json), the last container smoke result
 * (out/container-smoke.json), the last measured lead time (out/value-stream.json) and whether the tree is
 * committed, and lays them out as one page (scripts/lib/a3.ts, R-042). Advisory, as the release harness's
 * A3 is: it exits 0 whenever it wrote the page, and the checks themselves are what CI gates on.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { changelogBody, renderA3, type Readiness } from "./lib/a3.ts";
import { mutationFloorFindings, mutationScore, type MutationFloors, type MutationReport } from "./checks/mutation-floors.ts";
import { claimProblems } from "./check-release-claims.ts";
import { sloResults } from "./check-slo.ts";
import { isMain, runMain } from "./lib/cli.ts";
import { duration } from "./lib/value-stream.ts";

const ROOT = join(import.meta.dirname, "..");

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

/** The offline audit, run as the command a person runs. Its findings are its stderr lines; a clean run has none. */
function supplyChain(): Readiness["supplyChain"] {
  const result = spawnSync(process.execPath, [join(ROOT, "scripts", "supply-chain.ts")], { cwd: ROOT, encoding: "utf8" });
  if (result.status === 0) return { findings: [] };
  const lines = `${result.stderr}\n${result.stdout}`.split("\n").map((l) => l.trim()).filter((l) => /^[a-z-]+: /.test(l));
  return { findings: lines.length > 0 ? lines : [`pnpm audit:supply-chain exited with status ${result.status}`] };
}

/** The last Stryker report against the floors. A report is evidence only for the code it mutated, so say when it is absent. */
export function mutationResult(root = ROOT): Readiness["mutation"] {
  const reportFile = join(root, "reports", "mutation", "mutation.json");
  if (!existsSync(reportFile)) return { status: "not run", reason: "no reports/mutation/mutation.json: run pnpm test:mutation, then pnpm check:mutation-floors" };
  const report = JSON.parse(readFileSync(reportFile, "utf8")) as MutationReport;
  const floors = JSON.parse(readFileSync(join(root, "tests", "mutation", "mutation-floors.json"), "utf8")) as MutationFloors;
  const score = mutationScore(Object.values(report.files).flatMap(({ mutants }) => mutants.map((m) => m.status)));
  const below = mutationFloorFindings(report, floors, root).filter((f) => !f.startsWith("stale-floor"));
  return below.length === 0 ? { status: "passed", reason: "every file holds its floor", score } : { status: "failed", reason: below.join(" "), score };
}

/** The lead time pnpm release:value-stream last measured, if it was for this commit. */
function leadTime(commit: string): string | undefined {
  try {
    const { commit: measured, summary } = JSON.parse(readFileSync(join(ROOT, "out", "value-stream.json"), "utf8"));
    return measured === commit ? `${duration(summary.leadSeconds)} (${Math.round(summary.flowEfficiency * 100)}% flow efficiency)` : undefined;
  } catch {
    return undefined;
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
    changelog: changelogBody(readFileSync(join(ROOT, "CHANGELOG.md"), "utf8"), version),
    dirty: status === undefined ? "unknown" : status.length > 0,
    claims: claimProblems(),
    slo,
    supplyChain: supplyChain(),
    mutation: mutationResult(),
    container: containerResult(commit),
    ...(leadTime(commit) ? { leadTime: leadTime(commit)! } : {}),
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
