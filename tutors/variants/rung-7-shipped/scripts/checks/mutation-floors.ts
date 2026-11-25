/**
 * Mutation score floors. Stryker's `break` threshold guards the score of all mutated files at once, so one
 * strong file can hide a weak one. This check holds each mutated file to its own floor and, like
 * upstream's, fails once a score rises `staleMargin` points above its floor, until the floor is raised:
 * a floor that is never raised lets the score slide back without anyone noticing.
 *
 *   pnpm test:mutation                 # writes reports/mutation/mutation.json
 *   pnpm check:mutation-floors         # below-floor, stale-floor, unfloored and unmeasured findings
 *   pnpm check:mutation-floors --update  # raise floors to the measured scores (never lowers one)
 *
 * Floors live in tests/mutation/mutation-floors.json. Mirrors upstream scripts/checks/mutation-floors.ts
 * and tests/mutation/mutation-floors.json; tests/mutation/mutation-floors.test.ts proves each finding.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";

export type MutationFloors = { $comment?: string; staleMargin: number; files: Record<string, number> };
/** The parts of Stryker's JSON report (mutation-testing-report-schema) this check reads. */
export type MutationReport = { files: Record<string, { mutants: { status: string }[] }> };

const DETECTED = new Set(["Killed", "Timeout"]);
const UNDETECTED = new Set(["Survived", "NoCoverage"]);

/** Stryker's mutation score: detected over detected plus undetected. Errors and ignored mutants do not count. */
export function mutationScore(statuses: string[]): number {
  const detected = statuses.filter((s) => DETECTED.has(s)).length;
  const valid = detected + statuses.filter((s) => UNDETECTED.has(s)).length;
  return valid === 0 ? 100 : (100 * detected) / valid;
}

/** Score per file, keyed by its path relative to the variant, to two decimals. */
export function fileScores(report: MutationReport, root: string): Record<string, number> {
  return Object.fromEntries(
    Object.entries(report.files).map(([file, { mutants }]) => [
      (isAbsolute(file) ? relative(root, file) : file).replaceAll("\\", "/"),
      Number(mutationScore(mutants.map((m) => m.status)).toFixed(2)),
    ]),
  );
}

/** Every way the report disagrees with the floors, sorted. Empty means the check passes. */
export function mutationFloorFindings(report: MutationReport, floors: MutationFloors, root: string): string[] {
  const scores = fileScores(report, root);
  const findings: string[] = [];
  for (const [file, score] of Object.entries(scores)) {
    const floor = floors.files[file];
    if (floor === undefined) findings.push(`unfloored: ${file} scored ${score}% and has no floor. Add it to tests/mutation/mutation-floors.json (--update does).`);
    else if (score < floor) findings.push(`below-floor: ${file} ${score}% < floor ${floor}%. A test stopped killing a mutant: open reports/mutation/index.html, find the survivors, and add the test that kills them.`);
    else if (score >= floor + floors.staleMargin) findings.push(`stale-floor: ${file} ${score}% >= floor ${floor}% + ${floors.staleMargin}; raise it to ${Math.floor(score)} (--update), so the gain is kept.`);
  }
  for (const file of Object.keys(floors.files)) {
    if (!(file in scores)) findings.push(`unmeasured: ${file} has a floor but was not mutated. Add it to "mutate" in stryker.config.json, or remove its floor.`);
  }
  return findings.sort();
}

/** Floors raised to the measured scores, rounded down; new files get one. A floor is never lowered. */
export function raisedFloors(report: MutationReport, floors: MutationFloors, root: string): MutationFloors {
  const files = { ...floors.files };
  for (const [file, score] of Object.entries(fileScores(report, root))) files[file] = Math.max(files[file] ?? 0, Math.floor(score));
  return { ...floors, files };
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === import.meta.filename;

if (isMain) {
  const root = join(import.meta.dirname, "..", "..");
  const reportFile = join(root, "reports/mutation/mutation.json");
  const floorsFile = join(root, "tests/mutation/mutation-floors.json");
  if (!existsSync(reportFile)) {
    console.error(`No ${relative(root, reportFile)}. Run pnpm test:mutation first; it takes a few minutes and is not part of pnpm test.`);
    process.exit(2);
  }
  const report: MutationReport = JSON.parse(readFileSync(reportFile, "utf8"));
  const floors: MutationFloors = JSON.parse(readFileSync(floorsFile, "utf8"));
  const total = mutationScore(Object.values(report.files).flatMap(({ mutants }) => mutants.map((m) => m.status)));
  if (process.argv.includes("--update")) {
    writeFileSync(floorsFile, `${JSON.stringify(raisedFloors(report, floors, root), null, 2)}\n`);
    console.log(`Floors raised to the measured scores in ${relative(root, floorsFile)}.`);
  } else {
    const findings = mutationFloorFindings(report, floors, root);
    for (const [file, score] of Object.entries(fileScores(report, root))) console.log(`${score.toFixed(2).padStart(6)}%  ${file}  (floor ${floors.files[file] ?? "none"})`);
    console.log(`${total.toFixed(2).padStart(6)}%  all mutated files`);
    console.log(findings.length === 0 ? "Every file holds its floor." : findings.join("\n"));
    process.exitCode = findings.length === 0 ? 0 : 1;
  }
}
