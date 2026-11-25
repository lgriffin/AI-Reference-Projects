/**
 * Grading test for Assignment 06, "Hidden topics" (tutors/course/topic-06-proven). It skips in the gate;
 * a learner runs it with:
 *
 *   LADDER_ASSIGNMENT=1 pnpm exec vitest run tests/assignment
 *
 * Each acceptance criterion (AC1 to AC6) is one test, and each failure names the criterion and the fix.
 * Upstream states the same rule as Rule 0266 in tests/bdd/features/generator/course-json.feature.
 */
import { describe, expect, test } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildCourse, MemoryFileSystem } from "@ladder/gen";
import { audit, format, parseRequirements } from "../../scripts/checks/ears-audit.ts";
import { mutationFloorFindings } from "../../scripts/checks/mutation-floors.ts";
import { ROOT } from "../support/paths.ts";

const requirement = () =>
  parseRequirements(readFileSync(join(ROOT, "REQUIREMENTS.md"), "utf8")).find(({ text }) => /properties\.yaml/.test(text) && /\bignore\b/.test(text) && /\bhide\b/.test(text));

const COURSE = { "course.md": "# C\nA course.\n", "topic-1/topic.md": "# One\n1\n", "topic-2/topic.md": "# Two\n2\n", "topic-3/topic.md": "# Three\n3\n" };
const hidden = async (files: Record<string, string>) =>
  (await buildCourse(new MemoryFileSystem(files), "c")).los.filter((lo) => (lo as { hide?: boolean }).hide === true).map((lo) => lo.id);

describe.skipIf(!process.env.LADDER_ASSIGNMENT)("Assignment 06: hidden topics", () => {
  test("AC1: REQUIREMENTS.md states the rule in EARS, event-driven, implemented in gen", () => {
    const found = requirement();
    expect(found, "AC1: no requirement mentions properties.yaml, ignore and hide. Add a row with the next id (pnpm test:ears:audit --next-id).").toBeDefined();
    expect(found!.pattern, "AC1: the rule is triggered by what properties.yaml lists, so it is Event-driven: When ..., the generator shall ...").toBe("Event-driven");
    expect(found!.layer, "AC1: the generator reads properties.yaml, so the rule is implemented in gen").toMatch(/\bgen\b/);
  });

  test("AC2: the requirement is proved by a scenario, and the EARS audit is clean", () => {
    const id = requirement()?.id ?? "R-???";
    const features = readdirSync(join(ROOT, "tests/bdd/features"), { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".feature"));
    const cited = features.some((f) => readFileSync(join(ROOT, "tests/bdd/features", f), "utf8").includes(`@${id}`));
    expect(cited, `AC2: no feature has a Rule tagged @${id}. Add it to tests/bdd/features/generator/course-folder.feature.`).toBe(true);
    const findings = audit(ROOT);
    expect(findings, `AC2: the EARS audit has findings:\n${format(findings)}`).toEqual([]);
  });

  test("AC3: a topic listed under ignore is written with hide set to true, and the others are not", async () => {
    expect(await hidden({ ...COURSE, "properties.yaml": "title: C\nignore:\n  - topic-2\n" }), "AC3: topic-2 is listed under ignore").toEqual(["topic-2"]);
    expect(await hidden({ ...COURSE, "properties.yaml": "ignore:\n  - topic-1\n  - topic-3\ncredits: x\n" }), "AC3: a list of two, followed by another key").toEqual(["topic-1", "topic-3"]);
  });

  test("AC4: with no properties.yaml, or no ignore key, nothing is hidden and nothing is left out", async () => {
    expect(await hidden(COURSE), "AC4: no properties.yaml").toEqual([]);
    expect(await hidden({ ...COURSE, "properties.yaml": "credits: someone\nignorepin: 1234\n" }), "AC4: ignorepin is not ignore").toEqual([]);
    const course = await buildCourse(new MemoryFileSystem({ ...COURSE, "properties.yaml": "ignore:\n  - topic-2\n" }), "c");
    expect(course.los.map((lo) => lo.id), "AC4: a hidden topic is still in the course, as upstream writes it").toEqual(["topic-1", "topic-2", "topic-3"]);
  });

  test("AC5: a property test cites the requirement and proves it can fail", () => {
    const id = requirement()?.id ?? "R-???";
    const fuzz = readdirSync(join(ROOT, "tests/fuzz")).map((f) => readFileSync(join(ROOT, "tests/fuzz", f), "utf8"));
    expect(fuzz.some((source) => source.includes(id) && /can fail/.test(source)), `AC5: no file in tests/fuzz cites ${id} and has a "... can fail" negative fixture.`).toBe(true);
  });

  test("AC6: the mutation score is held: a fresh Stryker report meets every floor", () => {
    const report = join(ROOT, "reports/mutation/mutation.json");
    expect(existsSync(report), "AC6: no reports/mutation/mutation.json. Run pnpm test:mutation after your change.").toBe(true);
    const findings = mutationFloorFindings(JSON.parse(readFileSync(report, "utf8")), JSON.parse(readFileSync(join(ROOT, "tests/mutation/mutation-floors.json"), "utf8")), ROOT);
    expect(findings.filter((f) => !f.startsWith("stale-floor")), "AC6: a file is below its floor, or unfloored. Kill the survivors; never lower a floor.").toEqual([]);
  });
});
