/**
 * Where the tests find things. The shared fixture lives beside the variants, in tutors/variants/fixtures.
 * It is found by walking up, because Stryker runs the tests from a copy of this folder in .stryker-tmp.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** The variant's root: the folder holding package.json and REQUIREMENTS.md. */
export const ROOT = resolve(import.meta.dirname, "..", "..");

function findFixtures(from: string): string {
  for (let dir = from; ; dir = dirname(dir)) {
    if (existsSync(join(dir, "fixtures", "ladder-sample-course", "course.md"))) return join(dir, "fixtures");
    if (dirname(dir) === dir) throw new Error(`no fixtures/ladder-sample-course above ${from}; the shared fixture lives in tutors/variants/fixtures`);
  }
}

export const FIXTURES = findFixtures(ROOT);
/** The shared course folder every variant builds. */
export const SAMPLE_COURSE = join(FIXTURES, "ladder-sample-course");
/** The tutors.json that upstream `tutors build` wrote for it: the oracle. */
export const ORACLE = join(FIXTURES, "ladder-sample-course.tutors.json");
