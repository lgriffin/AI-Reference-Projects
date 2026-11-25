/**
 * Course folder in, Course out, through a FileSystemPort. Mirrors upstream
 * packages/jsr/gen/src/services/course-builder.ts (what each kind holds) and resource-builder.ts
 * (how a folder's kind is found). The same logic as rung 2, made async because the port is.
 */
import type { Archive, Course, Lab, Lo, LoType, Web } from "@ladder/model";
import { joinPath } from "./file-system-port.ts";
import type { FileSystemPort } from "./file-system-port.ts";
import { folderKind, preOrder } from "./lo-kinds.ts";

/** What the caller may hear about while a course is built. The CLI prints it; tests collect it. */
export type BuildOptions = { warn?: (message: string) => void };

/** Folders the generator never reads: hidden ones and its own output. */
const IGNORED = new Set(["json", "html", "node_modules"]);

/** Strips a leading `---` front matter block, as the upstream `front-matter` package does. */
export function stripFrontMatter(text: string): string {
  const match = text.match(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/);
  return match ? text.slice(match[0].length).replace(/^(\s*\r?\n)+/, "") : text;
}

/** Title, summary and body of a markdown text, as upstream getMarkdown reads them. */
export function parseMarkdown(text: string): { title: string; summary: string; contentMd: string } {
  const contentMd = stripFrontMatter(text);
  const [first = "", ...rest] = contentMd.split("\n");
  const title = (first.startsWith("#") ? first.slice(1) : first).trim(); // upstream drops one "#" only
  const summary = rest.join("\n").trim().split("\n")[0]!.trim();
  return { title, summary, contentMd };
}

type Folder = { rel: string; id: string; files: string[]; dirs: string[] };

/** Reads one folder: its visible files and subfolders, sorted by name as upstream does. */
async function readFolder(fs: FileSystemPort, rel: string, id: string): Promise<Folder> {
  const entries = (await fs.list(rel)).filter((entry) => !entry.name.startsWith(".") && !IGNORED.has(entry.name));
  entries.sort((a, b) => (a.name < b.name ? -1 : 1));
  return {
    rel,
    id,
    files: entries.filter((entry) => entry.kind === "file").map((entry) => entry.name),
    dirs: entries.filter((entry) => entry.kind === "dir").map((entry) => entry.name),
  };
}

const withExtension = (folder: Folder, ext: string) => folder.files.filter((file) => file.endsWith(`.${ext}`));

/** The fields every learning object shares, from the folder's first markdown file. */
async function base(fs: FileSystemPort, folder: Folder, kind: LoType, keyFile?: string) {
  const markdown = keyFile ?? withExtension(folder, "md")[0];
  const text = markdown ? parseMarkdown(await fs.readText(joinPath(folder.rel, markdown))) : { title: "", summary: "", contentMd: "" };
  return { ...text, id: folder.id, route: `/${kind}/{{COURSEURL}}/${folder.rel}` };
}

/** The children of a composite: every subfolder that names its kind, in upstream preOrder. */
async function children(fs: FileSystemPort, folder: Folder, options: BuildOptions): Promise<Lo[]> {
  const los: Lo[] = [];
  for (const name of folder.dirs) {
    const kind = folderKind(name);
    if (kind === undefined) continue;
    if (kind === null) {
      options.warn?.(`skipped ${joinPath(folder.rel, name)}: this rung does not build this kind`);
      continue;
    }
    los.push(await buildLo(fs, joinPath(folder.rel, name), kind, options));
  }
  return los.sort((a, b) => preOrder[a.type] - preOrder[b.type]); // stable: equal kinds keep folder order
}

async function buildLab(fs: FileSystemPort, folder: Folder): Promise<Lab> {
  const lab: Lab = { ...(await base(fs, folder, "lab")), type: "lab", los: [] };
  for (const file of withExtension(folder, "md")) {
    const { contentMd } = parseMarkdown(await fs.readText(joinPath(folder.rel, file)));
    const shortTitle = file.slice(file.indexOf(".") + 1, file.lastIndexOf(".")); // 01.Setup.md -> Setup
    const title = contentMd.split("\n")[0]!.replace(/^#+/, "").trim();
    lab.los.push({ type: "step", id: shortTitle, shortTitle, title, contentMd, route: `${lab.route}/${shortTitle}` });
  }
  // Upstream quirk: a lab with img/main.* takes the first step's short title as its own title.
  const images = folder.dirs.includes("img") ? await fs.list(joinPath(folder.rel, "img")) : [];
  if (images.some((entry) => entry.name.startsWith("main.")) && lab.los[0]) lab.title = lab.los[0].shortTitle;
  return lab;
}

/**
 * Builds one learning object from its folder. The switch is exhaustive: add a member to `Lo` in
 * @ladder/model and this function stops compiling until it builds the new kind (Unrepresentable Mistake).
 */
export async function buildLo(fs: FileSystemPort, rel: string, kind: LoType, options: BuildOptions = {}, id = rel.split("/").pop()!): Promise<Lo> {
  const folder = await readFolder(fs, rel, id);
  const parentRoute = `/topic/{{COURSEURL}}/${rel.slice(0, rel.lastIndexOf("/"))}/`;
  switch (kind) {
    case "course":
      return { ...(await base(fs, folder, kind, "course.md")), type: kind, route: "/", los: await children(fs, folder, options) };
    case "topic":
      return { ...(await base(fs, folder, kind)), type: kind, los: await children(fs, folder, options) };
    case "unit":
    case "side": // upstream routes a unit or side to its topic page
      return { ...(await base(fs, folder, kind)), type: kind, route: parentRoute, los: await children(fs, folder, options) };
    case "talk": {
      const marp = withExtension(folder, "marp")[0]; // a Marp deck replaces the talk's markdown body
      const talk = { ...(await base(fs, folder, kind)), type: kind };
      return marp ? { ...talk, contentMd: parseMarkdown(await fs.readText(joinPath(rel, marp))).contentMd } : talk;
    }
    case "note":
      return { ...(await base(fs, folder, kind)), type: kind };
    case "web": {
      const url = folder.files.includes("weburl") ? (await fs.readText(joinPath(rel, "weburl"))).split("\n")[0]!.trim() : "";
      return { ...(await base(fs, folder, kind)), type: kind, route: url } satisfies Web;
    }
    case "archive":
      return { ...(await base(fs, folder, kind)), type: kind, archiveFile: withExtension(folder, "zip")[0] ?? "" } satisfies Archive;
    case "lab":
      return buildLab(fs, folder);
    default:
      return assertNever(kind);
  }
}

/** Reached only if a kind slips past the type checker; the compiler rejects any call that can get here. */
export function assertNever(value: never): never {
  throw new Error(`unhandled learning object kind: ${String(value)}`);
}

/**
 * Reads a whole course through `fs`, whose root holds course.md. `courseId` is the course folder's
 * name, which the port cannot know.
 */
export async function buildCourse(fs: FileSystemPort, courseId: string, options: BuildOptions = {}): Promise<Course> {
  if (!(await fs.exists("course.md"))) throw new Error("no course.md, so this is not a Tutors course");
  const course = await buildLo(fs, "", "course", options, courseId);
  if (course.type !== "course") throw new Error("unreachable: the root is always a course");
  return course;
}
