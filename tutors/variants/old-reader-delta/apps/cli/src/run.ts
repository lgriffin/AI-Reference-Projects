/**
 * What the command does, as a function a test can call. main.ts runs it.
 * The composition root. It is the only code that touches node:fs or process: it makes the adapter,
 * hands it to gen, hands gen's Course to lite, and writes lite's pages and the tutors.json beside them.
 * Mirrors upstream packages/jsr/tutors-lite/src/run.ts. `--json-only` writes tutors.json and no pages: the
 * reader (apps/reader) needs only the contract, as upstream's reader needs only a published tutors.json.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { buildCourse } from "@ladder/gen";
import { buildSite } from "@ladder/lite";
import { NodeFileSystem } from "./node-file-system.ts";

export async function run(args: string[]): Promise<number> {
  const jsonOnly = args.includes("--json-only");
  const [courseArg, outArg] = args.filter((arg) => arg !== "--json-only");
  if (!courseArg || !outArg) {
    process.stderr.write("usage: node apps/cli/src/main.ts [--json-only] <courseFolder> <outDir>\n");
    return 2;
  }
  const courseFolder = resolve(courseArg);
  const fs = new NodeFileSystem(courseFolder);
  if (!(await fs.exists("course.md"))) {
    process.stderr.write(`${courseFolder} has no course.md, so it is not a Tutors course.\n`);
    return 1;
  }
  const course = await buildCourse(fs, basename(courseFolder), { warn: (message) => process.stderr.write(`${message}\n`) });
  const pages = jsonOnly ? [] : buildSite(course);
  const outDir = resolve(outArg);
  await mkdir(outDir, { recursive: true });
  for (const { path, html } of pages) {
    await mkdir(dirname(join(outDir, path)), { recursive: true });
    await writeFile(join(outDir, path), html);
  }
  await writeFile(join(outDir, "tutors.json"), `${JSON.stringify(course, null, 2)}\n`);
  process.stdout.write(`wrote ${pages.length} pages and tutors.json to ${outDir}\n`);
  return 0;
}
