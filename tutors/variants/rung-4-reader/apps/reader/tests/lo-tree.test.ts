/**
 * The reader's course logic, run on the tutors.json that upstream's generator wrote for the shared fixture
 * (../fixtures/ladder-sample-course.tutors.json). If the reader reads upstream's file, the file is the contract.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Course } from "@ladder/model";
import { arrange, breadCrumbs, cardRoute, decorateCourseTree, findLo } from "../src/lib/course/lo-tree.ts";

const ORACLE = join(import.meta.dirname, "..", "..", "..", "..", "fixtures", "ladder-sample-course.tutors.json");
const raw = (): Course => JSON.parse(readFileSync(ORACLE, "utf8"));
const tree = decorateCourseTree(raw(), "sample");

test("the course lives at /course/<id> and every route carries the id", () => {
  assert.equal(tree.course.route, "/course/sample");
  const routes = [...tree.loIndex.keys()];
  assert.ok(routes.every((route) => /^\/(course|topic|talk|note|lab)\/sample(\/|$)/.test(route)), routes.join("\n"));
  assert.ok(routes.includes("/topic/sample/topic-01-basics"));
});

test("decorating leaves the fetched JSON as it came", () => {
  const json = raw();
  decorateCourseTree(json, "sample");
  assert.match(json.los[0]!.route, /\{\{COURSEURL\}\}/);
});

test("the index holds pages only: course, topics, talks, notes and labs", () => {
  const kinds = new Set([...tree.loIndex.values()].map((lo) => lo.type));
  assert.deepEqual([...kinds].sort(), ["course", "lab", "note", "talk", "topic"]);
});

test("findLo finds a page by its URL path, with or without a trailing slash", () => {
  const path = "/talk/sample/topic-01-basics/unit-1-intro/talk-1-welcome";
  assert.equal(findLo(tree, path)?.title, "Welcome");
  assert.equal(findLo(tree, `${path}/`)?.title, "Welcome");
  assert.equal(findLo(tree, "/talk/sample/no-such-talk"), undefined);
});

test("breadcrumbs run from the course to the page, skipping units", () => {
  const note = findLo(tree, "/note/sample/topic-01-basics/unit-1-intro/note-1-reading")!;
  assert.deepEqual(breadCrumbs(tree, note).map((lo) => lo.type), ["course", "topic", "note"]);
});

test("arrange splits a topic into units, side units and loose cards", () => {
  const topic = findLo(tree, "/topic/sample/topic-01-basics")!;
  assert.equal(topic.type, "topic");
  const { units, sides, standardLos } = arrange(topic.type === "topic" ? topic : tree.course);
  assert.deepEqual([units.length, sides.length, standardLos.length], [1, 1, 0]);
  assert.deepEqual(arrange(tree.course).standardLos.map((lo) => lo.type), ["topic", "topic"]);
});

test("a web card links out, an archive card has no link", () => {
  const los = [...tree.parents.keys()];
  assert.equal(cardRoute(los.find((lo) => lo.type === "web")!), "https://tutors.dev");
  assert.equal(cardRoute(los.find((lo) => lo.type === "archive")!), undefined);
});
