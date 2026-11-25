/**
 * safeUrl, one decision at a time (R-022). The corpus (xss-corpus.test.ts) and the properties
 * (tests/fuzz/safe-url.fuzz.test.ts) attack it; these rows say what each line of it is for, so a mutant in
 * any of them is killed by a row a person can read.
 */
import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { safeUrl } from "@ladder/lite";

describe("safeUrl", () => {
  const KEPT: [url: string, why: string][] = [
    ["https://tutors.dev/a?b=c#d", "https"],
    ["http://localhost:5173/", "http"],
    ["HTTPS://TUTORS.DEV", "schemes are case-blind"],
    ["mailto:hello@tutors.dev", "mailto, for a link"],
    ["../topic-02/index.html#top", "a relative path"],
    ["img/cat.png", "a relative path with no dot"],
    ["#top", "a fragment"],
    ["?page=2", "a query"],
    ["", "nothing at all"],
    ["/lab/course/topic/lab", "a route"],
    ["a/b:c", "a colon after the first slash is part of the path"],
    ["a?b:c", "a colon after the query starts"],
    ["a#b:c", "a colon in the fragment"],
    ["//tutors.dev/x", "a scheme-relative address keeps the page's scheme"],
  ];
  for (const [url, why] of KEPT) test(`keeps ${JSON.stringify(url)}: ${why}`, () => assert.equal(safeUrl(url, "link"), url));

  const REFUSED: [url: string, why: string][] = [
    ["javascript:alert(1)", "script"],
    ["JAVASCRIPT:alert(1)", "case"],
    ["java\tscript:alert(1)", "a tab inside the scheme"],
    ["java\nscript:alert(1)", "a newline"],
    [" javascript:alert(1)", "a leading space"],
    ["\u0001javascript:alert(1)", "a leading control character"],
    ["java\u007fscript:alert(1)", "DEL"],
    ["java\u0085script:alert(1)", "a C1 control"],
    ["vbscript:msgbox(1)", "another script scheme"],
    ["data:text/html,<script>alert(1)</script>", "a page in an address"],
    ["file:///etc/passwd", "the reader's own disk"],
    ["x-custom+scheme.1:payload", "an unknown scheme with every legal character"],
    ["​javascript:alert(1)", "a zero-width space: not a scheme, and a colon before any slash"],
    ["1javascript:alert(1)", "not a scheme (starts with a digit), and still a colon before any slash"],
    ["a:b/c", "a one-letter scheme"],
    ["1x:y/z", "not a scheme, but a colon before the first slash"],
    ["\u200bx:y?z#w", "the same, before a query"],
    ["weird:", "a scheme and nothing else"],
  ];
  for (const [url, why] of REFUSED) test(`refuses ${JSON.stringify(url)}: ${why}`, () => assert.equal(safeUrl(url, "link"), null));

  test("an image loads over http or https only; a link may also open mail", () => {
    assert.equal(safeUrl("https://tutors.dev/cat.png", "image"), "https://tutors.dev/cat.png");
    assert.equal(safeUrl("http://tutors.dev/cat.png", "image"), "http://tutors.dev/cat.png");
    assert.equal(safeUrl("cat.png", "image"), "cat.png");
    assert.equal(safeUrl("mailto:a@b.c", "image"), null);
    assert.equal(safeUrl("data:image/png;base64,AAAA", "image"), null);
  });

  test("a kept address is returned exactly as it came, never rewritten", () => {
    assert.equal(safeUrl(" https://tutors.dev ", "link"), " https://tutors.dev ");
  });
});
