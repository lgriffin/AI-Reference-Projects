/**
 * The Closure Check on release claims: each way a claim can lose its evidence fails, and says how to fix it.
 */
import { test } from "vitest";
import assert from "node:assert/strict";
import { checkClaims, scenariosIn, testsIn } from "../../../scripts/lib/claims.ts";

const FILES: Record<string, string> = {
  "tests/bdd/features/x.feature": "Feature: X\n  @R-001\n  Rule: The site shall escape.\n    Scenario: A script stays text  \n      Given a\n\n    Scenario Outline: Many\n",
  "tests/e2e/x.e2e.ts": `test("a learner clicks (R-018)", async () => {});`,
  "a/tests/x.test.ts": `test("renders the course page", () => {});\ntest.skip("a skipped one", () => {});\ntest("an option-skipped one", { skip: true }, () => {});`,
};
const read = (path: string) => FILES[path];
const claim = (evidence: unknown, extra: Record<string, unknown> = {}) => ({ claims: [{ id: "page", promise: "The course page renders.", evidence, ...extra }] });

test("a claim whose evidence exists and runs is clean", () => {
  assert.deepEqual(checkClaims(claim(["a/tests/x.test.ts#renders the course page"]), read), []);
});

test("R-040: a claim with no evidence fails, and says a promise without a test is only told", () => {
  const [problem] = checkClaims(claim([]), read);
  assert.match(problem!, /Claim "page" promises "The course page renders." but names no evidence\. A promise without a test is only told \(L2\), not checked \(L3\)/);
  assert.match(checkClaims(claim(undefined), read)[0]!, /names no evidence/);
});

test("an unknown test id fails and suggests the nearest names", () => {
  const [missingTest] = checkClaims(claim(["a/tests/x.test.ts#renders the page"]), read);
  assert.match(missingTest!, /no test there has that name\. A test id is the exact name in test\("\.\.\."\) or the exact title of a Scenario\. Did you mean: "renders the course page"/);
  const [missingFile] = checkClaims(claim(["a/tests/gone.test.ts#renders the course page"]), read);
  assert.match(missingFile!, /cites a\/tests\/gone\.test\.ts, which does not exist/);
  const [malformed] = checkClaims(claim(["renders the course page"]), read);
  assert.match(malformed!, /is not a test id\. Write "<file>#<name>": a \*\.test\.ts or \*\.e2e\.ts file/);
});

test("a skipped test is not evidence", () => {
  assert.match(checkClaims(claim(["a/tests/x.test.ts#a skipped one"]), read)[0]!, /which is skipped\. A skipped test is not evidence/);
  assert.match(checkClaims(claim(["a/tests/x.test.ts#an option-skipped one"]), read)[0]!, /which is skipped/);
});

test("a misspelt key, a missing promise, a duplicate id and a bad file all fail", () => {
  assert.match(checkClaims(claim(["a/tests/x.test.ts#renders the course page"], { evidense: [] }), read)[0]!, /unknown key "evidense"/);
  assert.match(checkClaims({ claims: [{ id: "p", evidence: ["a/tests/x.test.ts#renders the course page"] }] }, read)[0]!, /needs a promise/);
  const twice = { claims: [claim(["a/tests/x.test.ts#renders the course page"]).claims[0], claim(["a/tests/x.test.ts#renders the course page"]).claims[0]] };
  assert.match(checkClaims(twice, read)[0]!, /appears twice/);
  assert.match(checkClaims(null, read)[0]!, /must be a mapping with a "claims:" list/);
});

test("test names are read with their quotes and escapes", () => {
  assert.deepEqual(testsIn(`test('it\\'s fine', () => {}); it("works", () => {}); test.todo(\`later\`);`), [
    { name: "it's fine", skipped: false },
    { name: "works", skipped: false },
    { name: "later", skipped: true },
  ]);
});

test("R-040: a scenario in a feature and a browser test are evidence, by exact title", () => {
  assert.deepEqual(checkClaims(claim(["tests/bdd/features/x.feature#A script stays text", "tests/bdd/features/x.feature#Many", "tests/e2e/x.e2e.ts#a learner clicks (R-018)"]), read), []);
  assert.match(checkClaims(claim(["tests/bdd/features/x.feature#A script stays"]), read)[0]!, /no test there has that name\. A test id is the exact name in test\("\.\.\."\) or the exact title of a Scenario\. Did you mean: "A script stays text"/);
  assert.deepEqual(scenariosIn(FILES["tests/bdd/features/x.feature"]!).map((s) => s.name), ["A script stays text", "Many"]);
  assert.match(checkClaims(claim(["a/tests/x.steps.ts#renders the course page"]), read)[0]!, /is not a test id/);
});

test("a grading test is never evidence, whatever it is called", () => {
  const [problem, ...rest] = checkClaims(claim(["tests/assignment/shipped.grading.test.ts#AC1: anything"]), read);
  assert.match(problem!, /Grading tests under tests\/assignment skip until LADDER_ASSIGNMENT=1, so they prove nothing about a release/);
  assert.deepEqual(rest, []);
});

test("a claim may rest on requirements, and each must be in REQUIREMENTS.md", () => {
  const evidence = ["a/tests/x.test.ts#renders the course page"];
  assert.deepEqual(checkClaims(claim(evidence, { requirements: ["R-008"] }), read, ["R-008"]), []);
  assert.match(checkClaims(claim(evidence, { requirements: ["R-099"] }), read, ["R-008"])[0]!, /Claim "page" rests on R-099, which is not in REQUIREMENTS\.md\. A promise cannot rest on a rule nobody wrote down/);
  assert.match(checkClaims(claim(evidence, { requirements: "R-8" }), read, ["R-008"])[0]!, /lists the requirement "R-8", which is not an id/);
  assert.match(checkClaims(claim(evidence, { requirements: [8] }), read, ["R-008"])[0]!, /lists the requirement 8, which is not an id/);
  assert.deepEqual(checkClaims(claim(evidence, { requirements: ["R-099"] }), read), [], "without the list of ids the requirements are not checked");
});

test("each problem is reported once, a missing file once per claim, and a clean claim beside a broken one stays clean", () => {
  const doc = {
    claims: [
      { id: "ok", promise: "The course page renders.", evidence: ["a/tests/x.test.ts#renders the course page"] },
      { id: "Bad Id", promise: "short", evidence: ["a/tests/gone.test.ts#one", "a/tests/gone.test.ts#two", 7] },
      "not a mapping",
    ],
  };
  const problems = checkClaims(doc, read);
  assert.equal(problems.length, 5);
  assert.match(problems[0]!, /claims\[1\]|Claim "Bad Id" needs an id in kebab-case/);
  assert.match(problems[1]!, /needs a promise/);
  assert.match(problems[2]!, /cites a\/tests\/gone\.test\.ts, which does not exist/);
  assert.match(problems[3]!, /has evidence 7, which is not a test id/);
  assert.match(problems[4]!, /claims\[2\] is not a mapping/);
  assert.match(checkClaims({ claims: [{ promise: "The course page renders.", evidence: ["a/tests/x.test.ts#nope"] }] }, read)[1]!, /That file defines: |Did you mean/);
});
