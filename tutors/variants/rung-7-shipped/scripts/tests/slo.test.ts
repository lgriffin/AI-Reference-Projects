/**
 * Service level objectives: the budgets judge a measurement, and a breach teaches.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkObjectives, evaluate, type Measurement } from "../lib/slo.ts";
import { loadObjectives } from "../check-slo.ts";
import { measureBuild } from "../lib/measure.ts";

const measured: Measurement = {
  buildMs: 120,
  files: [
    { path: "index.html", bytes: 4000 },
    { path: "topic-01/index.html", bytes: 9000 },
    { path: "tutors.json", bytes: 7000 },
  ],
};

test("a measurement within every budget passes, with its headroom", () => {
  const results = evaluate(
    [
      { id: "build-time", measure: "build-ms", budget: 1000 },
      { id: "site-size", measure: "site-bytes", budget: 40000 },
    ],
    measured,
  );
  assert.deepEqual(results.map((r) => [r.id, r.value, r.ok]), [["build-time", 120, true], ["site-size", 20000, true]]);
  assert.match(results[1]!.message, /within its budget of 39\.1 kB \(50% headroom\)/);
});

test("a breach says by how much, where to look, and never to raise the budget to pass", () => {
  const [result] = evaluate([{ id: "site-size", measure: "site-bytes", budget: 16000 }], measured);
  assert.equal(result!.ok, false);
  assert.match(result!.message, /SLO "site-size" exceeded: the size of the whole site is 19\.5 kB, over its budget of 15\.6 kB by 3\.9 kB \(25%\)/);
  assert.match(result!.message, /The largest files are topic-01\/index\.html \(8\.8 kB\), tutors\.json \(6\.8 kB\), index\.html/);
  assert.match(result!.message, /Never raise a budget to make a release pass/);
});

test("an unknown measure or a missing budget makes the file invalid, and says where to add a measure", () => {
  const { objectives, problems } = checkObjectives({ objectives: [{ id: "x", measure: "page-weight", budget: 1 }, { id: "y", measure: "build-ms" }] });
  assert.deepEqual(objectives, []);
  assert.match(problems[0]!, /SLO "x" measures "page-weight", which this check does not know\. Known measures: \[[^\]]*site-bytes[^\]]*\]\. A new measure is code: add it to MEASURES in scripts\/lib\/slo\.ts/);
  assert.match(problems[1]!, /SLO "y" needs a budget/);
});

test("the real site is within every size budget in release/slo.yaml", () => {
  const { objectives, problems } = loadObjectives();
  assert.deepEqual(problems, []);
  // Time depends on the machine, so the gate judges only what is deterministic; pnpm release:slo judges time too.
  const sizes = objectives.filter((o) => o.measure !== "build-ms");
  assert.ok(sizes.length > 0, "release/slo.yaml has a size budget");
  const breaches = evaluate(sizes, measureBuild(1)).filter((r) => !r.ok);
  assert.deepEqual(breaches.map((r) => r.message), []);
});
