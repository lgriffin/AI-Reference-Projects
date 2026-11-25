/**
 * Grading test for Assignment 5, "A next and previous navigator" (tutors/course/topic-09-reader-components,
 * the last week of rung 5). It skips in the gate; a learner runs it with:
 *
 *   pnpm test:assignment      # these tests, then a build and the browser check in lo-pager.e2e.ts
 *
 * Each acceptance criterion is one test, and each failure names the criterion and the fix:
 *
 *   AC1  REQUIREMENTS.md states the reading-order rule in EARS, for the reader, before any code.
 *   AC2  A Rule in tests/bdd/features/reader proves it with a scenario, and the EARS audit is clean.
 *   AC3  readingOrder(tree) is the course's talks, notes and labs, in the order tutors.json holds them.
 *   AC4  loNeighbours(tree, lo) gives the stops either side; the ends have one; a non-stop has none.
 *   AC5  The logic is apps/reader/src/lib/course/lo-pager.ts, with unit tests in tests/unit/reader/lo-pager.test.ts,
 *        and the component is apps/reader/src/lib/ui-navigators/LoPager.svelte, shown by Note.svelte and Lab.svelte.
 *   AC6  Stryker mutates lo-pager.ts, it has a floor, and a fresh report meets every floor.
 *   AC7  In a browser, the "Learning object pager" pages from the first talk to the lab (lo-pager.e2e.ts).
 *
 * The module is imported by a computed path, so the gate compiles before lo-pager.ts exists.
 */
import { describe, expect, test } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { audit, format, parseRequirements } from "../../scripts/checks/ears-audit.ts";
import { mutationFloorFindings } from "../../scripts/checks/mutation-floors.ts";
import { ORACLE, ROOT } from "../support/paths.ts";

const READER = join(ROOT, "apps", "reader");
const PAGER = join(READER, "src", "lib", "course", "lo-pager.ts");

type Lo = { type: string; title: string; route: string };
type Tree = { course: Lo; loIndex: Map<string, Lo> };
type Pager = { readingOrder(tree: Tree): Lo[]; loNeighbours(tree: Tree, lo: Lo): { previous?: Lo; next?: Lo } };

const requirement = () =>
  parseRequirements(readFileSync(join(ROOT, "REQUIREMENTS.md"), "utf8")).find(({ text }) => /\breading order\b/i.test(text) && /\bthe reader shall\b/i.test(text));

async function load(): Promise<{ pager: Pager; tree: Tree }> {
  expect(existsSync(PAGER), "AC5: put the pager's logic in apps/reader/src/lib/course/lo-pager.ts, plain TypeScript, so Vitest and Stryker can run it.").toBe(true);
  const pager = (await import(/* @vite-ignore */ PAGER)) as Pager;
  const { decorateCourseTree } = await import(/* @vite-ignore */ join(READER, "src", "lib", "course", "lo-tree.ts"));
  return { pager, tree: decorateCourseTree(JSON.parse(readFileSync(ORACLE, "utf8")), "sample") };
}

describe.skipIf(!process.env.LADDER_ASSIGNMENT)("Assignment 5: a next and previous navigator", () => {
  test("AC1: REQUIREMENTS.md states the reading-order rule in EARS, implemented in the reader", () => {
    const found = requirement();
    expect(found, 'AC1: no requirement says "the reader shall" and "reading order". Specify first: add a row with the next id (pnpm test:ears:audit --next-id).').toBeDefined();
    expect(found!.layer, "AC1: the pager is part of the reader, so the rule is implemented in reader").toMatch(/\breader\b/);
  });

  test("AC2: the requirement is proved by a scenario in the reader's feature, and the EARS audit is clean", () => {
    const id = requirement()?.id ?? "R-???";
    const dir = join(ROOT, "tests/bdd/features/reader");
    const cited = readdirSync(dir).some((f) => f.endsWith(".feature") && readFileSync(join(dir, f), "utf8").includes(`@${id}`));
    expect(cited, `AC2: no feature in tests/bdd/features/reader has a Rule tagged @${id}. Add it to reader.feature, with a scenario, and bind its steps.`).toBe(true);
    const findings = audit(ROOT);
    expect(findings, `AC2: the EARS audit has findings:\n${format(findings)}`).toEqual([]);
  });

  test("AC3: the reading order is the course's talks, notes and labs, in pre-order", async () => {
    const { pager, tree } = await load();
    expect(
      pager.readingOrder(tree).map((lo) => lo.title),
      "AC3: walk the course in the order tutors.json holds it, keeping only talks, notes and labs (no course, topic, unit, side, web or archive).",
    ).toEqual(["Welcome", "Reading Guide", "Lab-01-First-Steps"]);
  });

  test("AC4: each stop knows its neighbours; the ends have one; a page that is not a stop has none", async () => {
    const { pager, tree } = await load();
    const [first, middle, last] = pager.readingOrder(tree);
    const titles = (lo: Lo) => {
      const { previous, next } = pager.loNeighbours(tree, lo);
      return [previous?.title, next?.title];
    };
    expect(titles(first!), "AC4: the first stop has a next and no previous.").toEqual([undefined, "Reading Guide"]);
    expect(titles(middle!), "AC4: a middle stop has both.").toEqual(["Welcome", "Lab-01-First-Steps"]);
    expect(titles(last!), "AC4: the last stop has a previous and no next.").toEqual(["Reading Guide", undefined]);
    expect(titles(tree.course), "AC4: the course page is not a stop, so it has no neighbours.").toEqual([undefined, undefined]);
  });

  test("AC5: the pager is a navigator, shown on every talk, note and lab, with unit tests of its own", () => {
    expect(existsSync(join(READER, "src", "lib", "ui-navigators", "LoPager.svelte")), "AC5: the component is apps/reader/src/lib/ui-navigators/LoPager.svelte.").toBe(true);
    const tests = join(ROOT, "tests", "unit", "reader", "lo-pager.test.ts");
    expect(existsSync(tests), "AC5: add tests/unit/reader/lo-pager.test.ts, your own unit tests for lo-pager.ts.").toBe(true);
    for (const page of ["content/Note.svelte", "content/lab/Lab.svelte"]) {
      const source = readFileSync(join(READER, "src", "lib", "ui-components", page), "utf8");
      expect(source, `AC5: ${page} does not show <LoPager>. Every talk, note and lab page has the pager.`).toMatch(/<LoPager\b/);
    }
  });

  test("AC6: Stryker mutates lo-pager.ts, and a fresh report meets every floor", () => {
    const file = "apps/reader/src/lib/course/lo-pager.ts";
    const mutate: string[] = JSON.parse(readFileSync(join(ROOT, "stryker.config.json"), "utf8")).mutate;
    expect(mutate, `AC6: add ${file} to the mutate list in stryker.config.json (a person's decision you have been given for this assignment).`).toContain(file);
    const report = join(ROOT, "reports/mutation/mutation.json");
    expect(existsSync(report), "AC6: no reports/mutation/mutation.json. Run pnpm test:mutation after your change.").toBe(true);
    const findings = mutationFloorFindings(JSON.parse(readFileSync(report, "utf8")), JSON.parse(readFileSync(join(ROOT, "tests/mutation/mutation-floors.json"), "utf8")), ROOT);
    expect(findings.filter((f) => !f.startsWith("stale-floor")), "AC6: a file is below its floor, or has none. Run pnpm check:mutation-floors --update for the new file; kill survivors; never lower a floor.").toEqual([]);
  });
});
