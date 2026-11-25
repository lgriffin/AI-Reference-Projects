import { test } from "vitest";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../../../apps/cli/src/run.ts";
import { SAMPLE_COURSE as FIXTURE } from "../../support/paths.ts";

test("the command writes the site and tutors.json", async () => {
  const out = mkdtempSync(join(tmpdir(), "rung-4-cli-"));
  assert.equal(await run([FIXTURE, out]), 0);
  assert.ok(existsSync(join(out, "topic-02-practice", "unit-1-lab", "book-1-first-lab", "Setup.html")));
  assert.equal(JSON.parse(readFileSync(join(out, "tutors.json"), "utf8")).id, "ladder-sample-course");
});

test("a folder without course.md is refused", async () => {
  assert.equal(await run([tmpdir(), mkdtempSync(join(tmpdir(), "rung-4-cli-"))]), 1);
});
