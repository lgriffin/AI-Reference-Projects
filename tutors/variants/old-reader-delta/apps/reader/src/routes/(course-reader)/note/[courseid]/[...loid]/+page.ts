import { readCourse } from "#lib/course/course-service.ts";
import { findLo } from "#lib/course/lo-tree.ts";
import { currentCourse, currentLo } from "#lib/runes/index.svelte.ts";
import { found, notFound } from "../../../found.ts";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params, url, fetch }) => {
  const tree = found(await readCourse(params.courseid, fetch), `the course "${params.courseid}"`);
  const lo = findLo(tree, url.pathname);
  if (lo?.type !== "note") notFound(`a note at ${url.pathname}`);
  currentCourse.value = tree;
  currentLo.value = lo;
  return { lo };
};
