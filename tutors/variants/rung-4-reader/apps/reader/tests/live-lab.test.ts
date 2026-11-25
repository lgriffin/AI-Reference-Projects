import { test } from "node:test";
import assert from "node:assert/strict";
import type { Lab } from "@ladder/model";
import { liveLab } from "../src/lib/course/live-lab.ts";

const step = (id: string) => ({ type: "step" as const, id, shortTitle: id, title: id, contentMd: `# ${id}`, route: `/lab/c/book-1/${id}` });
const lab: Lab = { type: "lab", id: "book-1", title: "Lab", summary: "", contentMd: "", route: "/lab/c/book-1", los: [step("Intro"), step("Setup"), step("Build")] };

test("with no step, the lab opens at its first step, with no previous", () => {
  const live = liveLab(lab)!;
  assert.deepEqual([live.step.id, live.index, live.previous, live.next?.id], ["Intro", 0, undefined, "Setup"]);
});

test("a step in the middle has both neighbours", () => {
  const live = liveLab(lab, "Setup")!;
  assert.deepEqual([live.previous?.id, live.index, live.next?.id], ["Intro", 1, "Build"]);
});

test("the last step has no next", () => {
  assert.equal(liveLab(lab, "Build")?.next, undefined);
});

test("an unknown step is undefined, for the page to answer 404", () => {
  assert.equal(liveLab(lab, "Nope"), undefined);
  assert.equal(liveLab({ ...lab, los: [] }), undefined);
});

test("a step id arrives URL-encoded and is matched decoded", () => {
  const spaced: Lab = { ...lab, los: [step("Two Words")] };
  assert.equal(liveLab(spaced, "Two%20Words")?.step.id, "Two Words");
});
