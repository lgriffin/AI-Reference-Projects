/**
 * The mutation floor check, proved on fixtures (it reads a Stryker report, which pnpm test does not make).
 * Mirrors upstream's tests of scripts/checks/mutation-floors.ts. The floors file itself is checked too:
 * every file Stryker mutates has a floor, so a new file cannot slip in unmeasured.
 */
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mutationFloorFindings, mutationScore, raisedFloors } from "../../scripts/checks/mutation-floors.ts";
import type { MutationFloors, MutationReport } from "../../scripts/checks/mutation-floors.ts";
import { ROOT } from "../support/paths.ts";

const report = (files: Record<string, string[]>): MutationReport => ({
  files: Object.fromEntries(Object.entries(files).map(([file, statuses]) => [file, { mutants: statuses.map((status) => ({ status })) }])),
});
const floors = (files: Record<string, number>): MutationFloors => ({ staleMargin: 2, files });
const kill = (n: number) => Array<string>(n).fill("Killed");

describe("negative fixtures: each finding can be raised", () => {
  test("the score counts killed and timed-out mutants over every mutant a test could have caught", () => {
    expect(mutationScore(["Killed", "Timeout", "Survived", "NoCoverage", "CompileError", "Ignored"])).toBe(50);
    expect(mutationScore([])).toBe(100);
  });

  test("a file at its floor passes; below it, or with no floor, it fails", () => {
    expect(mutationFloorFindings(report({ "a.ts": [...kill(9), "Survived"] }), floors({ "a.ts": 90 }), "/")).toEqual([]);
    expect(mutationFloorFindings(report({ "a.ts": [...kill(8), "Survived", "Survived"] }), floors({ "a.ts": 90 }), "/")[0]).toMatch(/^below-floor: a.ts 80% < floor 90%/);
    expect(mutationFloorFindings(report({ "b.ts": kill(1) }), floors({}), "/")[0]).toMatch(/^unfloored: b.ts/);
  });

  test("a floor the score has outgrown is stale, and a floor nothing measured is named", () => {
    expect(mutationFloorFindings(report({ "a.ts": kill(10) }), floors({ "a.ts": 90 }), "/")[0]).toMatch(/^stale-floor: a.ts 100% >= floor 90% \+ 2; raise it to 100/);
    expect(mutationFloorFindings(report({}), floors({ "a.ts": 90 }), "/")[0]).toMatch(/^unmeasured: a.ts/);
  });

  test("--update raises floors and never lowers one", () => {
    expect(raisedFloors(report({ "a.ts": [...kill(3), "Survived"], "b.ts": kill(1) }), floors({ "a.ts": 80 }), "/").files).toEqual({ "a.ts": 80, "b.ts": 100 });
  });
});

test("every file stryker.config.json mutates has a floor, and every floor is a mutated file", () => {
  const mutated: string[] = JSON.parse(readFileSync(join(ROOT, "stryker.config.json"), "utf8")).mutate;
  const floored = Object.keys(JSON.parse(readFileSync(join(ROOT, "tests/mutation/mutation-floors.json"), "utf8")).files);
  expect(floored.sort(), "Mutation floor rule: tests/mutation/mutation-floors.json lists exactly the files in stryker.config.json's mutate list. Run pnpm test:mutation, then pnpm check:mutation-floors --update.").toEqual(mutated.sort());
});
