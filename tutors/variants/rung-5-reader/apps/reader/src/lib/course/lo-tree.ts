/**
 * A tutors.json becomes a tree the reader can navigate: routes with the course id in them, an index from
 * route to learning object, and each object's parent. Mirrors upstream decorateCourseTree and
 * injectCourseUrl in packages/svelte/course/src/course/services/lo-tree.ts, cut down to what four pages need.
 * Plain TypeScript, no Svelte and no SvelteKit, so Vitest runs it without a browser and Stryker can mutate it
 * (tests/unit/reader/lo-tree.test.ts). Specified in REQUIREMENTS.md: R-017 (pages and routes) and R-021 (breadcrumbs).
 */
import type { Composite, Course, Lo, Unit, Side } from "@ladder/model";

/** The kinds the reader shows on a page of their own. A unit or a side is a box on its topic's page. */
export const PAGE_KINDS = ["course", "topic", "talk", "note", "lab"] as const;
export type PageKind = (typeof PAGE_KINDS)[number];
export type PageLo = Extract<Lo, { type: PageKind }>;

export type CourseTree = {
  courseId: string;
  course: Course;
  /** Every page's route to its learning object: upstream's course.loIndex. */
  loIndex: Map<string, PageLo>;
  /** Every learning object to the composite that holds it, for breadcrumbs. */
  parents: Map<Lo, Composite>;
};

const isPage = (lo: Lo): lo is PageLo => (PAGE_KINDS as readonly string[]).includes(lo.type);
const isComposite = (lo: Lo): lo is Composite => ["course", "topic", "unit", "side"].includes(lo.type);

/**
 * Decorates a copy of the course: `{{COURSEURL}}` in every route becomes the course id, as upstream's
 * injectCourseUrl does, and the course itself lives at /course/<id>. The fetched JSON is left as it came.
 */
export function decorateCourseTree(raw: Course, courseId: string): CourseTree {
  const course = structuredClone(raw);
  const tree: CourseTree = { courseId, course, loIndex: new Map(), parents: new Map() };
  const visit = (lo: Lo, parent?: Composite) => {
    lo.route = lo.route.replace("{{COURSEURL}}", courseId);
    if (parent) tree.parents.set(lo, parent);
    if (isPage(lo)) tree.loIndex.set(lo.route, lo);
    if (lo.type === "lab") for (const step of lo.los) step.route = step.route.replace("{{COURSEURL}}", courseId);
    if (isComposite(lo)) for (const child of lo.los) visit(child, lo);
  };
  course.route = `/course/${courseId}`;
  visit(course); // in pre-order, so loIndex holds the pages in the order the course reads
  return tree;
}

/** The learning object a page shows, by its URL path. Upstream: courseService.readLo and course.loIndex. */
export function findLo(tree: CourseTree, path: string): PageLo | undefined {
  return tree.loIndex.get(decodeURI(path).replace(/\/$/, ""));
}

/** Course, topic, ..., lo: the pages above this one. Units and sides have no page, so they are skipped. */
export function breadCrumbs(tree: CourseTree, lo: Lo): PageLo[] {
  const crumbs: PageLo[] = [];
  for (let at: Lo | undefined = lo; at; at = tree.parents.get(at)) if (isPage(at)) crumbs.unshift(at);
  return crumbs;
}

/** A composite's children sorted into place, as upstream's composite.units: boxes, side boxes and loose cards. */
export function arrange(composite: Composite): { units: Unit[]; sides: Side[]; standardLos: Lo[] } {
  return {
    units: composite.los.filter((lo): lo is Unit => lo.type === "unit"),
    sides: composite.los.filter((lo): lo is Side => lo.type === "side"),
    standardLos: composite.los.filter((lo) => lo.type !== "unit" && lo.type !== "side"),
  };
}

/**
 * Where a card for this learning object links. A web link leaves the reader; an archive is a file this rung
 * does not publish (only tutors.json is copied), so its card has no link rather than a broken one.
 */
export function cardRoute(lo: Lo): string | undefined {
  return lo.type === "archive" ? undefined : lo.route;
}
