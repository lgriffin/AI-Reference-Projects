import { readCourse, readLab } from "#lib/course/course-service.ts";
import { currentCourse, currentLo } from "#lib/runes/index.svelte.ts";
import { found } from "../../../found.ts";
import type { PageLoad } from "./$types";

// The lab's own route opens its first step; /lab/<course>/<path>/<step> opens that step.
export const load: PageLoad = async ({ params, url, fetch }) => {
  const tree = found(await readCourse(params.courseid, fetch), `the course "${params.courseid}"`);
  const liveLab = found(await readLab(params.courseid, url.pathname, fetch), `a lab step at ${url.pathname}`);
  currentCourse.value = tree;
  currentLo.value = liveLab.lab;
  return { liveLab };
};
