/**
 * Suite health (upstream tier O, tests/suite-health): the suite itself is checked. Each finding is proved
 * on a negative fixture first, then the whole of tests/ is checked.
 */
import { describe, expect, test } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { lintTestSource, lintUncollected } from "../../scripts/checks/suite-health.ts";
import { ROOT } from "../support/paths.ts";

const kinds = (file: string, source: string) => [...lintTestSource(file, source), ...lintUncollected(file, source)].map((f) => f.kind);

describe("negative fixtures: each check can fail", () => {
  test("a focused test or block is found", () => {
    expect(kinds("tests/unit/x.test.ts", 'test.only("a", () => {}); describe.only("b", () => {});')).toEqual(["only", "only"]);
  });

  test("a skipped or todo test is found, except in tests/assignment", () => {
    expect(kinds("tests/unit/x.test.ts", 'test.skip("a", () => {}); test.todo("b");')).toEqual(["skip", "skip"]);
    expect(kinds("tests/assignment/x.test.ts", "describe.skipIf(!process.env.LADDER_ASSIGNMENT)('a', () => {});")).toEqual([]);
  });

  test("a test file vitest will not collect is found", () => {
    expect(kinds("tests/unit/x.spec.ts", 'test("a", () => {});')).toEqual(["uncollected"]);
    expect(kinds("tests/support/helpers.ts", "export const a = 1;")).toEqual([]);
  });

  test("a property test with no negative fixture is found", () => {
    expect(kinds("tests/fuzz/x.test.ts", 'test("R-008: escapes", () => {});')).toEqual(["no-negative-fixture"]);
    expect(kinds("tests/fuzz/x.test.ts", 'test("R-008: escapes", () => {}); test("the property can fail", () => {});')).toEqual([]);
  });
});

test("this repository: no focused, skipped or uncollected tests, and every property can fail", () => {
  const files = readdirSync(join(ROOT, "tests"), { recursive: true, encoding: "utf8" })
    .map((file) => `tests/${file.replaceAll("\\", "/")}`)
    .filter((file) => file.endsWith(".ts") && !file.startsWith("tests/suite-health/"));
  const findings = files.flatMap((file) => {
    const source = readFileSync(join(ROOT, file), "utf8");
    return [...lintTestSource(file, source), ...lintUncollected(file, source)];
  });
  expect(findings.map((f) => `${f.kind}: ${f.file}: ${f.detail}`), "Suite health").toEqual([]);
});
