/**
 * The release value stream's arithmetic and its map (scripts/lib/value-stream.ts). The steps themselves are
 * run and timed by `pnpm release:value-stream`.
 */
import { test } from "vitest";
import assert from "node:assert/strict";
import { duration, parseWaits, renderValueStream, runSteps, summarise, type PlannedStep, type Step } from "../../../scripts/lib/value-stream.ts";

const PLAN: PlannedStep[] = [
  { id: "gate", sop: 4, what: "The Single Gate", command: "pnpm test" },
  { id: "mutation", sop: 5, what: "Mutation testing", command: "pnpm test:mutation", optional: true },
  { id: "claims", sop: 6, what: "Release claims", command: "pnpm release:claims" },
  { id: "container", sop: 8, what: "Build and smoke the image", command: "pnpm container:smoke" },
];
const TIMES: Record<string, number> = { gate: 20, mutation: 300, claims: 1, container: 9 };
const all = { skip: [], with: [], waits: {} };
const run = (failing?: string, skipping?: string) => (step: PlannedStep) => ({ seconds: TIMES[step.id]!, ok: step.id !== failing, ...(step.id === skipping ? { skipped: "no Docker daemon answers" } : {}) });
const statuses = (steps: Step[]) => steps.map((s) => `${s.id}:${s.status}`);

test("R-044: every step that is not optional runs, in order, and an optional one says how to add it", () => {
  const steps = runSteps(PLAN, all, run());
  assert.deepEqual(statuses(steps), ["gate:passed", "mutation:skipped", "claims:passed", "container:passed"]);
  assert.equal(steps[1]!.note, "add it with --with mutation");
  assert.deepEqual(steps.map((s) => s.seconds), [20, 0, 1, 9]);
  assert.deepEqual(statuses(runSteps(PLAN, { ...all, with: ["mutation"] }, run())), ["gate:passed", "mutation:passed", "claims:passed", "container:passed"]);
});

test("R-044: a failed step stops the line: later steps are not run, and their commands are never started", () => {
  const started: string[] = [];
  const steps = runSteps(PLAN, { ...all, with: ["mutation"] }, (step) => (started.push(step.id), run("mutation")(step)));
  assert.deepEqual(statuses(steps), ["gate:passed", "mutation:failed", "claims:not run", "container:not run"]);
  assert.deepEqual(started, ["gate", "mutation"]);
  assert.deepEqual(summarise(steps), { processSeconds: 320, waitSeconds: 0, leadSeconds: 320, flowEfficiency: 1, bottleneck: "mutation", stopped: "mutation" });
});

test("--only and --skip choose steps, and a check that could not run is skipped, never passed", () => {
  const only = runSteps(PLAN, { ...all, only: ["claims", "mutation"] }, run());
  assert.deepEqual(statuses(only), ["gate:skipped", "mutation:passed", "claims:passed", "container:skipped"]);
  assert.equal(only[0]!.note, undefined);
  assert.equal(runSteps(PLAN, { ...all, only: ["claims"] }, run())[1]!.note, undefined, "with --only, an optional step left out was left out on purpose");
  const skipped = runSteps(PLAN, { ...all, skip: ["gate"] }, run());
  assert.deepEqual(statuses(skipped), ["gate:skipped", "mutation:skipped", "claims:passed", "container:passed"]);
  assert.equal(skipped[0]!.note, undefined, "only an optional step says how to add it");
  const noDocker = runSteps(PLAN, all, run(undefined, "container"));
  assert.deepEqual([noDocker[3]!.status, noDocker[3]!.note], ["skipped", "no Docker daemon answers"]);
  assert.equal(summarise(noDocker).processSeconds, 21, "a skipped step adds no process time");
});

test("R-044: lead time is process time plus waiting, and flow efficiency is the share that was work", () => {
  const steps = runSteps(PLAN, { ...all, waits: { claims: 60, gate: 9, mutation: 1000 } }, run());
  assert.deepEqual(steps.map((s) => s.waitSeconds), [9, 1000, 60, 0]);
  const summary = summarise(steps);
  assert.deepEqual(summary, { processSeconds: 30, waitSeconds: 69, leadSeconds: 99, flowEfficiency: 30 / 99, bottleneck: "gate", longestWait: "claims" });
  assert.deepEqual(summarise([]), { processSeconds: 0, waitSeconds: 0, leadSeconds: 0, flowEfficiency: 0 });
});

