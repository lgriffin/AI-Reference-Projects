/**
 * Conformance (R-007): the real wiring, NodeFileSystem and gen, agrees with the upstream generator on every
 * field this rung builds. The oracle, fixtures/ladder-sample-course.tutors.json, was written by upstream
 * `tutors build`. Upstream's own differential is tests/generator/generator-compare.test.ts.
 */
import { test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCourse } from "@ladder/gen";
import { NodeFileSystem } from "../../apps/cli/src/node-file-system.ts";
import { ORACLE, SAMPLE_COURSE } from "../support/paths.ts";
import { project } from "../support/tutors-json.ts";

const oracle = JSON.parse(readFileSync(ORACLE, "utf8"));
const course = await buildCourse(new NodeFileSystem(SAMPLE_COURSE), "ladder-sample-course");

test("R-007: the course tree has the same shape, ids, types and titles as upstream", () => {
  const outline = (lo: Record<string, unknown>): unknown => [lo.type, lo.id, lo.title, ...(Array.isArray(lo.los) ? lo.los.map(outline) : [])];
  assert.deepEqual(outline(course), outline(oracle));
});

test("R-007: every field this rung builds matches upstream, learning object by learning object", () => {
  assert.deepEqual(project(course), project(oracle));
});
