/**
 * Suite health: tests that test the tests. A suite can rot without going red: a focused test hides the
 * others, a skipped one stops proving its rule, a file named so the runner never collects it proves
 * nothing, and a property that cannot fail proves less than it seems. Mirrors upstream
 * scripts/checks/suite-health.ts (runway tier O), cut down to the four findings this rung needs.
 * tests/suite-health/suite-health.test.ts runs these on negative fixtures, then on this repository.
 */

export type SuiteFinding = { kind: "only" | "skip" | "uncollected" | "no-negative-fixture"; file: string; detail: string };

/** Where skipping is allowed: the assignment's grading tests skip until a learner asks for them. */
export const SKIP_ALLOWED = /^tests\/assignment\//;

/** What vitest.config.ts collects. Keep in step with its `include`. */
export const COLLECTED = [/^tests\/.*\.test\.ts$/, /^tests\/bdd\/steps\/.*\.steps\.ts$/];

/** Source without comments, so prose that says "a test (...)" is not taken for one. */
const stripComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\/|(?<![:"'])\/\/.*$/gm, "");

/** Findings in one test file's source. */
export function lintTestSource(file: string, source: string): SuiteFinding[] {
  const findings: SuiteFinding[] = [];
  for (const match of source.matchAll(/\b(?:test|it|describe|Scenario|RuleScenario)\.only\s*\(\s*(["'`])(.*?)\1/g)) {
    findings.push({ kind: "only", file, detail: `"${match[2]}" is focused with .only, so the other tests in its file are silently skipped. Remove .only before committing.` });
  }
  if (!SKIP_ALLOWED.test(file)) {
    for (const match of source.matchAll(/\b(?:test|it|describe)\.(skip|todo|skipIf|runIf|fails)\s*\(/g)) {
      findings.push({ kind: "skip", file, detail: `.${match[1]} stops a test from proving its rule. Fix the test or the code; only tests/assignment/ may skip (until a learner asks for the grading tests).` });
    }
  }
  if (/^tests\/fuzz\/.*\.test\.ts$/.test(file) && !/(?:test|it)\(\s*["'`][^"'`]*can fail/.test(source)) {
    findings.push({ kind: "no-negative-fixture", file, detail: 'a property test needs a negative fixture: one test, titled "... can fail", that runs the property against a broken implementation and expects a counterexample. A property that cannot fail proves nothing.' });
  }
  return findings;
}

/** A TypeScript file under tests/ that declares tests but that vitest will never collect. */
export function lintUncollected(file: string, source: string): SuiteFinding[] {
  const declares = /\b(?:test|it|describe|describeFeature)\s*\(/.test(stripComments(source));
  if (!declares || COLLECTED.some((pattern) => pattern.test(file))) return [];
  return [{ kind: "uncollected", file, detail: "declares tests, but vitest.config.ts does not collect it. Name it *.test.ts (or *.steps.ts under tests/bdd/steps)." }];
}
