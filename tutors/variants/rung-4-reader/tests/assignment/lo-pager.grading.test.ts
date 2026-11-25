/**
 * Grading test for the topic 5 assignment, "A next and previous navigator" (course/topic-05-reader).
 * Skipped in the Single Gate until you start: run it with `pnpm test:assignment`, which sets ASSIGNMENT=1.
 * The module is imported by a computed path, so the gate compiles before lo-pager.ts exists.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const skip = process.env.ASSIGNMENT ? false : "the assignment's grading test: run pnpm test:assignment";
const ROOT = join(import.meta.dirname, "..", "..");
const READER = join(ROOT, "apps", "reader");
const ORACLE = join(ROOT, "..", "fixtures", "ladder-sample-course.tutors.json");

type Lo = { type: string; title: string; route: string };
type Tree = { loIndex: Map<string, Lo> };
type Pager = { readingOrder(tree: Tree): Lo[]; loNeighbours(tree: Tree, lo: Lo): { previous?: Lo; next?: Lo } };

async function load(): Promise<{ pager: Pager; tree: Tree }> {
  const file = join(READER, "src", "lib", "course", "lo-pager.ts");
  assert.ok(existsSync(file), "AC5: put the pager's logic in apps/reader/src/lib/course/lo-pager.ts, plain TypeScript, so node --test can run it.");
  const pager = (await import(file)) as Pager;
  const { decorateCourseTree } = await import(join(READER, "src", "lib", "course", "lo-tree.ts"));
  return { pager, tree: decorateCourseTree(JSON.parse(readFileSync(ORACLE, "utf8")), "sample") };
}

test("AC4: the reading order is the course's talks, notes and labs, in pre-order", { skip }, async () => {
  const { pager, tree } = await load();
  assert.deepEqual(
    pager.readingOrder(tree).map((lo) => lo.title),
    ["Welcome", "Reading Guide", "Lab-01-First-Steps"],
    "AC4: walk the course in the order tutors.json holds it, keeping only talks, notes and labs (no course, topic, unit, side, web or archive).",
  );
});

test("AC2 and AC3: each learning object knows its neighbours; the ends have one", { skip }, async () => {
  const { pager, tree } = await load();
  const [first, middle, last] = pager.readingOrder(tree);
  assert.deepEqual([pager.loNeighbours(tree, first!).previous, pager.loNeighbours(tree, first!).next?.title], [undefined, "Reading Guide"], "AC2/AC3: the first has a next and no previous.");
  assert.deepEqual([pager.loNeighbours(tree, middle!).previous?.title, pager.loNeighbours(tree, middle!).next?.title], ["Welcome", "Lab-01-First-Steps"]);
  assert.equal(pager.loNeighbours(tree, last!).next, undefined, "AC3: the last has no next.");
});

test("AC5: the pager is a navigator, with unit tests of its own", { skip }, () => {
  assert.ok(existsSync(join(READER, "src", "lib", "ui-navigators", "LoPager.svelte")), "AC5: the component is apps/reader/src/lib/ui-navigators/LoPager.svelte.");
  assert.ok(existsSync(join(READER, "tests", "lo-pager.test.ts")), "AC5: add apps/reader/tests/lo-pager.test.ts, your own unit tests for lo-pager.ts.");
  for (const page of ["content/Note.svelte", "content/lab/Lab.svelte"]) {
    const source = readFileSync(join(READER, "src", "lib", "ui-components", page), "utf8");
    assert.match(source, /<LoPager\b/, `AC1: ${page} does not show <LoPager>. Every talk, note and lab page has the pager.`);
  }
});
