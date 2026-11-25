/**
 * What a load function does when the course or the learning object is missing: answer 404 with a message
 * that says which. The course service returns undefined; only a route speaks SvelteKit.
 */
import { error } from "@sveltejs/kit";

export function notFound(what: string): never {
  error(404, `Not found: ${what}`);
}

export function found<T>(value: T | undefined, what: string): T {
  return value === undefined ? notFound(what) : value;
}
