/**
 * What the command does, as a function a test can call. main.ts runs it.
 * The composition root. It is the only code that touches node:fs or process: it makes the adapter,
 * hands it to gen, hands gen's Course to lite, and writes lite's pages, the tutors.json and the
 * version.json beside them. Mirrors upstream packages/jsr/tutors-lite/src/run.ts.
 *
 *   node apps/cli/src/main.ts --version            prints the build identity
 *   node apps/cli/src/main.ts <courseFolder> <out>  builds the site
 */
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { buildCourse } from "@ladder/gen";
import { buildSite, describeIdentity, versionFile } from "@ladder/lite";
import type { BuildIdentity } from "@ladder/lite";
import { readBuildIdentity } from "./build-identity.ts";
import { NodeFileSystem } from "./node-file-system.ts";

export async function run(args: string[], identity: BuildIdentity = readBuildIdentity()): Promise<number> {
  if (args[0] === "--version" || args[0] === "-v") {
    process.stdout.write(`${describeIdentity(identity)}\n`);
    return 0;
  }
  const [courseArg, outArg] = args;
  if (!courseArg || !outArg) {
    process.stderr.write("usage: node apps/cli/src/main.ts <courseFolder> <outDir>\n       node apps/cli/src/main.ts --version\n");
    return 2;
  }
  const courseFolder = resolve(courseArg);
  const fs = new NodeFileSystem(courseFolder);
  if (!(await fs.exists("course.md"))) {
    process.stderr.write(`${courseFolder} has no course.md, so it is not a Tutors course.\n`);
    return 1;
  }
  const course = await buildCourse(fs, basename(courseFolder), { warn: (message) => process.stderr.write(`${message}\n`) });
  const pages = [...buildSite(course), versionFile(identity)];
  const outDir = resolve(outArg);
  for (const { path, html } of pages) {
    await mkdir(dirname(join(outDir, path)), { recursive: true });
    await writeFile(join(outDir, path), html);
  }
  await writeFile(join(outDir, "tutors.json"), `${JSON.stringify(course, null, 2)}\n`);
  process.stdout.write(`wrote ${pages.length - 1} pages, tutors.json and version.json to ${outDir}\n`);
  return 0;
}
