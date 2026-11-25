/**
 * Properties of folderKind (R-001): the longest known prefix wins, whatever follows it.
 * Replay a failure: FUZZ_SEED=<seed> FUZZ_PATH=<path> pnpm test:fuzz
 */
import fc from "fast-check";
import { expect, test } from "vitest";
import { folderKind, folderKinds } from "@ladder/gen";
import type { LoType } from "@ladder/model";
import { fuzzParameters } from "../support/fuzz.ts";

const prefixes = folderKinds.map(([prefix]) => prefix);
const name = fc.oneof(
  fc.tuple(fc.constantFrom(...prefixes), fc.string({ maxLength: 12 })).map(([prefix, rest]) => prefix + rest),
  fc.string({ maxLength: 12 }),
);

const longestPrefixWins = (kindOf: (name: string) => LoType | null | undefined) =>
  fc.property(name, (folder) => {
    const matching = folderKinds.filter(([prefix]) => folder.startsWith(prefix));
    const result = kindOf(folder);
    if (matching.length === 0) {
      expect(result, `${folder} starts with no kind`).toBeUndefined();
      return;
    }
    const longest = Math.max(...matching.map(([prefix]) => prefix.length));
    const winners = matching.filter(([prefix]) => prefix.length === longest).map(([, kind]) => kind);
    expect(winners, `${folder}: the longest matching prefix decides`).toContain(result);
  });

test("R-001: a folder's kind is the kind of the longest known prefix of its name", () => {
  fc.assert(longestPrefixWins(folderKind), fuzzParameters(500));
});

test("the longest-prefix property can fail: it catches the first match winning, so a notebook becomes a note", () => {
  const firstMatch = (folder: string) => folderKinds.find(([prefix]) => folder.startsWith(prefix))?.[1];
  expect(fc.check(longestPrefixWins(firstMatch), fuzzParameters(500)).failed).toBe(true);
});
