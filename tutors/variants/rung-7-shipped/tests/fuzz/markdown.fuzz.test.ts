/**
 * Properties of the Markdown renderer (R-008): it never throws, and whatever it is given, every tag it
 * writes is one it means to write, with every attribute quoted and closed.
 * Replay a failure: FUZZ_SEED=<seed> FUZZ_PATH=<path> pnpm test:fuzz
 */
import fc from "fast-check";
import { expect, test } from "vitest";
import { renderMarkdown } from "@ladder/lite";
import { fuzzParameters } from "../support/fuzz.ts";

/** Lines made of Markdown's own punctuation, HTML and attack text, so the generator explores the parser. */
const piece = fc.constantFrom("# ", "## ", "- ", "1. ", "```", "~~~", "**", "*", "_", "`", "[", "](", ")", "![", "<", ">", '"', "'", "&", " ", "\n", "\n\n", "---", "text", "javascript:alert(1)", "<script>", "onerror=", "\r\n");
const markdown = fc.oneof(fc.array(piece, { maxLength: 40 }).map((parts) => parts.join("")), fc.string({ unit: "grapheme" }));

// span is the renderer's own too: since rung 6 a refused address is shown as <span class="blocked" ...>text</span> (R-022).
// Rung 6's list lacked it, so the property failed now and then, whenever fast-check wrote "![](javascript:alert(1)":
// replay with FUZZ_SEED=1136199168 FUZZ_PATH="85:1:8:7". A flaky gate is a defect in the standard work, found while timing it.
const TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "p", "ul", "ol", "li", "pre", "code", "a", "img", "strong", "em", "span"]);
/** A tag the renderer writes: a known name, then only name="value" attributes whose value holds no quote. */
const WELL_FORMED = /^<\/?([a-z][a-z0-9]*)((?:\s+[a-z-]+="[^"<>]*")*)\s*>$/;

const writesOnlyItsOwnTags = (render: (markdown: string) => string) =>
  fc.property(markdown, (text) => {
    const out = render(text);
    for (const tag of out.match(/<[^>]*>?/g) ?? []) {
      const parsed = tag.match(WELL_FORMED);
      expect(parsed, `malformed tag ${tag} from ${JSON.stringify(text)}`).not.toBeNull();
      expect(TAGS.has(parsed![1]!), `unexpected tag ${tag} from ${JSON.stringify(text)}`).toBe(true);
    }
  });

test("R-008: renderMarkdown never throws, and writes only its own well-formed tags", () => {
  fc.assert(writesOnlyItsOwnTags((text) => renderMarkdown(text).value), fuzzParameters(200));
});

test("the tag property can fail: it catches a renderer that passes HTML through", () => {
  const passThrough = (text: string) => `<p>${text}</p>`;
  expect(fc.check(writesOnlyItsOwnTags(passThrough), fuzzParameters()).failed).toBe(true);
});
