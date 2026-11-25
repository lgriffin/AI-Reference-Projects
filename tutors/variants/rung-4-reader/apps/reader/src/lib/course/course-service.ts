/**
 * The one place the reader reaches the network: it fetches a course's tutors.json once and keeps the tree.
 * Mirrors upstream courseService (readCourse, readLo, readLab) in
 * packages/svelte/course/src/course/services/course.svelte.ts. The caller hands in `fetch`, the one SvelteKit
 * gives each load function, so this file never touches a global and a test can pass its own.
 */
import type { Course } from "@ladder/model";
import { decorateCourseTree, findLo, type CourseTree, type PageLo } from "./lo-tree.ts";
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
