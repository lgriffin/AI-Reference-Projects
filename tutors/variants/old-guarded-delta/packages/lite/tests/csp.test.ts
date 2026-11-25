/**
 * Content Security Policy: every page carries a strict policy as its first meta after the charset, and
 * the policy allows no script at all. If escaping or safeUrl ever misses something, the browser still
 * refuses to run it. Upstream's apps do not send a CSP yet (tests/security/known-response-gaps.txt lists
 * "missing-header: reader: Content-Security-Policy"); a static site with no script can afford a strict one.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Course } from "@ladder/model";
import { buildSite, CSP, STYLE, STYLE_HASH } from "@ladder/lite";

const ORACLE = join(import.meta.dirname, "..", "..", "..", "..", "fixtures", "ladder-sample-course.tutors.json");
const upstream: Course = JSON.parse(readFileSync(ORACLE, "utf8"));

const directives = (policy: string) => new Map(policy.split(";").map((part) => part.trim().split(/\s+/)).map(([name, ...values]) => [name!, values]));

test("the style hash in the policy is the hash of the style lite writes", () => {
  const actual = `sha256-${createHash("sha256").update(STYLE).digest("base64")}`;
  assert.equal(
    STYLE_HASH,
    actual,
    `CSP rule: STYLE changed, so its hash in packages/lite/src/html.ts is stale and browsers would drop the style. Set STYLE_HASH = "${actual}". ` +
      "Never fix this with 'unsafe-inline': that would let an injected style or script tag through too.",
  );
});

test("the policy allows no script, no plugin, no base and no form, and nothing inline but the hashed style", () => {
  const policy = directives(CSP);
  const why = "CSP rule: lite pages run no script, so the policy says so. Keep default-src 'none' and add no script-src; see packages/lite/src/html.ts.";
  assert.deepEqual(policy.get("default-src"), ["'none'"], why);
  assert.equal(policy.has("script-src"), false, why);
  assert.deepEqual(policy.get("style-src"), [`'${STYLE_HASH}'`], why);
  assert.deepEqual(policy.get("base-uri"), ["'none'"], why);
  assert.deepEqual(policy.get("form-action"), ["'none'"], why);
  assert.doesNotMatch(CSP, /unsafe-inline|unsafe-eval|unsafe-hashes|\*|data:/, why);
});

test("every page carries the policy as its first meta after the charset, and no script", () => {
  for (const access of ["public", "private"] as const) {
    for (const page of buildSite(upstream, { access })) {
      const head = page.html.slice(0, page.html.indexOf("</head>"));
      const metas = [...head.matchAll(/<meta ([^>]*)>/g)].map((m) => m[1]!);
      assert.equal(metas[0], 'charset="utf-8"', `${page.path}: the charset comes first`);
      assert.equal(
        metas[1]?.replaceAll("&#39;", "'"),
        `http-equiv="Content-Security-Policy" content="${CSP}"`,
        `CSP rule: ${page.path} must carry the policy right after the charset, before any style or content, or the browser applies it too late. See page() in packages/lite/src/html.ts.`,
      );
      assert.equal(page.html.match(/Content-Security-Policy/g)?.length, 1, `${page.path}: exactly one policy`);
      assert.doesNotMatch(page.html, /<script|\son[a-z]+=/i, `${page.path}: lite writes no script and no event handler`);
    }
  }
});

test("a private build marks every page: noindex, a machine-readable marker and a visible notice", () => {
  for (const page of buildSite(upstream, { access: "private" })) {
    assert.match(page.html, /<meta name="robots" content="noindex, nofollow"><meta name="tutors-access" content="private">/, page.path);
    assert.match(page.html, /<p class="private" role="note">Private course/, page.path);
  }
  for (const page of buildSite(upstream, { access: "public" })) assert.doesNotMatch(page.html, /tutors-access|noindex|class="private"/, page.path);
});
