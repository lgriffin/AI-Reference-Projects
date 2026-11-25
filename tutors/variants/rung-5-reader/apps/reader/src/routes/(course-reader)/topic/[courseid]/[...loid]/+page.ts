import { requestLo } from "#lib/course/course-service.ts";
import { currentCourse, currentLo } from "#lib/runes/index.svelte.ts";
import { found } from "../../../found.ts";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params, url, fetch }) => {
  const { tree, found: topic } = found(await requestLo("topic", params.courseid, url.pathname, fetch));
  currentCourse.value = tree;
  currentLo.value = topic;
  return { topic };
};
