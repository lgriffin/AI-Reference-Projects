/**
 * Containment for what a page links to: a topic's or learning object's pages show and link only to files
 * inside its own folder. Mirrors upstream rule V021 in packages/jsr/course-rules/src/warnings.ts
 * (checkPortable, linkSources, imageSources, resolveSource) and its message in messages.ts.
 *
 * Upstream calls it portability: the topic still works when copied into another course. It is also
 * containment: a page that reaches `../../private/answers.md` publishes, or points readers at, a file its
 * author never meant to share. A warning, as upstream, because the author decides.
 */
import type { LoType } from "@ladder/model";

/** Kinds that hold the course together rather than travel, so their pages may link anywhere in it. */
export const STAYS: ReadonlySet<LoType> = new Set(["course", "unit", "side"]);

/** Markdown with fenced and inline code removed: an example in code is not a link. */
function prose(markdown: string): string {
  return markdown.replace(/^(```|~~~)[\s\S]*?^\1/gm, "").replace(/`[^`\n]*`/g, "");
}

/** Every image and link source a Markdown page uses, outside code, as upstream imageSources and linkSources find them. */
export function pageSources(markdown: string): string[] {
  const text = prose(markdown);
  const sources: string[] = [];
  for (const match of text.matchAll(/!?\[[^\]]*\]\(\s*(?:<([^>]+)>|([^)\s]+))(?:\s+["'][^"']*["'])?\s*\)/g)) sources.push(match[1] ?? match[2]!);
  for (const match of text.matchAll(/^ {0,3}\[[^\]]+\]:\s*(?:<([^>]+)>|(\S+))/gm)) sources.push(match[1] ?? match[2]!);
  for (const match of text.matchAll(/<(?:a\b[^>]*?\bhref|img\b[^>]*?\bsrc)\s*=\s*["']([^"']+)["']/gi)) sources.push(match[1]!);
  return [...new Set(sources)];
}

/** A relative source resolved against the page's folder; null for a web address, an absolute path, or a path above the course. */
export function resolveSource(folder: string, source: string): string | null {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(source)) return null;
  let decoded = source.replace(/[?#].*$/, "");
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // A stray % is part of the name.
  }
  const parts = folder === "" ? [] : folder.split("/");
  for (const part of decoded.split("/")) {
    if (part === "" || part === ".") continue;
    if (part !== "..") parts.push(part);
    else if (parts.pop() === undefined) return null;
  }
  return parts.join("/");
}

/** The sources on a page in folder `own` that reach outside it, each once. */
export function reachesOutside(own: string, markdown: string): string[] {
  return pageSources(markdown).filter((source) => {
    const target = resolveSource(own, source);
    return target === null ? /^(?:\.\.\/)+/.test(source.replace(/^\.\//, "")) : target !== own && !target.startsWith(`${own}/`);
  });
}

/** The warning for one source, worded as upstream's messages.reachesOutside. */
export function outsideWarning(file: string, source: string): string {
  return `V021 ${file}: This page uses "${source}", which is outside its own folder, so the link breaks when this is copied into another course. Move the file into this folder and link to it there.`;
}
