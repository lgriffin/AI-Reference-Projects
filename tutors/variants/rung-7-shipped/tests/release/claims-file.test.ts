/**
 * release/claims.yaml itself, on the disk: the Closure Check that pnpm release:claims runs, inside the gate,
 * and a second closure: the claims cover every part of the line, so a new layer cannot ship unpromised.
 */
import { test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { claimProblems } from "../../scripts/check-release-claims.ts";
import { ROOT } from "../support/paths.ts";

test("release/claims.yaml has no problem: every promise of this release has evidence", () => {
  const { count, problems } = claimProblems();
  assert.ok(count >= 12, "the release makes its promises across the whole line");
  assert.deepEqual(problems, []);
});

test("the claims rest on evidence from every part of the line", () => {
  const { claims } = parse(readFileSync(join(ROOT, "release", "claims.yaml"), "utf8")) as { claims: { id: string; evidence: string[] }[] };
  const evidence = claims.flatMap((c) => c.evidence);
  const parts: Record<string, RegExp> = {
    "the generator (conformance to upstream)": /^tests\/conformance\//,
    "the site (lite)": /^tests\/unit\/lite\//,
    "the command": /^tests\/unit\/cli\//,
    "the reader, in a browser": /^tests\/e2e\//,
    "a scenario of a requirement": /^tests\/bdd\/features\/.*\.feature#/,
    "the supply chain": /^tests\/unit\/scripts\/supply-chain/,
    "the release's own files": /^tests\/release\//,
  };
  const uncovered = Object.entries(parts).filter(([, pattern]) => !evidence.some((e) => pattern.test(e))).map(([part]) => part);
  assert.deepEqual(uncovered, [], "Coverage rule: a release of the whole line promises something about every part of it. Add a claim whose evidence comes from the part named, or say in RUNG.md why this release promises nothing about it.");
});
