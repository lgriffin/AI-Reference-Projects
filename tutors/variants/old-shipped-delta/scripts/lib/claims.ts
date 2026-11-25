/**
 * Release claims: what a release promises, each promise tied to the test that is its evidence. The check
 * is a Closure Check: every claim must resolve to a test that exists and runs, and the Single Gate makes
 * every test pass, so a green gate plus a clean check means every promise has evidence.
 *
 * Upstream's release/claims.yaml says something else with the same discipline: it lists the differences
 * from production a release intends, and the release harness fails on any difference no claim covers.
 * Its check (scripts/checks/release-claims.ts) fails on a claim that cites a Rule id no feature under
 * tests/bdd/features defines. Here a claim cites a test id, and the check fails on one no test defines.
 *
 * Pure: the caller hands in a function that reads a file, so the tests need no disk.
 */

export type Claim = { id: string; promise: string; evidence: string[] };

/** The keys a claim may have. A typo ("evidense") would otherwise be a claim with no evidence that looks fine. */
const CLAIM_KEYS = ["id", "promise", "evidence"];
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** A test id: `<file>#<test name>`, the file relative to the workspace root. */
export const TEST_ID = /^(?<file>[\w./-]+\.test\.ts)#(?<name>.+)$/;

/** Each `test("name"` (or `it`) in a file, with whether it would be skipped. */
export function testsIn(source: string): { name: string; skipped: boolean }[] {
  return [...source.matchAll(/\b(?:test|it)(?<mod>\.skip|\.todo|\.only)?\(\s*(?<q>["'`])(?<name>(?:(?!\k<q>)[^\\]|\\.)*)\k<q>\s*(?<opts>,\s*\{[^}]*\})?/g)].map((m) => ({
    name: m.groups!.name!.replace(/\\(.)/g, "$1"),
    skipped: m.groups!.mod === ".skip" || m.groups!.mod === ".todo" || /\b(skip|todo)\s*:/.test(m.groups!.opts ?? ""),
  }));
}

/**
 * Every problem with a parsed claims file, as a sentence a person can act on. Empty means every claim
 * names evidence that exists and runs. `readFile` returns a file's text, or undefined when it is missing.
 */
export function checkClaims(doc: unknown, readFile: (path: string) => string | undefined): string[] {
  const problems: string[] = [];
  if (typeof doc !== "object" || doc === null || !Array.isArray((doc as { claims?: unknown }).claims)) {
    return ['release/claims.yaml must be a mapping with a "claims:" list. Start from "claims: []" and add one claim per promise (release/README.md, "Writing a claim").'];
  }
  const seen = new Set<string>();
  (doc as { claims: unknown[] }).claims.forEach((raw, index) => {
    const where = `claims[${index}]`;
    if (typeof raw !== "object" || raw === null) {
      problems.push(`${where} is not a mapping. A claim has an id, a promise and a list of evidence.`);
      return;
    }
    const claim = raw as Record<string, unknown>;
    const id = typeof claim.id === "string" ? claim.id : undefined;
    const name = id ? `Claim "${id}"` : where;
    for (const key of Object.keys(claim).filter((k) => !CLAIM_KEYS.includes(k))) {
      problems.push(`${name} has an unknown key "${key}". A claim has exactly [${CLAIM_KEYS.join(", ")}]; a misspelt key would hide its evidence.`);
    }
    if (!id || !ID.test(id)) problems.push(`${name} needs an id in kebab-case ("generator-conforms"), so a report and a person can name it.`);
    else if (seen.has(id)) problems.push(`${name} appears twice. Each promise is made once; merge the two or rename one.`);
    else seen.add(id);
    if (typeof claim.promise !== "string" || claim.promise.trim().length < 10) {
      problems.push(`${name} needs a promise: one sentence, in words a learner or a maintainer would use, of what this release guarantees.`);
    }
    const evidence = claim.evidence;
    if (!Array.isArray(evidence) || evidence.length === 0) {
      problems.push(
        `${name} promises "${String(claim.promise ?? "?")}" but names no evidence. A promise without a test is only told (L2), not checked (L3). ` +
          'Add a test that would fail if the promise broke, and list it as evidence: "<file>#<test name>".',
      );
      return;
    }
    const missingFiles = new Set<string>();
    for (const item of evidence) {
      const match = typeof item === "string" ? TEST_ID.exec(item) : null;
      if (!match?.groups) {
        problems.push(`${name} has evidence ${JSON.stringify(item)}, which is not a test id. Write "<file>#<test name>", e.g. "apps/cli/tests/release.test.ts#the site has no script: no <script> element and no inline event handler".`);
        continue;
      }
      const { file, name: testName } = match.groups as { file: string; name: string };
      const source = readFile(file);
      if (source === undefined) {
        if (missingFiles.has(file)) continue;
        missingFiles.add(file);
        problems.push(`${name} cites ${file}, which does not exist. If the test moved, update the evidence; if it was deleted, the promise has lost its evidence: restore a test or withdraw the claim.`);
        continue;
      }
      const tests = testsIn(source);
      const found = tests.find((t) => t.name === testName);
      if (!found) {
        const words = (text: string) => new Set(text.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
        const wanted = words(testName);
        const near = tests
          .map((t) => ({ name: t.name, shared: [...words(t.name)].filter((w) => [...wanted].some((x) => w.startsWith(x) || x.startsWith(w))).length }))
          .filter((t) => t.shared > 0)
          .sort((a, b) => b.shared - a.shared)
          .slice(0, 2)
          .map((t) => t.name);
        problems.push(
          `${name} cites the test "${testName}" in ${file}, and no test there has that name. A test id is the exact name in test("..."). ` +
            (near.length > 0 ? `Did you mean: ${near.map((n) => `"${n}"`).join(", ")}?` : `That file defines: ${tests.map((t) => `"${t.name}"`).join(", ") || "no tests"}.`),
        );
      } else if (found.skipped) {
        problems.push(`${name} cites "${testName}" in ${file}, which is skipped. A skipped test is not evidence: it never runs in the Single Gate. Unskip it or cite one that runs.`);
      }
    }
  });
  return problems;
}
