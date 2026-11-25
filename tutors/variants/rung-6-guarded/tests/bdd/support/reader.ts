/**
 * A stand-in host for the reader's scenarios, and the page loads the routes run. The reader is handed
 * SvelteKit's fetch by each load function; here it is handed one that records every address it is asked
 * for, so a scenario can say what the reader fetched. Mirrors upstream's reader fixtures, which serve a
 * published tutors.json to the reader (tests/fixtures/static-reader).
 */
import { readFileSync } from "node:fs";
import { requestLab, requestLo } from "../../../apps/reader/src/lib/course/course-service.ts";
import type { PageRequest } from "../../../apps/reader/src/lib/course/course-service.ts";
import { ORACLE } from "../../support/paths.ts";

export type Answer = { ok: boolean; json(): Promise<unknown> };
export type Host = { fetch: (url: string) => Promise<Answer>; asked: string[] };

/** Upstream's tutors.json for the shared fixture, as a fresh object each time. */
export const oracle = () => JSON.parse(readFileSync(ORACLE, "utf8"));

/** A host that answers every address the same way, and remembers each address it was asked for. */
export function host(answer: (url: string) => Answer): Host {
  const asked: string[] = [];
  return { asked, fetch: async (url) => (asked.push(url), answer(url)) };
}

/** A host that serves the shared fixture's tutors.json as the course `courseId`, and nothing else. */
export const servingOracle = (courseId: string) =>
  host((url) => (url === `/courses/${courseId}/tutors.json` ? { ok: true, json: async () => oracle() } : { ok: false, json: async () => undefined }));

/**
 * What the route for this path loads: SvelteKit picks the route by the path's first segment and passes
 * the second as params.courseid; each route's +page.ts then calls one of these.
 */
export async function openPage(path: string, fetch: Host["fetch"]): Promise<PageRequest<unknown>> {
  const [, kind, courseId = ""] = path.split("/");
  switch (kind) {
    case "course":
    case "topic":
    case "talk":
    case "note":
      return requestLo(kind, courseId, path, fetch);
    case "lab":
      return requestLab(courseId, path, fetch);
    default:
      throw new Error(`the reader has no route for ${path}`);
  }
}
