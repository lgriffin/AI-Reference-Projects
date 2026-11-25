/**
 * Golden file (R-008, R-009): one whole page, byte for byte. The site builder's other tests check parts of
 * pages; this one notices any change at all, such as a lost class, a reordered card or a new attribute.
 * Upstream pins its generator's output the same way, with a committed corpus and claims for every intended
 * difference (tests/generator/claims.yaml, pnpm check:generator-diff).
 *
 * A failure is not a bug report; it is a question. If the change is intended, regenerate the golden file
 * with `UPDATE_GOLDEN=1 pnpm test:conformance`, read the diff, and say why in the commit. Changing a golden
 * file is on AGENTS.md's "Ask a human first" list.
 */
import { test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildCourse } from "@ladder/gen";
import { buildSite } from "@ladder/lite";
import { NodeFileSystem } from "../../apps/cli/src/node-file-system.ts";
import { ROOT, SAMPLE_COURSE } from "../support/paths.ts";

const PAGE = "topic-02-practice/index.html";
const GOLDEN = join(ROOT, "tests", "conformance", "golden", PAGE.replaceAll("/", "__"));

test(`R-008, R-009: ${PAGE} of the shared fixture matches its golden file`, async () => {
  const course = await buildCourse(new NodeFileSystem(SAMPLE_COURSE), "ladder-sample-course");
  const actual = buildSite(course, { access: "public" }).find((page) => page.path === PAGE)?.html;
  assert.ok(actual, `the site has no ${PAGE}; R-009 says every topic has a page`);
  if (process.env.UPDATE_GOLDEN === "1") writeFileSync(GOLDEN, actual);
  const golden = readFileSync(GOLDEN, "utf8");
  if (actual === golden) return;
  const [a, g] = [actual.split("\n"), golden.split("\n")];
  const line = a.findIndex((text, i) => text !== g[i]);
  assert.fail(
    `Golden file rule: ${PAGE} no longer matches tests/conformance/golden/${PAGE.replaceAll("/", "__")}.\n` +
      `First difference at line ${line + 1}:\n  golden: ${g[line] ?? "(end of file)"}\n  actual: ${a[line] ?? "(end of file)"}\n` +
      "If the change is intended, run UPDATE_GOLDEN=1 pnpm test:conformance, review the diff, and explain it in the commit. " +
      'Changing a golden file is a person\'s decision (AGENTS.md, "Ask a human first").',
  );
});
