/**
 * What the command does, as a function a test can call. main.ts runs it.
 * The composition root. It is the only code that touches node:fs or process: it makes the adapters,
 * hands the file system to gen, asks the policy who the site is for, hands gen's Course to lite, and
 * writes lite's pages and the tutors.json beside them.
 * Mirrors upstream packages/jsr/tutors-lite/src/run.ts.
 *
 * Rung 6: a path that leaves the course stops the build; a private course (auth: 1) is built only with
 * --private, because a static site has no sign-in and so every reader of it is anonymous.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { buildCourse, PathEscapeError } from "@ladder/gen";
import { AnonymousSession } from "@ladder/identity";
import { buildSite } from "@ladder/lite";
import { accessOf, canView } from "@ladder/rbac";
import { NodeFileSystem } from "./node-file-system.ts";

const USAGE = "usage: node apps/cli/src/main.ts <courseFolder> <outDir> [--private]\n";

export async function run(args: string[]): Promise<number> {
  const flags = args.filter((arg) => arg.startsWith("--"));
  const [courseArg, outArg, ...extra] = args.filter((arg) => !arg.startsWith("--"));
  const unknown = flags.filter((flag) => flag !== "--private");
  if (!courseArg || !outArg || extra.length > 0 || unknown.length > 0) {
    process.stderr.write(USAGE);
    return 2;
  }
  const courseFolder = resolve(courseArg);
  const fs = new NodeFileSystem(courseFolder);
  try {
    if (!(await fs.exists("course.md"))) {
      process.stderr.write(`${courseFolder} has no course.md, so it is not a Tutors course.\n`);
      return 1;
    }
    const course = await buildCourse(fs, basename(courseFolder), { warn: (message) => process.stderr.write(`warning: ${message}\n`) });
    // Whoever holds the link to a static page reads it signed out, so the policy is asked about an anonymous reader.
    const decision = canView(await new AnonymousSession().getActor(), accessOf(course));
    if (!decision.allowed && !flags.includes("--private")) {
      process.stderr.write(
        `${courseFolder} is a private course (properties.yaml says auth: ${String(course.properties?.auth)}), so the reader shows it only to signed-in, enrolled readers ` +
          `(${decision.reason}). A static site has no sign-in: anyone with its link could read it. Nothing was written. ` +
          "To build it for a host that adds its own access control, run again with --private; every page is then marked private and noindex.\n",
      );
      return 1;
    }
    const pages = buildSite(course, { access: decision.allowed ? "public" : "private" });
    const outDir = resolve(outArg);
    for (const { path, html } of pages) {
      await mkdir(dirname(join(outDir, path)), { recursive: true });
      await writeFile(join(outDir, path), html);
    }
    await writeFile(join(outDir, "tutors.json"), `${JSON.stringify(course, null, 2)}\n`);
    process.stdout.write(`wrote ${pages.length} pages${decision.allowed ? "" : ", marked private,"} and tutors.json to ${outDir}\n`);
    return 0;
  } catch (error) {
    if (!(error instanceof PathEscapeError)) throw error;
    process.stderr.write(`${error.message} Nothing was written. Replace the link or path with a file inside ${courseFolder}.\n`);
    return 1;
  }
}
