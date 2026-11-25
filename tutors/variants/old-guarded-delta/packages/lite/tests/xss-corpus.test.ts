/**
 * The XSS corpus: hostile course content, in the style of the OWASP XSS Filter Evasion Cheat Sheet, run
 * through everything lite renders. Two kinds of test:
 *
 * - table-driven: named payloads, each with the reason it is dangerous;
 * - property-based: thousands of generated URLs that mix schemes, case, control characters and entities,
 *   from a seeded generator so a failure is reproducible (fast-check arrives in rung 5, so this rung grows its own).
 *
 * The oracle is the browser's own algorithm, not lite's: node's WHATWG URL parser decides what scheme an
 * href really has, after HTML entities are decoded as a browser would decode the attribute.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Course } from "@ladder/model";
import { buildSite, renderMarkdown, safeUrl } from "@ladder/lite";

/** The tags and attributes lite may write. Anything else in its output is markup that came from a course. */
const TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "p", "ul", "ol", "li", "pre", "code", "a", "img", "strong", "em", "span", "section", "article", "main", "nav", "html", "head", "body", "meta", "title", "style", "!doctype"]);
const ATTRIBUTES = new Set(["href", "src", "alt", "class", "title", "lang", "charset", "name", "content", "http-equiv", "role", "html"]);
const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

/** An attribute value as the browser reads it: one pass of entity decoding. */
function decodeAttribute(value: string): string {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", colon: ":", tab: "\t", newline: "\n" };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi, (whole, entity: string) => {
    if (entity[0] === "#") return String.fromCodePoint(entity[1]!.toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10));
    return named[entity.toLowerCase()] ?? whole;
  });
}

/** The scheme a browser would open `url` with, or null when it cannot parse it at all (and so opens nothing). */
function browserProtocol(url: string): string | null {
  try {
    return new URL(url, "https://course.invalid/page/").protocol;
  } catch {
    return null;
  }
}

/** Every reason this HTML could run script: unknown tags, unknown or on* attributes, and URLs whose real scheme is not allowed. */
function dangers(html: string): string[] {
  const found: string[] = [];
  const withoutStyle = html.replace(/<style>[\s\S]*?<\/style>/, "<style></style>");
  for (const [, name, attrs] of withoutStyle.matchAll(/<\/?([!a-z0-9-]+)([^>]*)>/gi)) {
    if (!TAGS.has(name!.toLowerCase())) found.push(`tag <${name}>`);
    for (const [, attr, value = ""] of attrs!.matchAll(/([^\s="']+)(?:="([^"]*)")?/g)) {
      const key = attr!.toLowerCase();
      if (!ATTRIBUTES.has(key)) found.push(`attribute ${attr} on <${name}>`);
      if (key === "href" || key === "src") {
        const protocol = browserProtocol(decodeAttribute(value));
        if (protocol !== null && (!SAFE_PROTOCOLS.has(protocol) || (key === "src" && protocol === "mailto:"))) found.push(`${key}="${value}" opens as ${protocol}`);
      }
    }
  }
  return found;
}

function assertSafe(html: string, payload: string, why: string) {
  const found = dangers(html);
  assert.deepEqual(
    found,
    [],
    `XSS corpus: ${JSON.stringify(payload)} (${why}) reached the page as ${found.join(", ")}.\n${html}\n` +
      "Course text must be escaped (html`` in packages/lite/src/html.ts) and every course URL must pass safeUrl (packages/lite/src/url.ts) before it reaches an href or src.",
  );
}

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

/** mulberry32: a tiny seeded generator, so a failing case can be replayed from its seed. */
function generator(seed: number) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)]!;
  return { next, pick };
}

const SCHEMES = ["javascript", "vbscript", "data", "file", "blob", "https", "http", "mailto", "jar", "livescript"];
const JUNK = ["", "", "\t", "\n", "\r", "\u0000", "\u0001", "\u001f", "\u007f", "​", " ", "%09", "&#9;", "&Tab;"];
const COLONS = [":", ":", ":", "&#58;", "&#x3a;", "&colon;", "%3a"];
const PAYLOADS = ["alert(1)", "//%0aalert(1)", "text/html,<script>alert(1)</script>", "//tutors.dev/x", "a@b.c"];

/** A URL built to slip past a filter: random case, junk between letters, encoded colons. */
function hostileUrl(random: ReturnType<typeof generator>): string {
  const scheme = [...random.pick(SCHEMES)].map((char) => (random.next() < 0.5 ? char.toUpperCase() : char) + (random.next() < 0.15 ? random.pick(JUNK) : "")).join("");
  return random.pick(JUNK) + scheme + random.pick(COLONS) + random.pick(PAYLOADS);
}

describe("XSS properties: 3,000 generated URLs", () => {
  const SEED = 20261125;
  const random = generator(SEED);
  const urls = Array.from({ length: 3000 }, () => hostileUrl(random));

  test("whatever safeUrl keeps opens, in a browser, only as http, https or mailto (images: http or https)", () => {
    for (const [index, url] of urls.entries()) {
      for (const use of ["link", "image"] as const) {
        const kept = safeUrl(url, use);
        if (kept === null) continue;
        const protocol = browserProtocol(kept);
        const allowed = use === "link" ? SAFE_PROTOCOLS : new Set(["http:", "https:"]);
        assert.ok(protocol === null || allowed.has(protocol), `safeUrl kept ${JSON.stringify(url)} as a ${use}, which a browser opens as ${protocol} (seed ${SEED}, case ${index}). Tighten packages/lite/src/url.ts.`);
      }
    }
  });

  test("safeUrl keeps a URL unchanged or refuses it, and is idempotent", () => {
    for (const url of urls) {
      const kept = safeUrl(url, "link");
      assert.ok(kept === null || kept === url);
      if (kept !== null) assert.equal(safeUrl(kept, "link"), kept);
    }
  });

  test("rendered as Markdown links and images, no generated URL makes a page unsafe", () => {
    for (const url of urls) assertSafe(renderMarkdown(`[x](${url}) ![y](${url})`).value, url, `generated, seed ${SEED}`);
  });
});
