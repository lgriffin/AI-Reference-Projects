import { requestLo } from "#lib/course/course-service.ts";
import { currentCourse, currentLo } from "#lib/runes/index.svelte.ts";
import { found } from "../../found.ts";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params, url, fetch }) => {
  const { tree, found: course } = found(await requestLo("course", params.courseid, url.pathname, fetch));
  currentCourse.value = tree;
  currentLo.value = course;
  return { course };
};
