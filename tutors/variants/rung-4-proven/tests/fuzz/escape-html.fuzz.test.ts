/**
 * Properties of escaping (R-008): for every string, not just the ones a person thought of.
 * Replay a failure: FUZZ_SEED=<seed> FUZZ_PATH=<path> pnpm test:fuzz
 */
import fc from "fast-check";
import { expect, test } from "vitest";
import { escapeHtml, html } from "@ladder/lite";
import { fuzzParameters } from "../support/fuzz.ts";

/** Strings dense in the characters that matter, mixed with any Unicode at all. */
const nasty = fc.oneof(fc.string({ unit: fc.constantFrom("<", ">", "&", '"', "'", "a", " ", "&amp;", "<script>", "\u0000") }), fc.string({ unit: "grapheme" }));

const decode = (text: string) => text.replace(/&(lt|gt|quot|#39|amp);/g, (_, name: string) => ({ lt: "<", gt: ">", quot: '"', "#39": "'", amp: "&" })[name]!);

/** The property, over any escaping function, so the negative fixture can run it on a broken one. */
const escapesEverything = (escape: (text: string) => string) =>
  fc.property(nasty, (text) => {
    const escaped = escape(text);
    expect(escaped).not.toMatch(/[<>"']/);
    expect(escaped).not.toMatch(/&(?!(lt|gt|quot|#39|amp);)/);
    expect(decode(escaped)).toBe(text);
  });

test("R-008: escapeHtml never emits < > \" or ', every & starts an entity, and nothing is lost", () => {
  fc.assert(escapesEverything(escapeHtml), fuzzParameters());
});

test("R-008: a value interpolated by html`` never adds a tag or leaves its attribute", () => {
  fc.assert(
    fc.property(nasty, (text) => {
      const out = html`<a title="${text}">${text}</a>`.value;
      expect(out.match(/</g)).toHaveLength(2);
      expect(out.match(/"/g)).toHaveLength(2);
    }),
    fuzzParameters(),
  );
});

test("the escaping property can fail: it finds the counterexample for an escape that forgets '", () => {
  const forgetful = (text: string) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  expect(fc.check(escapesEverything(forgetful), fuzzParameters()).failed).toBe(true);
});
