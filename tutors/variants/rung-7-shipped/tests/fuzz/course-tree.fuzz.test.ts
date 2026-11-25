/**
 * Properties of the whole pipeline over random course folders (R-003, R-004, R-008, R-009): the generator
 * never throws on a course with course.md, orders every composite, writes every lab step; the site writes
 * one page per readable thing and never lets course text become a tag.
 * Replay a failure: FUZZ_SEED=<seed> FUZZ_PATH=<path> pnpm test:fuzz
 */
import fc from "fast-check";
import { expect, test } from "vitest";
import { buildCourse, MemoryFileSystem, preOrder } from "@ladder/gen";
import { buildSite } from "@ladder/lite";
import type { SitePage } from "@ladder/lite";
import type { Course, Lo } from "@ladder/model";
import { courseTree } from "../support/arbitraries/course-tree.ts";
import type { CourseTree } from "../support/arbitraries/course-tree.ts";
import { fuzzParameters } from "../support/fuzz.ts";

const all = (lo: Lo): Lo[] => [lo, ...("los" in lo && lo.type !== "lab" ? lo.los.flatMap(all) : [])];

test("R-003, R-004: every composite is in preOrder, and every lab has its steps in file-name order", async () => {
  await fc.assert(
    fc.asyncProperty(courseTree, async ({ files, labs }) => {
      const course = await buildCourse(new MemoryFileSystem(files), "c");
      for (const lo of all(course)) {
        if (lo.type === "lab") {
          const folder = lo.route.replace("/lab/{{COURSEURL}}/", "");
          expect(lo.los.map((step) => step.id)).toEqual(labs[folder]);
        } else if ("los" in lo) {
          const order = lo.los.map((child) => preOrder[child.type]);
          expect(order).toEqual([...order].sort((a, b) => a - b));
        }
      }
    }),
    fuzzParameters(50),
  );
});

const siteProperty = (build: (course: Course) => SitePage[]) =>
  fc.asyncProperty(courseTree, async ({ files, pages }: CourseTree) => {
    const site = build(await buildCourse(new MemoryFileSystem(files), "c"));
    expect(site).toHaveLength(pages);
    expect(new Set(site.map((page) => page.path)).size, "no two pages share a path").toBe(pages);
    for (const page of site) expect(page.html, page.path).not.toMatch(/<script|" onclick=/);
  });

test("R-008, R-009: the site writes one page per course, topic, talk, note and lab step, and no course text becomes a tag", async () => {
  await fc.assert(siteProperty((course) => buildSite(course, { access: "public" })), fuzzParameters(50));
});

test("the page property can fail: it catches a site that writes only the first page of each lab", async () => {
  const firstStepOnly = (course: Course) => buildSite(course, { access: "public" }).filter((page) => !page.path.includes("/book-") || page.path.endsWith("/index.html"));
  const result = await fc.check(siteProperty(firstStepOnly), fuzzParameters(50));
  expect(result.failed).toBe(true);
  expect(String(result.errorInstance)).toMatch(/expected .* to have a length of/);
});
