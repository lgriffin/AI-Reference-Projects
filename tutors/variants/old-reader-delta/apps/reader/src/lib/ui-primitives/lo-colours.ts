/**
 * A colour for each kind of learning object. Mirrors upstream loTypeColour in
 * packages/svelte/themes/src/styles/lo-colours.ts. A Record over every kind: add a kind to @ladder/model and
 * this stops compiling until it has a colour (an Unrepresentable Mistake).
 */
import type { LoType } from "@ladder/model";

export const loTypeColour: Record<LoType, string> = {
  course: "#1d4ed8",
  topic: "#0f766e",
  unit: "#4b5563",
  side: "#4b5563",
  talk: "#b45309",
  note: "#7c3aed",
  lab: "#be123c",
  web: "#0369a1",
  archive: "#57534e",
};
