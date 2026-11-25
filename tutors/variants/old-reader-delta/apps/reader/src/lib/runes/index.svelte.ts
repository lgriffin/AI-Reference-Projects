/**
 * Shared state as Svelte 5 runes. Mirrors upstream packages/svelte/runes/src/index.svelte.ts: each value is
 * a $state behind a `.value` getter and setter, so any component can read it and re-renders when it changes.
 * Upstream creates each one lazily to keep server rendering safe; the reader renders only in the browser.
 */
import type { Lo } from "@ladder/model";
import type { CourseTree } from "../course/lo-tree.ts";

export const rune = <T>(initialValue: T) => {
  let value = $state(initialValue);
  return {
    get value() {
      return value;
    },
    set value(next: T) {
      value = next;
    },
  };
};

/** The course on screen. A load function sets it; the shell and the breadcrumbs read it. */
export const currentCourse = rune<CourseTree | null>(null);

/** The learning object on screen. */
export const currentLo = rune<Lo | null>(null);
