/**
 * The Closure Check on release claims: each way a claim can lose its evidence fails, and says how to fix it.
 */
import { test } from "vitest";
import assert from "node:assert/strict";
import { checkClaims, scenariosIn, testsIn } from "../../../scripts/lib/claims.ts";

/** Written in pieces, so that suite health and the EARS audit, which read this file as text, see no skipped test and no unknown id here. */
const modified = (modifier: string) => `test.${modifier}`;
const UNKNOWN_ID = `R-${"099"}`;

const FILES: Record<string, string> = {
  "tests/bdd/features/x.feature": "Feature: X\n  @R-001\n  Rule: The site shall escape.\n    Scenario: A script stays text  \n      Given a\n\n    Scenario Outline: Many\n",
  "tests/e2e/x.e2e.ts": `test("a learner clicks (R-018)", async () => {});`,
  "a/tests/x.test.ts": `test("renders the course page", () => {});\n${modified("skip")}("a skipped one", () => {});\ntest("an option-skipped one", { skip: true }, () => {});`,
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
  assert.deepEqual(testsIn(`test('it\\'s fine', () => {}); it("works", () => {}); ${modified("todo")}(\`later\`);`), [
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
  assert.match(checkClaims(claim(evidence, { requirements: [UNKNOWN_ID] }), read, ["R-008"])[0]!, new RegExp(`Claim "page" rests on ${UNKNOWN_ID}, which is not in REQUIREMENTS\\.md\\. A promise cannot rest on a rule nobody wrote down`));
  assert.match(checkClaims(claim(evidence, { requirements: "R-8" }), read, ["R-008"])[0]!, /lists the requirement "R-8", which is not an id/);
  assert.match(checkClaims(claim(evidence, { requirements: [8] }), read, ["R-008"])[0]!, /lists the requirement 8, which is not an id/);
  assert.deepEqual(checkClaims(claim(evidence, { requirements: [UNKNOWN_ID] }), read), [], "without the list of ids the requirements are not checked");
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

test("a missing name is answered with up to two names that share a word, or with what the file defines", () => {
  const files: Record<string, string> = {
    "t/a.test.ts": `test("the course page renders", () => {}); test("a lab page renders", () => {}); test("the Topic PAGE links", () => {}); test("an odd one out", () => {});`,
    "t/none.test.ts": "export const nothing = 1;",
  };
  const ask = (id: string) => checkClaims(claim([id]), (path) => files[path])[0]!;
  assert.match(ask("t/a.test.ts#every page is here"), /Did you mean: "the course page renders", "a lab page renders"\?$/, "at most two, in file order");
  assert.match(ask("t/a.test.ts#TOPIC things"), /Did you mean: "the Topic PAGE links"\?$/, "whatever the case");
  assert.match(ask("t/a.test.ts#an odd lab"), /That file defines: "the course page renders", "a lab page renders", "the Topic PAGE links", "an odd one out"\.$/, "words of three letters or fewer are too common to count");
  assert.match(ask("t/none.test.ts#anything at all"), /That file defines: no tests\.$/);
});

test("ids, promises, requirement ids and test ids are each held to their exact form", () => {
  const evidence = ["a/tests/x.test.ts#renders the course page"];
  const withId = (id: unknown) => checkClaims({ claims: [{ id, promise: "The course page renders.", evidence }] }, read);
  for (const id of ["a", "a-b", "ab1-2c", "no-inline-script"]) assert.deepEqual(withId(id), [], id);
  for (const id of ["a--b", "a-", "-a", "A", "a_b", "a-b-", "a-B", "a b", "a-!b"]) assert.match(withId(id)[0]!, /needs an id in kebab-case/, id);
  assert.match(withId(7)[0]!, /^claims\[0\] needs an id in kebab-case/, "an id that is not text has no name to report");
  const withPromise = (promise: unknown) => checkClaims({ claims: [{ id: "p", promise, evidence }] }, read);
  assert.deepEqual(withPromise("1234567890"), [], "ten characters is a sentence, just");
  assert.match(withPromise("123456789")[0]!, /needs a promise/);
  assert.match(withPromise("   short    ")[0]!, /needs a promise/, "spaces are not a promise");
  for (const cite of ["XR-001", "R-0011", "R-01", "r-001"]) assert.match(checkClaims(claim(evidence, { requirements: [cite] }), read, ["R-001"])[0]!, /which is not an id/, cite);
  for (const id of ["see a/tests/x.test.ts#renders the course page", "a/tests/x.test.ts#renders the course page\nand more", "a/tests/x.test.ts#", "a/tests/x.test.js#renders the course page"]) {
    assert.match(checkClaims(claim([id]), read)[0]!, /is not a test id/, id);
  }
  assert.deepEqual(checkClaims(claim(["x/tests/assignment/y.test.ts#graded"]), () => `test("graded", () => {});`), [], "only the variant's own tests/assignment folder is the grading folder");
  for (const doc of ["claims", { claims: "none" }, [], 7]) assert.match(checkClaims(doc, read)[0]!, /must be a mapping with a "claims:" list/);
  assert.match(checkClaims({ claims: [null] }, read)[0]!, /^claims\[0\] is not a mapping/);
});

test("scenario titles and test names are read exactly, and a skip with any spacing is a skip", () => {
  assert.deepEqual(scenariosIn("  # Scenario: commented out\nScenario:Tight\n\tExample: Tabbed\t\n  Scenarios: none\n  my Scenario: no").map((s) => s.name), ["Tight", "Tabbed"]);
  assert.deepEqual(testsIn(`contest("no"); test ("no"); test("yes", { skip : true }, () => {}); it("also", { timeout: 5 }, () => {}); ${modified("only")}("focused", () => {});`), [
    { name: "yes", skipped: true },
    { name: "also", skipped: false },
    { name: "focused", skipped: false },
  ]);
  assert.deepEqual(testsIn("Scenario: A\n", "x.feature"), [{ name: "A", skipped: false }]);
  assert.deepEqual(testsIn("Scenario: A\n"), [], "a test file is not read as a feature");
});
