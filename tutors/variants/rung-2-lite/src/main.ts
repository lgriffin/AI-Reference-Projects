/**
 * The command line: node src/main.ts <courseFolder> <outDir>
 * Mirrors upstream packages/jsr/tutors-lite: builds the course, then writes a static website into
 * outDir, with the course's tutors.json beside it.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { buildCourse } from "./course-builder.ts";
import { buildSite } from "./site-builder.ts";

const [courseArg, outArg] = process.argv.slice(2);
if (!courseArg || !outArg) {
  process.stderr.write("usage: node src/main.ts <courseFolder> <outDir>\n");
  process.exit(2);
}
const courseFolder = resolve(courseArg);
if (!existsSync(join(courseFolder, "course.md"))) {
  process.stderr.write(`${courseFolder} has no course.md, so it is not a Tutors course.\n`);
  process.exit(1);
}
const outDir = resolve(outArg);
const course = buildCourse(courseFolder);
const pages = buildSite(course);
for (const { path, html } of pages) {
  mkdirSync(dirname(join(outDir, path)), { recursive: true });
  writeFileSync(join(outDir, path), html);
}
writeFileSync(join(outDir, "tutors.json"), `${JSON.stringify(course, null, 2)}\n`);
process.stdout.write(`wrote ${pages.length} pages and tutors.json to ${outDir}\n`);
