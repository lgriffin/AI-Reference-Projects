/** Helpers for comparing a Course with upstream's tutors.json. */

/** The fields this rung builds. Upstream has more (img, video, frontMatter, ...); RUNG.md lists them. */
export const FIELDS = ["type", "id", "title", "summary", "contentMd", "route", "archiveFile", "shortTitle", "properties"];

type Json = { [key: string]: unknown };

/** A learning object and its children, cut down to FIELDS. */
export function project(lo: object): Json {
  const source = lo as Json;
  const out: Json = {};
  for (const field of FIELDS) if (field in source) out[field] = source[field];
  if (Array.isArray(source.los)) out.los = source.los.map((child: Json) => project(child));
  return out;
}

/** Every learning object in a tree, the root first, depth first. */
export function descendants(lo: object): Json[] {
  const source = lo as Json;
  return [source, ...(Array.isArray(source.los) ? source.los.flatMap((child: Json) => descendants(child)) : [])];
}
