/**
 * Where a page request becomes SvelteKit: a 404 carrying the message the course service wrote (R-020), or
 * what the page shows. The course service decides; only a route speaks SvelteKit.
 */
import { error } from "@sveltejs/kit";
import type { CourseTree } from "#lib/course/lo-tree.ts";
import type { PageRequest } from "#lib/course/course-service.ts";

export function found<T>(request: PageRequest<T>): { tree: CourseTree; found: T } {
  if ("notFound" in request) error(404, request.notFound);
  return request;
}
