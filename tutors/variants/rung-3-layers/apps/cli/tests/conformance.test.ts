/**
 * Conformance: the real wiring (NodeFileSystem and gen) agrees with the upstream generator on every
 * field this rung builds. The oracle, fixtures/ladder-sample-course.tutors.json, was written by upstream `tutors build`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildCourse } from "@ladder/gen";
import { NodeFileSystem } from "../src/node-file-system.ts";

const FIXTURES = join(import.meta.dirname, "..", "..", "..", "..", "fixtures");
const oracle = JSON.parse(readFileSync(join(FIXTURES, "ladder-sample-course.tutors.json"), "utf8"));
const course = await buildCourse(new NodeFileSystem(join(FIXTURES, "ladder-sample-course")), "ladder-sample-course");

/** The fields this rung builds. Upstream has more (img, video, frontMatter, ...); RUNG.md lists them. */
const FIELDS = ["type", "id", "title", "summary", "contentMd", "route", "archiveFile", "shortTitle"];

type Json = { [key: string]: unknown };
function project(lo: Json): Json {
  const out: Json = {};
  for (const field of FIELDS) if (field in lo) out[field] = lo[field];
  if (Array.isArray(lo.los)) out.los = lo.los.map((child: Json) => project(child));
  return out;
}

test("the course tree has the same shape, ids, types and titles as upstream", () => {
  const outline = (lo: Json): unknown => [lo.type, lo.id, lo.title, ...(Array.isArray(lo.los) ? lo.los.map(outline) : [])];
  assert.deepEqual(outline(course), outline(oracle));
});

test("every field this rung builds matches upstream, learning object by learning object", () => {
  assert.deepEqual(project(course), project(oracle));
});
