/**
 * The Trusted HTML rule, moved here from rung 3's html.test.ts: it reads source text, so it belongs with
 * the architecture tier, which Stryker does not run (it would read instrumented source).
 */
import { test } from "vitest";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../support/paths.ts";

test("only html.ts and markdown.ts make SafeHtml, because only they escape what they wrap", () => {
  const src = join(ROOT, "packages", "lite", "src");
  const makers = readdirSync(src).filter((file) => /new SafeHtml\(/.test(readFileSync(join(src, file), "utf8")));
  assert.deepEqual(
    makers.sort(),
    ["html.ts", "markdown.ts"],
    "Trusted HTML rule: `new SafeHtml(...)` skips escaping, so it may appear only in packages/lite/src/html.ts and markdown.ts. " +
      "Build the HTML with the html`` template instead; it escapes every value for you.",
  );
});

test("the reader never makes SafeHtml: it shows Markdown through renderMarkdown and text through Svelte", () => {
  const src = join(ROOT, "apps", "reader", "src");
  const makers = readdirSync(src, { recursive: true, encoding: "utf8" }).filter((file) => /\.(ts|svelte)$/.test(file) && /new SafeHtml\(/.test(readFileSync(join(src, file), "utf8")));
  assert.deepEqual(
    makers,
    [],
    "Trusted HTML rule: `new SafeHtml(...)` skips escaping. The reader shows course text with {text}, which Svelte escapes, and course Markdown with <Markdown markdown={...} />, " +
      "which calls renderMarkdown from @ladder/lite (it escapes first). See also the Raw HTML rule in tests/architecture/reader-layers.test.ts.",
  );
});
