/**
 * Requirement Closure Check: every requirement in REQUIREMENTS.md is proved by a scenario, and every
 * scenario and citation names a requirement that exists. The audit's logic is in
 * scripts/checks/ears-audit.ts. As upstream's tests/suite-health/ears-audit.test.ts does, it runs first on
 * negative fixtures, to prove each check can fail, and then on this repository.
 */
import { describe, expect, test } from "vitest";
import { audit, auditCitations, auditFeatures, auditRequirements, format, nextId, parseRequirements } from "../../scripts/checks/ears-audit.ts";
import { parseGherkin } from "../../scripts/checks/lib/gherkin.ts";
import { ROOT } from "../support/paths.ts";

const lines = (...rows: string[]) => rows.join("\n");
const table = (...rows: string[]) => parseRequirements(lines("| Id | Pattern | Requirement | Implemented in |", "| --- | --- | --- | --- |", ...rows));
const codes = (findings: { code: string }[]) => findings.map((f) => f.code);

const GOOD = "| R-001 | Ubiquitous | The site shall escape every piece of course text that it writes into a page. | lite |";
const feature = (...rows: string[]) => [{ file: "tests/bdd/features/x.feature", doc: parseGherkin(lines("Feature: X", ...rows)) }];
const RULE = ["  @R-001 @ears-ubiquitous", "  Rule: The site shall escape every piece of course text that it writes into a page.", "    Scenario: A script stays text"];

describe("negative fixtures: each check can fail", () => {
  test("a sentence in EARS form passes", () => {
    expect(auditRequirements(table(GOOD))).toEqual([]);
  });

  test("two shalls, a 'should', vague words and an unknown system are each named", () => {
    expect(codes(auditRequirements(table("| R-001 | Ubiquitous | The site shall escape text and shall show it. | lite |")))).toEqual(["shall-count"]);
    expect(codes(auditRequirements(table("| R-001 | Ubiquitous | The site should escape text. | lite |")))).toEqual(["shall-count", "obligation-keyword", "system-name"]);
    expect(codes(auditRequirements(table("| R-001 | Ubiquitous | The site shall handle text appropriately. | lite |")))).toEqual(["vague-language"]);
    expect(codes(auditRequirements(table("| R-001 | Ubiquitous | The browser shall escape text. | lite |")))).toEqual(["system-name"]);
  });

  test("the pattern's opening and the layer must match the sentence", () => {
    expect(codes(auditRequirements(table("| R-001 | Event-driven | The site shall escape text. | lite |")))).toEqual(["ears-form"]);
    expect(codes(auditRequirements(table("| R-001 | Unwanted behaviour | If text has a tag, the site shall escape it. | lite |")))).toEqual(["ears-form"]);
    expect(codes(auditRequirements(table("| R-001 | Ubiquitous | The site shall escape text. | gen |")))).toEqual(["layer-mismatch"]);
    expect(codes(auditRequirements(table("| R-001 | Ubiquitous | The reader shall escape text. | lite |")))).toEqual(["layer-mismatch"]);
    expect(codes(auditRequirements(table("| R-001 | Sometimes | The site shall escape text. | lite |")))).toEqual(["unknown-pattern"]);
  });

  test("ids are unique and never reused", () => {
    expect(codes(auditRequirements(table(GOOD, GOOD)))).toEqual(["duplicate-id"]);
    expect(codes(auditRequirements(table(GOOD), ["R-001"]))).toEqual(["retired-id"]);
    expect(nextId(table(GOOD), ["R-007"])).toBe("R-008");
  });

  test("a Rule that proves its requirement passes", () => {
    expect(auditFeatures(feature(...RULE), table(GOOD))).toEqual([]);
  });

  test("a requirement with no scenario, or no Rule, is unproved", () => {
    expect(codes(auditFeatures(feature(...RULE.slice(0, 2)), table(GOOD)))).toEqual(["no-scenarios", "unproved-requirement"]);
    expect(codes(auditFeatures([], table(GOOD)))).toEqual(["unproved-requirement"]);
  });

  test("a Rule must cite exactly one known id, in its own words, with its pattern's tag", () => {
    expect(codes(auditFeatures(feature("  @ears-ubiquitous", ...RULE.slice(1)), table(GOOD)))).toEqual(["rule-id", "unproved-requirement"]);
    expect(codes(auditFeatures(feature("  @R-002 @ears-ubiquitous", ...RULE.slice(1)), table(GOOD)))).toEqual(["unknown-id", "unproved-requirement"]);
    expect(codes(auditFeatures(feature(RULE[0]!, "  Rule: The site shall escape course text.", RULE[2]!), table(GOOD)))).toEqual(["rule-title-drift"]);
    expect(codes(auditFeatures(feature("  @R-001 @ears-event-driven", ...RULE.slice(1)), table(GOOD)))).toEqual(["ears-tag"]);
  });

  test("a scenario outside a Rule, and a feature no steps file loads, are named", () => {
    expect(codes(auditFeatures(feature("  Scenario: Loose", ...RULE), table(GOOD)))).toEqual(["scenario-outside-rule"]);
    expect(codes(auditFeatures(feature(...RULE), table(GOOD), [{ file: "a.steps.ts", text: 'loadFeature("tests/bdd/features/y.feature")' }]))).toEqual(["unbound-feature"]);
  });

  test("a test that cites an unknown id is named", () => {
    expect(codes(auditCitations([{ file: "t.test.ts", text: 'test("R-001 and R-099: ...")' }], table(GOOD)))).toEqual(["unknown-citation"]);
  });
});

test("this repository: every requirement is proved, and every citation is known", () => {
  const findings = audit(ROOT);
  expect(findings, `Requirement Closure Check (pnpm test:ears:audit):\n${format(findings)}`).toEqual([]);
});

