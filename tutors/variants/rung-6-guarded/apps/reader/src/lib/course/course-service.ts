/**
 * The one place the reader reaches the network: it fetches a course's tutors.json once and keeps the tree.
 * Mirrors upstream courseService (readCourse, readLo, readLab) in
 * packages/svelte/course/src/course/services/course.svelte.ts. The caller hands in `fetch`, the one SvelteKit
 * gives each load function, so this file never touches a global and a test can pass its own.
 *
 * Specified in REQUIREMENTS.md: R-014 (fetch once), R-015 and R-016 (what is not a course), R-018 (a lab
 * opens at its first step) and R-020 (what a 404 says). The scenarios are in tests/bdd/features/reader.
 *
 * Rung 6 (Guarded): before a page of a course is handed out, the policy is asked whether the reader in
 * this session may view it (R-032). The session is a port (@ladder/identity); the static reader has no
 * sign-in, so its session is AnonymousSession and a private course answers with a notice, not its pages.
 * The notice is a courtesy, not a lock: tutors.json is a file on the host, so the host must guard it.
 */
import { AnonymousSession } from "@ladder/identity";
import type { SessionPort } from "@ladder/identity";
import type { Course } from "@ladder/model";
import { accessOf, canView } from "@ladder/rbac";
import type { Refusal } from "@ladder/rbac";
import { decorateCourseTree, findLo, type CourseTree, type PageKind, type PageLo } from "./lo-tree.ts";
import { liveLab, type LiveLab } from "./live-lab.ts";

type Fetch = (url: string) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

/** A course is fetched once per visit to the app and reused by every page after that. */
const courses = new Map<string, CourseTree>();

/**
 * Where a course's tutors.json lives. Upstream turns an id into a Netlify host (determineCourseUrl); this
 * reader serves courses itself, from static/courses/<id>/, which `pnpm course` fills at build time.
 */
export function courseUrl(courseId: string): string | undefined {
  return /^[\w-]+$/.test(courseId) ? `/courses/${courseId}/tutors.json` : undefined;
}

const isCourse = (json: unknown): json is Course =>
  typeof json === "object" && json !== null && (json as Course).type === "course" && Array.isArray((json as Course).los);

export async function readCourse(courseId: string, fetch: Fetch): Promise<CourseTree | undefined> {
  const cached = courses.get(courseId);
  if (cached) return cached;
  const url = courseUrl(courseId);
  const response = url ? await fetch(url) : undefined;
  // A static host answers a missing file with its fallback page, so "ok" alone does not mean a course.
  const json = response?.ok ? await response.json().catch(() => undefined) : undefined;
  if (!isCourse(json)) return undefined;
  const tree = decorateCourseTree(json, courseId);
  courses.set(courseId, tree);
  return tree;
}

/** The learning object at this URL path, in the course named by the path. */
export async function readLo(courseId: string, path: string, fetch: Fetch): Promise<PageLo | undefined> {
  const tree = await readCourse(courseId, fetch);
  return tree && findLo(tree, path);
}

/** The lab at this path, open at the step its last segment names, or at its first step. */
export async function readLab(courseId: string, path: string, fetch: Fetch): Promise<LiveLab | undefined> {
  const tree = await readCourse(courseId, fetch);
  if (!tree) return undefined;
  const lab = findLo(tree, path);
  if (lab?.type === "lab") return liveLab(lab);
  const cut = path.replace(/\/$/, "").lastIndexOf("/");
  const parent = findLo(tree, path.slice(0, cut));
  return parent?.type === "lab" ? liveLab(parent, path.slice(cut + 1).replace(/\/$/, "")) : undefined;
}

/**
 * What a page's load function receives: the course and what the page shows, a message for a 404 that
 * names what is missing, or the notice for a private course this reader may not view. Deciding is plain
 * logic, here; only the route speaks SvelteKit (found.ts).
 */
export type PageRequest<T> = { tree: CourseTree; found: T } | { notFound: string } | { refused: string };

const missingCourse = (courseId: string) => ({ notFound: `Not found: the course "${courseId}"` });

/** The session of a static build: nobody is ever signed in. A host with sign-in hands in its own adapter. */
const STATIC_SESSION: SessionPort = new AnonymousSession();

/** A Record, so a new Refusal in @ladder/rbac does not compile until it has its words here. */
const WHY: Record<Refusal, string> = {
  "sign-in-required": "it is for signed-in readers, and this reader has no sign-in",
  "not-enrolled": "you are not on its enrolment list",
};

/** The notice for a course the policy refuses this session, or undefined when the reader may view it. */
export async function refusal(tree: CourseTree, session: SessionPort): Promise<string | undefined> {
  const decision = canView(await session.getActor(), accessOf(tree.course));
  return decision.allowed ? undefined : `Private course: "${tree.courseId}" is not shown, because ${WHY[decision.reason]}.`;
}

/** The learning object of this kind at this URL path, for the course, topic, talk and note pages. */
export async function requestLo<K extends Exclude<PageKind, "lab">>(kind: K, courseId: string, path: string, fetch: Fetch, session: SessionPort = STATIC_SESSION): Promise<PageRequest<Extract<PageLo, { type: K }>>> {
  const tree = await readCourse(courseId, fetch);
  if (!tree) return missingCourse(courseId);
  const refused = await refusal(tree, session);
  if (refused) return { refused };
  const lo = findLo(tree, path);
  return lo?.type === kind ? { tree, found: lo as Extract<PageLo, { type: K }> } : { notFound: `Not found: a ${kind} at ${path}` };
}

/** The lab at this URL path, open at the step it names or at its first step, for the lab page. */
export async function requestLab(courseId: string, path: string, fetch: Fetch, session: SessionPort = STATIC_SESSION): Promise<PageRequest<LiveLab>> {
  const tree = await readCourse(courseId, fetch);
  if (!tree) return missingCourse(courseId);
  const refused = await refusal(tree, session);
  if (refused) return { refused };
  const live = await readLab(courseId, path, fetch);
  return live ? { tree, found: live } : { notFound: `Not found: a lab step at ${path}` };
}
