/**
 * The Closure Check on release claims: each way a claim can lose its evidence fails, and says how to fix it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkClaims, testsIn } from "../lib/claims.ts";
import { claimProblems } from "../check-release-claims.ts";

const FILES: Record<string, string> = {
  "a/tests/x.test.ts": `test("renders the course page", () => {});\ntest.skip("a skipped one", () => {});\ntest("an option-skipped one", { skip: true }, () => {});`,
};
const read = (path: string) => FILES[path];
const claim = (evidence: unknown, extra: Record<string, unknown> = {}) => ({ claims: [{ id: "page", promise: "The course page renders.", evidence, ...extra }] });

test("a claim whose evidence exists and runs is clean", () => {
  assert.deepEqual(checkClaims(claim(["a/tests/x.test.ts#renders the course page"]), read), []);
});

test("a claim with no evidence fails, and says a promise without a test is only told", () => {
  const [problem] = checkClaims(claim([]), read);
  assert.match(problem!, /Claim "page" promises "The course page renders." but names no evidence\. A promise without a test is only told \(L2\), not checked \(L3\)/);
  assert.match(checkClaims(claim(undefined), read)[0]!, /names no evidence/);
});

test("an unknown test id fails and suggests the nearest names", () => {
  const [missingTest] = checkClaims(claim(["a/tests/x.test.ts#renders the page"]), read);
  assert.match(missingTest!, /no test there has that name\. A test id is the exact name in test\("\.\.\."\)\. Did you mean: "renders the course page"/);
  const [missingFile] = checkClaims(claim(["a/tests/gone.test.ts#renders the course page"]), read);
  assert.match(missingFile!, /cites a\/tests\/gone\.test\.ts, which does not exist/);
  const [malformed] = checkClaims(claim(["renders the course page"]), read);
  assert.match(malformed!, /is not a test id\. Write "<file>#<test name>"/);
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

test("release/claims.yaml has no problem: every promise of this release has evidence", () => {
  const { count, problems } = claimProblems();
  assert.ok(count >= 8, "the release makes its promises");
  assert.deepEqual(problems, []);
});
