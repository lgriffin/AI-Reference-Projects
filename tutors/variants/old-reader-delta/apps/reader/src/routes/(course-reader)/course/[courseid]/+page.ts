import { readCourse } from "#lib/course/course-service.ts";
import { currentCourse, currentLo } from "#lib/runes/index.svelte.ts";
import { found } from "../../found.ts";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params, fetch }) => {
  const tree = found(await readCourse(params.courseid, fetch), `the course "${params.courseid}"`);
  currentCourse.value = tree;
  currentLo.value = tree.course;
  return { course: tree.course };
};
