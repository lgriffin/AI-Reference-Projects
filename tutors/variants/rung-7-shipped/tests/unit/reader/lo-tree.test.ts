/**
 * The reader's course logic, run on the tutors.json that upstream's generator wrote for the shared fixture
 * (tutors/variants/fixtures/ladder-sample-course.tutors.json). If the reader reads upstream's file, the file is the contract.
 */
import { test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Course } from "@ladder/model";
import { ORACLE } from "../../support/paths.ts";
import { arrange, breadCrumbs, cardRoute, decorateCourseTree, findLo } from "../../../apps/reader/src/lib/course/lo-tree.ts";

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
  assert.deepEqual([units.map((lo) => lo.id), sides.map((lo) => lo.id), standardLos.length], [["unit-1-intro"], ["side-resources"], 0]);
  assert.deepEqual(arrange(tree.course).standardLos.map((lo) => lo.type), ["topic", "topic"]);
});

test("a web card links out, an archive card has no link", () => {
  const los = [...tree.parents.keys()];
  assert.equal(cardRoute(los.find((lo) => lo.type === "web")!), "https://tutors.dev");
  assert.equal(cardRoute(los.find((lo) => lo.type === "archive")!), undefined);
});

// Added in rung 5 to kill mutants that survived the first Stryker run over the reader (see RUNG.md).
test("the course has no parent, and every lab step's route carries the course id", () => {
  assert.equal(tree.parents.has(tree.course), false);
  const lab = findLo(tree, "/lab/sample/topic-02-practice/unit-1-lab/book-1-first-lab");
  assert.equal(lab?.type, "lab");
  if (lab?.type === "lab") assert.deepEqual(lab.los.map((step) => step.route), ["Lab-01-First-Steps", "Setup", "Build"].map((id) => `/lab/sample/topic-02-practice/unit-1-lab/book-1-first-lab/${id}`));
});

// Rung 6 (Guarded): every route passes safeUrl as tutors.json enters the reader (R-033).
test("R-033: a route that is script becomes no route, on a card and on a lab step; safe routes are kept", () => {
  const hostile: Course = {
    type: "course", id: "c", title: "C", summary: "", contentMd: "", route: "/",
    los: [
      { type: "web", id: "w1", title: "W", summary: "", contentMd: "", route: "javascript:alert(1)" },
      { type: "web", id: "w2", title: "W", summary: "", contentMd: "", route: "https://tutors.dev" },
      { type: "web", id: "w3", title: "W", summary: "", contentMd: "", route: "JaVa\tScRiPt:alert(1)" },
      { type: "lab", id: "l", title: "L", summary: "", contentMd: "", route: "/lab/{{COURSEURL}}/l", los: [{ type: "step", id: "s", shortTitle: "s", title: "S", contentMd: "", route: "vbscript:x" }, { type: "step", id: "t", shortTitle: "t", title: "T", contentMd: "", route: "/lab/{{COURSEURL}}/l/t" }] },
    ],
  };
  const guarded = decorateCourseTree(hostile, "h");
  const [w1, w2, w3, lab] = guarded.course.los;
  assert.equal(w1!.route, "");
  assert.equal(cardRoute(w1!), undefined);
  assert.equal(cardRoute(w2!), "https://tutors.dev");
  assert.equal(cardRoute(w3!), undefined);
  assert.equal(cardRoute(lab!), "/lab/h/l");
  assert.deepEqual(lab?.type === "lab" && lab.los.map((step) => step.route), ["", "/lab/h/l/t"]);
});
