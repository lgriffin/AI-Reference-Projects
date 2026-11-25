/**
 * How gen recognises and orders learning objects. Mirrors upstream `loTypes` and `preOrder` in
 * packages/jsr/model/src/types/type-utils.ts. They live in gen, not model, because model holds types only.
 */
import type { LoType } from "@ladder/model";

/** Display order inside a composite. A Record makes every LoType need an entry (Unrepresentable Mistake). */
export const preOrder: Record<LoType, number> = {
  course: 0,
  unit: 1,
  side: 2,
  topic: 3,
  talk: 4,
  lab: 7,
  note: 8,
  web: 9,
  archive: 11,
};

/**
 * Folder-name prefixes and the kind each names. A folder whose name starts with no prefix is not
 * content. `null` marks a kind upstream builds and this rung does not. "book" is upstream's name for a lab.
 */
export const folderKinds: [prefix: string, kind: LoType | null][] = [
  ["topic", "topic"],
  ["unit", "unit"],
  ["side", "side"],
  ["talk", "talk"],
  ["book", "lab"],
  ["lab", "lab"],
  ["note", "note"],
  ["web", "web"],
  ["archive", "archive"],
  ["notebook", null],
  ["github", null],
  ["tutorial", null],
  ["podcast", null],
  ["whiteboard", null],
  ["panelnote", null],
  ["paneltalk", null],
  ["panelvideo", null],
  ["quiz", null],
];

/** Longest prefix first, so "notebook-1" is a notebook and not a note, as upstream findLastMatchingString does. */
const kindsLongestFirst = [...folderKinds].sort(([a], [b]) => b.length - a.length);

/**
 * The kind a folder's name declares: a LoType, `null` for a kind this rung does not build,
 * or `undefined` when the name starts with no kind at all (the folder is not content).
 */
export function folderKind(name: string): LoType | null | undefined {
  return kindsLongestFirst.find(([prefix]) => name.startsWith(prefix))?.[1];
}
