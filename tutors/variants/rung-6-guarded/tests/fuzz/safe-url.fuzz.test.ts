/**
 * Properties of safeUrl (R-022): for every address fast-check can build, not just the corpus a person
 * thought of (tests/unit/lite/xss-corpus.test.ts). The generator builds addresses the way an attacker
 * does: a scheme in random case with junk between its letters, a colon in one of its disguises, a payload.
 * The oracle is the browser's own URL parser (tests/support/xss-oracle.ts).
 * Replay a failure: FUZZ_SEED=<seed> FUZZ_PATH=<path> pnpm test:fuzz
 */
import fc from "fast-check";
import { expect, test } from "vitest";
import { renderMarkdown, safeUrl } from "@ladder/lite";
import type { UrlUse } from "@ladder/lite";
import { fuzzParameters } from "../support/fuzz.ts";
import { browserProtocol, dangers } from "../support/xss-oracle.ts";

const SCHEMES = ["javascript", "vbscript", "data", "file", "blob", "https", "http", "mailto", "jar", "livescript"];
const JUNK = ["", "", "\t", "\n", "\r", "\u0000", "\u0001", "\u001f", "\u007f", "​", " ", "%09", "&#9;", "&Tab;"];
const COLONS = [":", ":", ":", "&#58;", "&#x3a;", "&colon;", "%3a"];
const PAYLOADS = ["alert(1)", "//%0aalert(1)", "text/html,<script>alert(1)</script>", "//tutors.dev/x", "a@b.c"];

/** One letter of a scheme: upper or lower case, sometimes followed by a character browsers delete. */
const letter = (char: string) => fc.tuple(fc.boolean(), fc.oneof({ weight: 6, arbitrary: fc.constant("") }, { weight: 1, arbitrary: fc.constantFrom(...JUNK) })).map(([upper, junk]) => (upper ? char.toUpperCase() : char) + junk);

/** An address built to slip past a filter. */
const hostileUrl = fc
  .constantFrom(...SCHEMES)
  .chain((scheme) => fc.tuple(fc.constantFrom(...JUNK), fc.tuple(...[...scheme].map(letter)), fc.constantFrom(...COLONS), fc.constantFrom(...PAYLOADS)))
  .map(([lead, scheme, colon, payload]) => lead + scheme.join("") + colon + payload);

/** Hostile addresses, mixed with any string at all. */
const anyUrl = fc.oneof({ weight: 4, arbitrary: hostileUrl }, { weight: 1, arbitrary: fc.string({ unit: "grapheme" }) });

const ALLOWED: Record<UrlUse, string[]> = { link: ["http:", "https:", "mailto:"], image: ["http:", "https:"] };

/** The property, over any sanitiser, so the negative fixture can run it on a broken one. */
const keepsOnlySafeSchemes = (sanitise: typeof safeUrl) =>
  fc.property(anyUrl, fc.constantFrom<UrlUse>("link", "image"), (url, use) => {
    const kept = sanitise(url, use);
    if (kept === null) return;
    expect(kept, "safeUrl keeps an address unchanged or refuses it").toBe(url);
    const protocol = browserProtocol(kept);
    // null: the browser cannot parse it at all, so it opens nothing.
    if (protocol !== null) expect(ALLOWED[use], `${JSON.stringify(url)} as ${use} opens as ${protocol}`).toContain(protocol);
  });

test("R-022: whatever safeUrl keeps opens, in a browser, only as http, https or mailto (images: http or https)", () => {
  fc.assert(keepsOnlySafeSchemes(safeUrl), fuzzParameters(1000));
});

test("R-022: safeUrl is idempotent", () => {
  fc.assert(
    fc.property(anyUrl, (url) => {
      const kept = safeUrl(url, "link");
      if (kept !== null) expect(safeUrl(kept, "link")).toBe(kept);
    }),
    fuzzParameters(500),
  );
});

test("R-022: rendered as a Markdown link and image, no generated address makes the HTML unsafe", () => {
  fc.assert(
    fc.property(hostileUrl, (url) => {
      expect(dangers(renderMarkdown(`[x](${url}) ![y](${url})`).value), JSON.stringify(url)).toEqual([]);
    }),
    fuzzParameters(500),
  );
});

test("the address property can fail: it finds the counterexample for a block-list that forgets case and control characters", () => {
  const blockList: typeof safeUrl = (url) => (/^(javascript|vbscript|data):/.test(url) ? null : url);
  expect(fc.check(keepsOnlySafeSchemes(blockList), fuzzParameters(1000)).failed).toBe(true);
});
