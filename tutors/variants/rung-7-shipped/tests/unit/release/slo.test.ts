/**
 * Service level objectives: the budgets judge a measurement, and a breach teaches.
 */
import { test } from "vitest";
import assert from "node:assert/strict";
import { checkObjectives, evaluate, exitStatus, format, MEASURES, type Measurement } from "../../../scripts/lib/slo.ts";

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

test("R-041: a breach says by how much, where to look, and never to raise the budget to pass", () => {
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

test("R-041: the reader is judged when it is built, and reported as not judged when it is not", () => {
  const objective = { id: "reader-size", measure: "reader-bytes", budget: 1000 };
  const built = { ...measured, reader: [{ path: "200.html", bytes: 400 }, { path: "_app/start.js", bytes: 500 }] };
  const [within] = evaluate([objective], built);
  assert.deepEqual([within!.value, within!.ok], [900, true]);
  const [over] = evaluate([{ ...objective, budget: 800 }], built);
  assert.match(over!.message, /SLO "reader-size" exceeded: the size of the built reader is 900 B, over its budget of 800 B by 100 B \(13%\)\. The largest files are _app\/start\.js \(500 B\), 200\.html \(400 B\)/);
  const [unbuilt] = evaluate([objective], measured);
  assert.equal(unbuilt!.ok, false);
  assert.ok(Number.isNaN(unbuilt!.value));
  assert.match(unbuilt!.message, /SLO "reader-size" was not judged: the size of the built reader could not be measured, because the reader is not built\. Run pnpm release:slo/);
  assert.equal(format(unbuilt!.value, "bytes"), "not measured");
});

test("a value exactly on its budget is within it, and the exit status is 1 as soon as one objective is not", () => {
  const exact = evaluate([{ id: "site-size", measure: "site-bytes", budget: 20000 }, { id: "build-time", measure: "build-ms", budget: 120 }], measured);
  assert.deepEqual(exact.map((r) => r.ok), [true, true]);
  assert.match(exact[0]!.message, /\(0% headroom\)/);
  assert.equal(exitStatus(exact), 0);
  const slow = evaluate([{ id: "site-size", measure: "site-bytes", budget: 20000 }, { id: "build-time", measure: "build-ms", budget: 119 }], measured);
  assert.equal(exitStatus(slow), 1);
  assert.match(slow[1]!.message, /SLO "build-time" exceeded: the time to build the fixture site is 120 ms, over its budget of 119 ms by 1 ms \(1%\)\. Profile the build/);
  assert.equal(exitStatus([]), 0);
});

test("sizes are written in bytes below a kilobyte and kB from there, times in whole milliseconds", () => {
  assert.equal(format(1023, "bytes"), "1023 B");
  assert.equal(format(1024, "bytes"), "1.0 kB");
  assert.equal(format(86.6, "ms"), "87 ms");
  assert.deepEqual(Object.keys(MEASURES), ["build-ms", "site-bytes", "reader-bytes"]);
});

test("a file that is not a list of objectives, an objective with no id, and a budget of zero are each named", () => {
  assert.deepEqual(checkObjectives(null).problems, ['release/slo.yaml must have an "objectives:" list.']);
  assert.deepEqual(checkObjectives({ objectives: {} }).problems, ['release/slo.yaml must have an "objectives:" list.']);
  const { objectives, problems } = checkObjectives({ objectives: [{ measure: "build-ms", budget: 1 }, { id: "z", measure: "build-ms", budget: 0 }, { id: "ok", measure: "site-bytes", budget: 1 }, { id: "s", measure: "build-ms", budget: "1" }] });
  assert.deepEqual(objectives.map((o) => o.id), ["ok"]);
  assert.deepEqual(problems.map((p) => p.slice(0, 32)), ["objectives[0] needs an id.", 'SLO "z" needs a budget: a positi', 'SLO "s" needs a budget: a positi']);
});
