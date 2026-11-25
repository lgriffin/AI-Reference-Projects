/**
 * Measure the release value stream: run the steps of release/SOP.md that a machine can run, in order,
 * time each one, and print the map with its lead time.
 *
 *   pnpm release:value-stream                       # every step, mutation testing left out (it takes minutes)
 *   pnpm release:value-stream --with mutation       # add pnpm test:mutation and the floors
 *   pnpm release:value-stream --only claims,slo     # some steps (the others are shown as skipped)
 *   pnpm release:value-stream --skip browser        # all but these
 *   pnpm release:value-stream --wait readiness=3600 # the release waited an hour for its reviewer
 *
 * A failed step stops the line: the steps after it are not run, as the SOP says. The map is printed, and
 * written to out/value-stream.md and out/value-stream.json, which the readiness A3 reads. Exit 0 when
 * every step that ran passed, 1 when one failed, 2 on a bad argument. The arithmetic is pure, in
 * scripts/lib/value-stream.ts (R-044); this file starts the processes.
 *
 * Process time here is a machine's. What a release waits (for a runner, a reviewer, a decision) no script
 * can see, so a person gives it with --wait. Upstream's release harness maps the same stream for the real
 * release line (tutors-release-harness docs/lean.md, "Value stream").
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isMain, runMain } from "./lib/cli.ts";
import { parseWaits, renderValueStream, runSteps, summarise, type PlannedStep, type Ran, type Selection, type Step } from "./lib/value-stream.ts";

const ROOT = join(import.meta.dirname, "..");

/** The steps a machine can run, in SOP order. `optional` steps run only when asked for with --with. */
export const STEPS: PlannedStep[] = [
  { id: "gate", sop: 4, what: "The Single Gate", command: "pnpm test" },
  { id: "browser", sop: 4, what: "The reader in Chromium", command: "pnpm test:e2e" },
  { id: "mutation", sop: 5, what: "Mutation testing and floors", command: "pnpm test:mutation && pnpm check:mutation-floors", optional: true },
  { id: "audit", sop: 5, what: "Supply-chain audit", command: "pnpm audit:supply-chain" },
  { id: "claims", sop: 6, what: "Release claims", command: "pnpm release:claims" },
  { id: "slo", sop: 7, what: "Service level objectives", command: "pnpm release:slo" },
  { id: "container", sop: 8, what: "Build and smoke the image", command: "pnpm container:smoke" },
  { id: "readiness", sop: 9, what: "The readiness A3", command: "pnpm release:readiness" },
];

function parseArgs(argv: string[]): Selection {
  const ids = STEPS.map((s) => s.id);
  const options: Selection = { skip: [], with: [], waits: {} };
  const waits: string[] = [];
  const list = (flag: string, value: string | undefined) => {
    if (!value || value.startsWith("--")) throw new Error(`${flag} needs a value`);
    const names = value.split(",").map((n) => n.trim()).filter(Boolean);
    const unknown = names.filter((n) => !ids.includes(n));
    if (unknown.length > 0) throw new Error(`${flag} names ${unknown.join(", ")}, which the value stream does not have. Steps: ${ids.join(", ")}`);
    return names;
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]!;
    if (flag === "--only") options.only = list(flag, argv[++i]);
    else if (flag === "--skip") options.skip = list(flag, argv[++i]);
    else if (flag === "--with") options.with = list(flag, argv[++i]);
    else if (flag === "--wait") waits.push(argv[++i] ?? "");
    else throw new Error(`unknown argument ${flag}`);
  }
  options.waits = parseWaits(waits, ids);
  return options;
}

function git(args: string[]): string {
  const result = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "unknown";
}

/** Run one step's command through the shell, as a person would type it, and time it. */
function time({ id, command }: PlannedStep): Ran {
  process.stderr.write(`running ${id}: ${command}\n`);
  const start = performance.now();
  const result = spawnSync(command, { cwd: ROOT, shell: true, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
  const seconds = (performance.now() - start) / 1000;
  // The smoke check exits 0 when it could not run, and says so on its first line.
  const skipped = /^container smoke: SKIPPED: (.*?)(\. |$)/m.exec(result.stdout ?? "")?.[1];
  return { seconds, ok: result.status === 0, ...(skipped ? { skipped } : {}) };
}

export const measure = (selection: Selection): Step[] => runSteps(STEPS, selection, time);

export function main(argv: string[]): number {
  const options = parseArgs(argv);
  const steps = measure(options);
  const meta = { version: JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version as string, commit: git(["rev-parse", "HEAD"]), date: new Date().toISOString().slice(0, 10) };
  const page = renderValueStream(steps, meta);
  mkdirSync(join(ROOT, "out"), { recursive: true });
  writeFileSync(join(ROOT, "out", "value-stream.md"), page);
  writeFileSync(join(ROOT, "out", "value-stream.json"), `${JSON.stringify({ ...meta, steps, summary: summarise(steps) }, null, 2)}\n`);
  process.stdout.write(`${page}\nwrote out/value-stream.md and out/value-stream.json\n`);
  return steps.some((s) => s.status === "failed") ? 1 : 0;
}

if (isMain(import.meta.url)) await runMain("value-stream", () => main(process.argv.slice(2)));
