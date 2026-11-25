/**
 * Course folder in, Course out. Mirrors upstream packages/jsr/gen/src/services/course-builder.ts
 * (what each kind of learning object holds) and resource-builder.ts (how a folder's kind is found).
 */
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { folderKinds, preOrder } from "./model.ts";
import type { Archive, Course, Lab, LabStep, Lo, LoType, Web } from "./model.ts";

/** Folders the generator never reads: hidden ones and its own output. */
const IGNORED = new Set(["json", "html", "node_modules"]);

/** Longest prefix first, so "notebook-1" is a notebook and not a note, as upstream findLastMatchingString does. */
const kindsLongestFirst = [...folderKinds].sort(([a], [b]) => b.length - a.length);

/**
 * The kind a folder's name declares: a LoType, `null` for a kind this rung does not build,
 * or `undefined` when the name starts with no kind at all (the folder is not content).
 */
export function folderKind(name: string): LoType | null | undefined {
  return kindsLongestFirst.find(([prefix]) => name.startsWith(prefix))?.[1];
}

/** Strips a leading `---` front matter block, as the upstream `front-matter` package does. */
export function stripFrontMatter(text: string): string {
  const match = text.match(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/);
  return match ? text.slice(match[0].length).replace(/^(\s*\r?\n)+/, "") : text;
}

/** Title, summary and body of a markdown file, as upstream getMarkdown reads them. */
export function readMarkdown(file: string): { title: string; summary: string; contentMd: string } {
  const contentMd = stripFrontMatter(readFileSync(file, "utf8"));
  const [first = "", ...rest] = contentMd.split("\n");
  const title = (first.startsWith("#") ? first.slice(1) : first).trim(); // upstream drops one "#" only
  const summary = rest.join("\n").trim().split("\n")[0]!.trim();
  return { title, summary, contentMd };
}

type Folder = { path: string; rel: string; files: string[]; dirs: string[] };

function readFolder(root: string, rel: string): Folder {
  const path = join(root, rel);
  const entries = readdirSync(path, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1));
  const visible = entries.filter((entry) => !entry.name.startsWith(".") && !IGNORED.has(entry.name));
  return {
    path,
    rel,
    files: visible.filter((entry) => entry.isFile()).map((entry) => entry.name),
    dirs: visible.filter((entry) => entry.isDirectory()).map((entry) => entry.name),
  };
}

const withExtension = (folder: Folder, ext: string) => folder.files.filter((file) => file.endsWith(`.${ext}`));

/** The fields every learning object shares, from the folder's first markdown file. */
function base(folder: Folder, kind: LoType, keyFile?: string) {
  const markdown = keyFile ?? withExtension(folder, "md")[0];
  const text = markdown ? readMarkdown(join(folder.path, markdown)) : { title: "", summary: "", contentMd: "" };
  return { ...text, id: basename(folder.path), route: `/${kind}/{{COURSEURL}}/${folder.rel}` };
}

/** The children of a composite: every subfolder that names its kind, in upstream preOrder. */
function children(root: string, folder: Folder): Lo[] {
  const los: Lo[] = [];
  for (const name of folder.dirs) {
    const kind = folderKind(name);
    if (kind === undefined) continue;
    if (kind === null) {
      process.stderr.write(`skipped ${join(folder.rel, name)}: this rung does not build this kind\n`);
      continue;
    }
    los.push(buildLo(root, join(folder.rel, name).replaceAll("\\", "/"), kind));
  }
  return los.sort((a, b) => preOrder[a.type] - preOrder[b.type]); // stable: equal kinds keep folder order
}

function buildLab(folder: Folder): Lab {
  const lab: Lab = { ...base(folder, "lab"), type: "lab", los: [] };
  for (const file of withExtension(folder, "md")) {
    const { contentMd } = readMarkdown(join(folder.path, file));
    const shortTitle = file.slice(file.indexOf(".") + 1, file.lastIndexOf(".")); // 01.Setup.md -> Setup
    const title = contentMd.split("\n")[0]!.replace(/^#+/, "").trim();
    lab.los.push({ type: "step", id: shortTitle, shortTitle, title, contentMd, route: `${lab.route}/${shortTitle}` } satisfies LabStep);
  }
  // Upstream quirk: a lab with img/main.* takes the first step's short title as its own title.
  const hasMainImage = folder.dirs.includes("img") && readdirSync(join(folder.path, "img")).some((f) => f.startsWith("main."));
  if (hasMainImage && lab.los[0]) lab.title = lab.los[0].shortTitle;
  return lab;
}

/**
 * Builds one learning object from its folder. The switch is exhaustive: add a member to `Lo` in
 * model.ts and this function stops compiling until it builds the new kind (Unrepresentable Mistake).
 */
export function buildLo(root: string, rel: string, kind: LoType): Lo {
  const folder = readFolder(root, rel);
  const parentRoute = `/topic/{{COURSEURL}}/${rel.slice(0, rel.lastIndexOf("/"))}/`;
  switch (kind) {
    case "course":
      return { ...base(folder, kind, "course.md"), type: kind, id: basename(root), route: "/", los: children(root, folder) };
    case "topic":
      return { ...base(folder, kind), type: kind, los: children(root, folder) };
    case "unit":
    case "side": // upstream routes a unit or side to its topic page
      return { ...base(folder, kind), type: kind, route: parentRoute, los: children(root, folder) };
    case "talk": {
      const marp = withExtension(folder, "marp")[0]; // a Marp deck replaces the talk's markdown body
      const talk = { ...base(folder, kind), type: kind };
      return marp ? { ...talk, contentMd: readMarkdown(join(folder.path, marp)).contentMd } : talk;
    }
    case "note":
      return { ...base(folder, kind), type: kind };
    case "web": {
      const url = folder.files.includes("weburl") ? readFileSync(join(folder.path, "weburl"), "utf8").split("\n")[0]!.trim() : "";
      return { ...base(folder, kind), type: kind, route: url } satisfies Web;
    }
    case "archive":
      return { ...base(folder, kind), type: kind, archiveFile: withExtension(folder, "zip")[0] ?? "" } satisfies Archive;
    case "lab":
      return buildLab(folder);
    default:
      return assertNever(kind);
  }
}

/** Reached only if a kind slips past the type checker; the compiler rejects any call that can get here. */
export function assertNever(value: never): never {
  throw new Error(`unhandled learning object kind: ${String(value)}`);
}

/** Reads a whole course folder, which holds course.md, and returns its tree. */
export function buildCourse(root: string): Course {
  const course = buildLo(root, "", "course");
  if (course.type !== "course") throw new Error("unreachable: the root is always a course");
  return course;
}
