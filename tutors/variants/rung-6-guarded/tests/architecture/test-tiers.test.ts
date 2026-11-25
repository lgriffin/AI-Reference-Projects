/**
 * The test tiers' architecture: rung 4 adds two layers, tests/ (one folder per tier) and scripts/checks
 * (the pure logic behind the repository checks). Every failure names the rule, the offender and the fix.
 */
import { test } from "vitest";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../support/paths.ts";

/** Source without comments, so a comment may name what the code must not do. */
const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\/|(?<![:"'])\/\/.*$/gm, "");

test("scripts/checks imports only node: built-ins and its own files", () => {
  const dir = join(ROOT, "scripts", "checks");
  const offenders = readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".ts"))
    .flatMap((file) =>
      [...stripComments(readFileSync(join(dir, file), "utf8")).matchAll(/(?:from|import)\s*\(?\s*"([^"]+)"/g)]
        .map((m) => m[1]!)
        .filter((specifier) => !/^(node:|\.\.?\/)/.test(specifier))
        .map((specifier) => `scripts/checks/${file} imports "${specifier}"`),
    );
  assert.deepEqual(
    offenders,
    [],
    "Check script rule: scripts/checks runs under plain `node` (pnpm test:ears:audit, pnpm check:mutation-floors), without vitest's aliases or any test tool. " +
      "Keep its logic pure: read files with node:fs and take what you need as arguments; the suites in tests/suite-health and tests/mutation import it, never the other way round.",
  );
});

test("every tier folder under tests/ is in the map in tests/TESTING.md, and every tier in the map exists", () => {
  const folders = readdirSync(join(ROOT, "tests")).filter((name) => statSync(join(ROOT, "tests", name)).isDirectory()).sort();
  const map = readFileSync(join(ROOT, "tests", "TESTING.md"), "utf8").split(/^## /m).find((section) => section.startsWith("The map")) ?? "";
  const mapped = [...map.matchAll(/^\| `([a-z0-9-]+)\/` \|/gm)].map((m) => m[1]!).sort();
  assert.deepEqual(
    folders,
    mapped,
    "Tier map rule: tests/TESTING.md has one row per folder under tests/, naming its tier, what it proves and its command. " +
      "Add a row for a new folder (or put the tests in an existing tier); remove the row of a folder you deleted.",
  );
});
