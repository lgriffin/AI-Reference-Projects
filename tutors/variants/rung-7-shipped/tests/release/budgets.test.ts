/**
 * release/slo.yaml itself: a valid file, and the real site within the budgets the gate can measure. Time
 * depends on the machine and the reader is built after the tests, so `pnpm release:slo` judges those.
 */
import { test } from "vitest";
import assert from "node:assert/strict";
import { loadObjectives } from "../../scripts/check-slo.ts";
import { measureBuild } from "../../scripts/lib/measure.ts";
import { evaluate, MEASURES } from "../../scripts/lib/slo.ts";

test("release/slo.yaml is valid, and every measure the check knows has an objective", () => {
  const { objectives, problems } = loadObjectives();
  assert.deepEqual(problems, []);
  const unused = Object.keys(MEASURES).filter((measure) => !objectives.some((o) => o.measure === measure));
  assert.deepEqual(unused, [], "Budget rule: a measure with no objective is measured by nobody. Add an objective for it to release/slo.yaml, or remove the measure.");
});

test("the real site is within every size budget in release/slo.yaml that the gate can measure", () => {
  const sizes = loadObjectives().objectives.filter((o) => !["build-ms", "reader-bytes"].includes(o.measure));
  assert.ok(sizes.length > 0, "release/slo.yaml has a budget for the site's size");
  const breaches = evaluate(sizes, measureBuild(1)).filter((r) => !r.ok);
  assert.deepEqual(breaches.map((r) => r.message), []);
});
