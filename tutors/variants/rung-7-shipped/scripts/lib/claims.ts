/**
 * Release claims: what a release promises, each promise tied to the test that is its evidence. The check
 * is a Closure Check: every claim must resolve to a test that exists and runs, and the gate makes every
 * test pass, so a green gate plus a clean check means every promise has evidence (R-040).
 *
 * Evidence is a test id, "<file>#<name>": the exact name given to test("...") in a *.test.ts or *.e2e.ts
 * file, or the exact title of a Scenario in a *.feature file. A claim may also name the requirements it
 * rests on ("requirements: [R-023]"), and each must be a row of REQUIREMENTS.md.
 *
 * Upstream's release/claims.yaml says something else with the same discipline: it lists the differences
 * from production a release intends, and the release harness fails on any difference no claim covers.
 * Its check (scripts/checks/release-claims.ts) fails on a claim that cites a Rule id no feature under
 * tests/bdd/features defines. Here a claim cites a test id, and the check fails on one no test defines.
 *
 * Pure: the caller hands in a function that reads a file, so the tests need no disk.
 */

export type Claim = { id: string; promise: string; evidence: string[]; requirements?: string[] };

/** The keys a claim may have. A typo ("evidense") would otherwise be a claim with no evidence that looks fine. */
const CLAIM_KEYS = ["id", "promise", "evidence", "requirements"];
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** A test id: `<file>#<name>`, the file relative to the workspace root: a test file, a browser test file or a feature. */
export const TEST_ID = /^(?<file>[\w./-]+\.(?:test\.ts|e2e\.ts|feature))#(?<name>.+)$/;

/** Grading tests skip until a learner asks for them, so they are never evidence. */
const NEVER_RUNS = /^tests\/assignment\//;

/** Each `Scenario: title` of a feature file. A scenario under a Rule runs whenever its steps file loads the feature. */
export function scenariosIn(feature: string): { name: string; skipped: boolean }[] {
  return [...feature.matchAll(/^[ \t]*(?:Scenario|Scenario Outline|Example):[ \t]*(?<name>.+?)[ \t]*$/gm)].map((m) => ({ name: m.groups!.name!, skipped: false }));
}

/** Each `test("name"` (or `it`) in a file, with whether it would be skipped. For a feature file, each Scenario. */
export function testsIn(source: string, file = "x.test.ts"): { name: string; skipped: boolean }[] {
  if (file.endsWith(".feature")) return scenariosIn(source);
  return [...source.matchAll(/\b(?:test|it)(?<mod>\.skip|\.todo|\.only)?\(\s*(?<q>["'`])(?<name>(?:(?!\k<q>)[^\\]|\\.)*)\k<q>\s*(?<opts>,\s*\{[^}]*\})?/g)].map((m) => ({
    name: m.groups!.name!.replace(/\\(.)/g, "$1"),
    skipped: m.groups!.mod === ".skip" || m.groups!.mod === ".todo" || /\b(skip|todo)\s*:/.test(m.groups!.opts ?? ""),
  }));
}

/**
 * Every problem with a parsed claims file, as a sentence a person can act on. Empty means every claim
 * names evidence that exists and runs. `readFile` returns a file's text, or undefined when it is missing.
 * `requirementIds` are the ids in REQUIREMENTS.md; leave it out and the "requirements" of a claim are not checked.
 */
export function checkClaims(doc: unknown, readFile: (path: string) => string | undefined, requirementIds?: readonly string[]): string[] {
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
    if (claim.requirements !== undefined) {
      const cited = Array.isArray(claim.requirements) ? claim.requirements : [claim.requirements];
      for (const cite of cited) {
        if (typeof cite !== "string" || !/^R-\d{3}$/.test(cite)) problems.push(`${name} lists the requirement ${JSON.stringify(cite)}, which is not an id. Write the ids as a list: "requirements: [R-023]".`);
        else if (requirementIds && !requirementIds.includes(cite)) {
          problems.push(`${name} rests on ${cite}, which is not in REQUIREMENTS.md. A promise cannot rest on a rule nobody wrote down: state the requirement first (pnpm test:ears:audit --next-id), or cite one that exists.`);
        }
      }
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
        problems.push(`${name} has evidence ${JSON.stringify(item)}, which is not a test id. Write "<file>#<name>": a *.test.ts or *.e2e.ts file and the exact name in test("..."), or a *.feature file and the exact title of a Scenario, e.g. "tests/unit/lite/csp.test.ts#R-023: every page carries the policy as its first meta after the charset, and no script".`);
        continue;
      }
      const { file, name: testName } = match.groups as { file: string; name: string };
      if (NEVER_RUNS.test(file)) {
        problems.push(`${name} cites ${file}. Grading tests under tests/assignment skip until LADDER_ASSIGNMENT=1, so they prove nothing about a release. Move the test into the tier it belongs to (tests/TESTING.md) and cite it there.`);
        continue;
      }
      const source = readFile(file);
      if (source === undefined) {
        if (missingFiles.has(file)) continue;
        missingFiles.add(file);
        problems.push(`${name} cites ${file}, which does not exist. If the test moved, update the evidence; if it was deleted, the promise has lost its evidence: restore a test or withdraw the claim.`);
        continue;
      }
      const tests = testsIn(source, file);
      const found = tests.find((t) => t.name === testName);
      if (!found) {
        // Names that share a word of four letters or more with what was asked for: the likeliest renames, in file order.
        const words = (text: string) => text.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
        const wanted = words(testName);
        const near = tests.map((t) => t.name).filter((n) => words(n).some((w) => wanted.includes(w))).slice(0, 2);
        problems.push(
          `${name} cites the test "${testName}" in ${file}, and no test there has that name. A test id is the exact name in test("...") or the exact title of a Scenario. ` +
            (near.length > 0 ? `Did you mean: ${near.map((n) => `"${n}"`).join(", ")}?` : `That file defines: ${tests.map((t) => `"${t.name}"`).join(", ") || "no tests"}.`),
        );
      } else if (found.skipped) {
        problems.push(`${name} cites "${testName}" in ${file}, which is skipped. A skipped test is not evidence: it never runs in the gate. Unskip it or cite one that runs.`);
      }
    }
  });
  return problems;
}
