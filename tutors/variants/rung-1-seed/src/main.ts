/**
 * The command line: node src/main.ts <courseFolder> [outFile]
 * Mirrors upstream packages/jsr/tutors (the `tutors` command), which writes json/tutors.json.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { buildCourse } from "./course-builder.ts";

const [courseArg, outArg] = process.argv.slice(2);
if (!courseArg) {
  process.stderr.write("usage: node src/main.ts <courseFolder> [outFile]\n");
  process.exit(2);
}
const courseFolder = resolve(courseArg);
if (!existsSync(join(courseFolder, "course.md"))) {
  process.stderr.write(`${courseFolder} has no course.md, so it is not a Tutors course.\n`);
  process.exit(1);
}
const outFile = resolve(outArg ?? join(courseFolder, "json", "tutors.json"));
const course = buildCourse(courseFolder);
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(course, null, 2)}\n`);
process.stdout.write(`wrote ${outFile}: ${course.los.length} topics\n`);