test("waits are given as step=seconds, once per known step", () => {
  assert.deepEqual(parseWaits(["claims=60", "gate=1.5"], ["gate", "claims"]), { claims: 60, gate: 1.5 });
  assert.deepEqual(parseWaits([], ["gate"]), {});
  assert.deepEqual(parseWaits(["claims=1.25"], ["claims"]), { claims: 1.25 });
  assert.throws(() => parseWaits(["9claims=60"], ["claims"]), /is not <step>=<seconds>/);
  assert.throws(() => parseWaits(["claims"], ["claims"]), /--wait claims is not <step>=<seconds>/);
  assert.throws(() => parseWaits(["claims=-1"], ["claims"]), /is not <step>=<seconds>/);
  assert.throws(() => parseWaits(["claims=1s"], ["claims"]), /is not <step>=<seconds>/);
  assert.throws(() => parseWaits(["review=60"], ["gate", "claims"]), /names the step "review", which the value stream does not have\. Steps: gate, claims/);
});

test("durations are short enough for a table cell", () => {
  assert.deepEqual([0, 4.24, 59.94, 60, 65.4, 3599.4, 3600, 7380].map(duration), ["0.0 s", "4.2 s", "59.9 s", "1 min 00 s", "1 min 05 s", "59 min 59 s", "1 h 00 min", "2 h 03 min"]);
});

test("the map is a table with a row per step, then the totals and where to look first", () => {
  const steps = runSteps(PLAN, { ...all, waits: { claims: 60 } }, run(undefined, "container"));
  const map = renderValueStream(steps, { version: "1.1.0", commit: "1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d", date: "2026-11-25" });
  assert.match(map, /^# Release value stream: tutors-ladder 1\.1\.0\n\nCommit `1a2b3c4d5e6f`, 2026-11-25\./);
  assert.match(map, /\| 1 \| The Single Gate \| 4 \| `pnpm test` \| - \| 20\.0 s \| 95% \| passed \|/);
  assert.match(map, /\| 2 \| Mutation testing \| 5 \| `pnpm test:mutation` \| - \| - \|  \| skipped: add it with --with mutation \|/);
  assert.match(map, /\| 3 \| Release claims \| 6 \| `pnpm release:claims` \| 1 min 00 s \| 1\.0 s \| 5% \| passed \|/);
  assert.match(map, /\| 4 \| Build and smoke the image \| 8 \| `pnpm container:smoke` \| - \| - \|  \| skipped: no Docker daemon answers \|/);
  assert.match(map, /- \*\*Process time:\*\* 21\.0 s \(work on the release\)\n- \*\*Waiting time:\*\* 1 min 00 s\n- \*\*Lead time:\*\* 1 min 21 s \(process time plus waiting\)\n- \*\*Flow efficiency:\*\* 26% /);
  assert.match(map, /- \*\*Longest step:\*\* gate\./);
  assert.match(map, /- \*\*Longest wait:\*\* before claims\./);
  assert.doesNotMatch(map, /The line stopped/);
  const stopped = renderValueStream(runSteps(PLAN, all, run("gate")), { version: "1.1.0", commit: "unknown", date: "2026-11-25" });
  assert.match(stopped, /\| 3 \| Release claims \| 6 \| `pnpm release:claims` \| - \| - \|  \| not run \|/);
  assert.match(stopped, /- \*\*Waiting time:\*\* 0\.0 s \(none given: a machine ran every step back to back/);
  assert.match(stopped, /- \*\*The line stopped at gate\.\*\* Later steps did not run/);
  assert.doesNotMatch(stopped, /Longest wait/);
});

test("the map shows a wait only before a step that ran, and totals only what there is", () => {
  const meta = { version: "1.1.0", commit: "unknown", date: "2026-11-25" };
  const bullets = (map: string) => map.split("\n").filter((line) => line.startsWith("- **")).map((line) => line.slice(4, line.indexOf(":")));
  const nothing = renderValueStream(runSteps(PLAN, { ...all, only: [], waits: { gate: 60 } }, run()), meta);
  assert.doesNotMatch(nothing, /NaN/);
  assert.match(nothing, /\| 1 \| The Single Gate \| 4 \| `pnpm test` \| - \| - \|  \| skipped \|/, "nothing waited for a step nobody took");
  assert.deepEqual(bullets(nothing), ["Process time", "Waiting time", "Lead time", "Flow efficiency"]);
  const failed = renderValueStream(runSteps(PLAN, { ...all, waits: { gate: 60, claims: 30 } }, run("gate")), meta);
  assert.match(failed, /\| 1 \| The Single Gate \| 4 \| `pnpm test` \| 1 min 00 s \| 20\.0 s \| 100% \| failed \|/, "a step that failed still waited");
  assert.match(failed, /\| 3 \| Release claims \| 6 \| `pnpm release:claims` \| - \| - \|  \| not run \|/);
  assert.deepEqual(bullets(failed), ["Process time", "Waiting time", "Lead time", "Flow efficiency", "Longest step", "Longest wait", "The line stopped at gate.** Later steps did not run"]);
  assert.deepEqual(bullets(renderValueStream(runSteps(PLAN, all, run()), meta)), ["Process time", "Waiting time", "Lead time", "Flow efficiency", "Longest step"]);
});
