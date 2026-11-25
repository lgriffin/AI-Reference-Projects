/**
 * Grading test for the Shipped assignment (course topic-08-shipped, "Every page within budget").
 * Skipped unless LADDER_ASSIGNMENT=1, so the Single Gate stays green before you start:
 *
 *     LADDER_ASSIGNMENT=1 node --test tests/assignment/*.test.ts
 *
 * You add a measure (largest-page-bytes), an objective that uses it (release/slo.yaml), and a claim
 * whose evidence is a test you write (release/claims.yaml). Do not change the expectations to make the
 * test pass: change the code.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { checkClaims } from "../../scripts/lib/claims.ts";
import { evaluate, MEASURES, type Measurement } from "../../scripts/lib/slo.ts";
import { loadObjectives } from "../../scripts/check-slo.ts";
import { readIfPresent } from "../../scripts/check-release-claims.ts";
import { measureBuild } from "../../scripts/lib/measure.ts";

const skip = process.env.LADDER_ASSIGNMENT !== "1" && "set LADDER_ASSIGNMENT=1 to grade the shipped assignment";
const ROOT = join(import.meta.dirname, "..", "..");

/** tutors.json is the largest file, but it is not a page: the measure must look at .html files only. */
const measured: Measurement = {
  buildMs: 50,
  files: [
    { path: "index.html", bytes: 3000 },
    { path: "topic-02-practice/unit-1-lab/book-1-first-lab/Setup.html", bytes: 5200 },
    { path: "tutors.json", bytes: 9000 },
    { path: "version.json", bytes: 120 },
  ],
};

test("AC1: largest-page-bytes measures the largest HTML page, not the largest file", { skip }, () => {
  const def = MEASURES["largest-page-bytes"];
  assert.ok(def, 'add "largest-page-bytes" to MEASURES in scripts/lib/slo.ts');
  assert.equal(def.unit, "bytes");
  assert.equal(def.read(measured), 5200);
});

test("AC2: a page over budget fails with a message that names the page and teaches", { skip }, () => {
  const [result] = evaluate([{ id: "largest-page", measure: "largest-page-bytes", budget: 4096 }], measured);
  assert.equal(result!.ok, false);
  assert.match(result!.message, /SLO "largest-page" exceeded/);
  assert.match(result!.message, /topic-02-practice\/unit-1-lab\/book-1-first-lab\/Setup\.html/, "the message names the largest page, so the reader knows where to look");
  assert.match(result!.message, /Never raise a budget to make a release pass/);
});

test("AC3: release/slo.yaml has a largest-page objective, and the real site is within it", { skip }, () => {
  const { objectives, problems } = loadObjectives();
  assert.deepEqual(problems, []);
  const objective = objectives.find((o) => o.measure === "largest-page-bytes");
  assert.ok(objective, "add an objective with measure: largest-page-bytes to release/slo.yaml");
  assert.ok(objective.budget <= 16384, "a page budget should be tight enough to notice growth: 16 kB or less for the fixture");
  const [result] = evaluate([objective], measureBuild(1));
  assert.equal(result!.ok, true, result!.message);
});

test("AC4: release/claims.yaml promises it, with evidence that exists and runs", { skip }, () => {
  const doc = parse(readFileSync(join(ROOT, "release", "claims.yaml"), "utf8")) as { claims: { id: string; evidence: string[] }[] };
  const claim = doc.claims.find((c) => c.id === "pages-within-budget");
  assert.ok(claim, 'add a claim with id "pages-within-budget" to release/claims.yaml');
  assert.deepEqual(checkClaims({ claims: [claim] }, readIfPresent), []);
  assert.ok(
    claim.evidence.some((e) => readIfPresent(e.split("#")[0]!)?.includes("largest-page-bytes")),
    "the evidence is a test that exercises largest-page-bytes",
  );
});
