/**
 * The XSS corpus: hostile course content, in the style of the OWASP XSS Filter Evasion Cheat Sheet, run
 * through everything lite renders. Two kinds of test:
 *
 * - table-driven: named payloads, each with the reason it is dangerous;
 * - property-based: tests/fuzz/safe-url.fuzz.test.ts, where fast-check generates the URLs.
 *
 * The oracle (tests/support/xss-oracle.ts) is the browser's own algorithm, not lite's.
 * R-008 (escaping) and R-022 (addresses) state the rules; this corpus is their adversary, and what Stryker runs.
 */
import { describe, test } from "vitest";
import assert from "node:assert/strict";
import type { Course } from "@ladder/model";
import { buildSite, renderMarkdown, safeUrl } from "@ladder/lite";
import { assertSafe } from "../../support/xss-oracle.ts";

/** URLs a course may put in a link or image, with why each is dangerous. */
const HOSTILE_URLS: [url: string, why: string][] = [
  ["javascript:alert(1)", "the classic: runs on click"],
  ["JaVaScRiPt:alert(1)", "schemes are case-insensitive"],
  ["java\tscript:alert(1)", "browsers delete tabs inside a URL"],
  ["java\nscript:alert(1)", "and newlines"],
  ["\u0001javascript:alert(1)", "and strip leading control characters"],
  ["javascript://%0Aalert(1)", "a comment then a newline: valid script"],
  ["vbscript:msgbox(1)", "old Internet Explorer"],
  ["data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==", "a whole page of script"],
  ["data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+", "an SVG with an onload handler"],
  ["&#106;avascript:alert(1)", "an HTML entity for the j"],
  ["&#x6A;avascript&#58;alert(1)", "hex and decimal entities"],
  ["javascript&colon;alert(1)", "a named entity for the colon"],
  ["​javascript:alert(1)", "a zero-width space before the scheme"],
  ['x"onmouseover="alert(1)', "breaks out of the attribute"],
  ["x'onerror='alert(1)", "with single quotes"],
];

describe("XSS corpus: links and images", () => {
  for (const [url, why] of HOSTILE_URLS) {
    test(`link and image: ${JSON.stringify(url)}`, () => {
      assertSafe(renderMarkdown(`[click me](${url})`).value, url, why);
      assertSafe(renderMarkdown(`![a picture](${url})`).value, url, why);
    });
  }

  test("safe addresses keep working: https, http, mailto for links, relative paths and fragments", () => {
    assert.equal(renderMarkdown("[a](https://tutors.dev)").value, '<p><a href="https://tutors.dev">a</a></p>');
    assert.equal(renderMarkdown("[a](mailto:hello@tutors.dev)").value, '<p><a href="mailto:hello@tutors.dev">a</a></p>');
    assert.equal(renderMarkdown("[a](../topic-02/index.html#top)").value, '<p><a href="../topic-02/index.html#top">a</a></p>');
    assert.equal(renderMarkdown("![b](img/cat.png)").value, '<p><img src="img/cat.png" alt="b"></p>');
  });

  test("a refused address is shown as its text, with no link", () => {
    assert.equal(renderMarkdown("[click **me**](javascript:alert(1))").value, '<p><span class="blocked" title="unsafe address removed">click <strong>me</strong></span>)</p>');
    assert.equal(renderMarkdown("![a cat](data:image/png;base64,AAAA)").value, '<p><span class="blocked" title="unsafe address removed">a cat</span></p>');
    assert.equal(safeUrl("mailto:a@b.c", "image"), null, "an image never loads from mailto:");
  });
});

/** Text a course may contain anywhere: titles, summaries, paragraphs, headings, list items. */
const HOSTILE_TEXT: [text: string, why: string][] = [
  ["<script>alert(1)</script>", "a script element"],
  ["<img src=x onerror=alert(1)>", "an event handler"],
  ["<svg/onload=alert(1)>", "an SVG with a handler and no space"],
  ['<iframe src="javascript:alert(1)"></iframe>', "a frame running script"],
  ['<a href="javascript:alert(1)">raw html link</a>', "raw HTML link"],
  ["<body onload=alert(1)>", "a body handler"],
  ['<meta http-equiv="refresh" content="0;url=javascript:alert(1)">', "a refresh to script"],
  ["<style>@import 'javascript:alert(1)'</style>", "a style element"],
  ['"><script>alert(1)</script>', "breaks out of an attribute first"],
  ["</title><script>alert(1)</script>", "breaks out of the title"],
  ["<<script>alert(1);//<</script>", "nested angle brackets"],
];

describe("XSS corpus: text", () => {
  for (const [text, why] of HOSTILE_TEXT) {
    test(`text: ${JSON.stringify(text)}`, () => {
      for (const markdown of [text, `# ${text}`, `- ${text}`, `**${text}**`, `[${text}](https://a.dev)`, "```\n" + text + "\n```"]) {
        assertSafe(renderMarkdown(markdown).value, text, why);
      }
    });
  }

  test("every corpus entry, in every field of every kind of learning object, leaves every page safe", () => {
    for (const [evil] of [...HOSTILE_TEXT, ...HOSTILE_URLS]) {
      const lo = { title: evil, summary: evil, contentMd: `# ${evil}\n\n${evil}\n\n[x](${evil})`, route: "" };
      const course: Course = {
        ...lo, type: "course", id: "c", route: "/",
        los: [{
          ...lo, type: "topic", id: "t",
          los: [
            { ...lo, type: "talk", id: "k" },
            { ...lo, type: "note", id: "n" },
            { ...lo, type: "web", id: "w", route: evil },
            { ...lo, type: "archive", id: "a", archiveFile: evil },
            { ...lo, type: "lab", id: "l", los: [{ type: "step", id: "s", shortTitle: "s", title: evil, contentMd: lo.contentMd, route: "" }] },
          ],
        }],
      };
      for (const access of ["public", "private"] as const) {
        for (const page of buildSite(course, { access })) assertSafe(page.html, evil, `in ${page.path}`);
      }
    }
  });
});
