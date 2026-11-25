/**
 * Hold the release to its service level objectives (release/slo.yaml).
 *
 *   node scripts/check-slo.ts            # build the fixture site three times, judge each objective
 *   node scripts/check-slo.ts --json     # the results as JSON, for the readiness A3
 *
 * Exit 0 when every objective is within budget, 1 with a teaching message per breach, 2 when the file is
 * not valid. Mirrors upstream `pnpm check:slo` (scripts/checks/slo.ts), which holds release/slo.yaml to
 * the harness's rules on every release branch.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { isMain, runMain } from "./lib/cli.ts";
import { measureBuild, ROOT } from "./lib/measure.ts";
import { checkObjectives, evaluate, type Result } from "./lib/slo.ts";

export function loadObjectives(file = join(ROOT, "release", "slo.yaml")) {
  return checkObjectives(parse(readFileSync(file, "utf8")));
}

export function sloResults(): Result[] {
  const { objectives, problems } = loadObjectives();
  if (problems.length > 0) throw new Error(`release/slo.yaml is not valid:\n${problems.map((p) => `- ${p}`).join("\n")}`);
  return evaluate(objectives, measureBuild());
}

export function main(argv: string[]): number {
  const results = sloResults();
  if (argv.includes("--json")) process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
  else for (const r of results) (r.ok ? process.stdout : process.stderr).write(`${r.ok ? "ok  " : "FAIL"} ${r.message}\n`);
  return results.every((r) => r.ok) ? 0 : 1;
}

if (isMain(import.meta.url)) await runMain("check-slo", () => main(process.argv.slice(2)));
