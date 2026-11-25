/**
 * Courses for scenarios, written as a few folder names. Each folder gets the markdown file its kind needs,
 * so a scenario says only what matters to its Rule. Mirrors upstream tests/bdd/support/course.ts, which
 * publishes a course as the generator would.
 */
import { MemoryFileSystem } from "@ladder/gen";
import type { Course, Lo } from "@ladder/model";

/** "a, b, c" as ["a", "b", "c"]. */
export const list = (text: string) => text.split(",").map((item) => item.trim()).filter((item) => item !== "");

/** "\n" in a feature file's string, as a line break. */
export const unescape = (text: string) => text.replaceAll("\\n", "\n");

/** A course.md and a topic.md: the least a course needs. */
export function courseFiles(topic = "topic-1"): Record<string, string> {
  return { "course.md": "# Course\nA course.\n", [`${topic}/topic.md`]: "# Topic\nA topic.\n" };
}

/** One markdown file in each folder, named and titled after the folder. */
export function folders(parent: string, names: string[]): Record<string, string> {
  return Object.fromEntries(names.map((name) => [`${parent}/${name}/${name.split("-")[0]}.md`, `# ${name}\nAbout ${name}.\n`]));
}

/** An empty file is enough for a file whose content does not matter, such as an image. */
export function files(parent: string, names: string[]): Record<string, string> {
  return Object.fromEntries(names.map((name) => [`${parent}/${name}`, name.endsWith(".md") ? `# ${name}\nStep ${name}.\n` : ""]));
}

export const memory = (tree: Record<string, string>) => new MemoryFileSystem(tree);

/** Every learning object in a course, depth first. */
export function all(lo: Lo): Lo[] {
  return [lo, ...("los" in lo && lo.type !== "lab" ? lo.los.flatMap(all) : [])];
}

/** The one learning object with this id; fails the scenario if there is not exactly one. */
export function byId(course: Course, id: string): Lo {
  const found = all(course).filter((lo) => lo.id === id);
  if (found.length !== 1) throw new Error(`expected exactly one learning object with id ${id}, found ${found.length}`);
  return found[0]!;
}
