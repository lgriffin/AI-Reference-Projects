/**
 * Grading test for Assignment 7, "Every page within budget" (tutors/course/topic-11-shipped, week 11, the
 * only week of rung 7). Skipped in the Single Gate until you start the assignment. Run it with:
 *
 *     pnpm test:assignment
 *
 * You design one release claim from end to end: a requirement, a scenario, a measure
 * (largest-page-bytes), an objective that uses it (release/slo.yaml) and a claim whose evidence is a test
 * you write (release/claims.yaml). The assignment is specified first, like everything since rung 4: AC1
 * asks for your EARS requirement and its Rule before any code. When this is green, run `pnpm test`,
 * `pnpm release:claims` and `pnpm release:slo`: the closure audit, the claims check, the architecture
 * tests (which keep your measure pure) and the Rung Fence must stay green too.
 * Each failure names the acceptance criterion (AC1 to AC5) it checks. Change the code, not the expectations.
 */
import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { loadObjectives } from "../../scripts/check-slo.ts";
import { claimProblems, readIfPresent } from "../../scripts/check-release-claims.ts";
import { audit, parseRequirements } from "../../scripts/checks/ears-audit.ts";
import { checkClaims } from "../../scripts/lib/claims.ts";
import { measureBuild } from "../../scripts/lib/measure.ts";
import { evaluate, MEASURES, type Measurement } from "../../scripts/lib/slo.ts";
import { ROOT } from "../support/paths.ts";

/** Skipped unless LADDER_ASSIGNMENT=1, so the variant's gate stays green until a learner starts. */
const graded = describe.skipIf(process.env["LADDER_ASSIGNMENT"] !== "1");

const requirements = () => parseRequirements(readFileSync(join(ROOT, "REQUIREMENTS.md"), "utf8"));
/** Your requirement: a release requirement after R-044 that is about the largest page. */
const yours = () => requirements().find((r) => Number(r.id.slice(2)) > 44 && /largest page/i.test(r.text) && /the release shall/.test(r.text));

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

graded("Specified first", () => {
  test("AC1: REQUIREMENTS.md holds a release requirement about the largest page, proved by a Rule", () => {
    assert.ok(yours(), 'AC1: add a requirement after R-044 (pnpm test:ears:audit --next-id) that says what the release shall do when the largest page of the site is over its budget. Name "the largest page" and "the release" in it.');
    assert.deepEqual(audit(ROOT), [], "AC1: the closure audit must be green: your requirement needs a Rule with its sentence, word for word, and a scenario (pnpm test:ears:audit).");
  });
});

graded("The measure", () => {
  test("AC2: largest-page-bytes measures the largest HTML page, not the largest file", () => {
    const def = MEASURES["largest-page-bytes"];
    assert.ok(def, 'AC2: add "largest-page-bytes" to MEASURES in scripts/lib/slo.ts');
    assert.equal(def.unit, "bytes", "AC2: a page's size is measured in bytes");
    assert.equal(def.read(measured), 5200, "AC2: tutors.json (9000 B) is the largest file, but the largest page is Setup.html (5200 B)");
    assert.equal(def.read({ buildMs: 1, files: [{ path: "tutors.json", bytes: 9 }] }), 0, "AC2: a build with no page has a largest page of 0 bytes, not an error");
  });

  test("AC3: a page over budget fails with a message that names the page and teaches", () => {
    const [result] = evaluate([{ id: "largest-page", measure: "largest-page-bytes", budget: 4096 }], measured);
    assert.equal(result!.ok, false, "AC3: 5200 B is over a budget of 4096 B");
    assert.match(result!.message, /SLO "largest-page" exceeded/, "AC3: the message names the objective");
    assert.match(result!.message, /topic-02-practice\/unit-1-lab\/book-1-first-lab\/Setup\.html/, "AC3: the message names the largest page, so the reader knows where to look");
    assert.match(result!.message, /Never raise a budget to make a release pass/, "AC3: the message keeps the ratchet's rule");
  });
});

graded("The objective and the claim", () => {
  test("AC4: release/slo.yaml has a largest-page objective, and the real site is within it", () => {
    const { objectives, problems } = loadObjectives();
    assert.deepEqual(problems, [], "AC4: release/slo.yaml must stay valid");
    const objective = objectives.find((o) => o.measure === "largest-page-bytes");
    assert.ok(objective, "AC4: add an objective with measure: largest-page-bytes to release/slo.yaml, with a why");
    assert.ok(objective.budget <= 4096, "AC4: a page budget should be tight enough to notice growth: 4096 bytes or less for the fixture, whose largest page is about 2 kB");
    assert.ok(typeof objective.why === "string" && objective.why.length > 20, "AC4: say in `why` who pays when a page grows");
    const [result] = evaluate([objective], measureBuild(1));
    assert.equal(result!.ok, true, `AC4: ${result!.message}`);
  });

  test("AC5: release/claims.yaml promises it, resting on your requirement, with evidence that exists and runs", () => {
    const doc = parse(readFileSync(join(ROOT, "release", "claims.yaml"), "utf8")) as { claims: { id: string; evidence: string[]; requirements?: string[] }[] };
    const claim = doc.claims.find((c) => c.id === "pages-within-budget");
    assert.ok(claim, 'AC5: add a claim with id "pages-within-budget" to release/claims.yaml');
    assert.deepEqual(checkClaims({ claims: [claim] }, readIfPresent, requirements().map((r) => r.id)), [], "AC5: the claim must pass the Closure Check on its own");
    assert.ok(yours() && claim.requirements?.includes(yours()!.id), `AC5: the claim rests on your requirement: add "requirements: [${yours()?.id ?? "R-0NN"}]" to it`);
    assert.ok(
      claim.evidence.some((e) => !e.startsWith("tests/assignment/") && readIfPresent(e.split("#")[0]!)?.includes("largest-page-bytes")),
      "AC5: the evidence is a test of yours, outside tests/assignment, that exercises largest-page-bytes",
    );
    assert.deepEqual(claimProblems().problems, [], "AC5: pnpm release:claims must stay clean for the whole file");
  });
});
