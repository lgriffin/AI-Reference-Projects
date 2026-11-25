import { test } from "vitest";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../../../apps/cli/src/run.ts";
import { SAMPLE_COURSE as FIXTURE } from "../../support/paths.ts";

test("the command writes the site and tutors.json", async () => {
  const out = mkdtempSync(join(tmpdir(), "rung-6-cli-"));
  assert.equal(await run([FIXTURE, out]), 0);
  assert.ok(existsSync(join(out, "topic-02-practice", "unit-1-lab", "book-1-first-lab", "Setup.html")));
  assert.equal(JSON.parse(readFileSync(join(out, "tutors.json"), "utf8")).id, "ladder-sample-course");
});

test("--json-only writes tutors.json and no pages, for the reader", async () => {
  const out = join(mkdtempSync(join(tmpdir(), "rung-6-cli-")), "courses", "ladder-sample-course");
  assert.equal(await run(["--json-only", FIXTURE, out]), 0);
  assert.deepEqual(readdirSync(out), ["tutors.json"]);
});

test("a folder without course.md is refused", async () => {
  assert.equal(await run([tmpdir(), mkdtempSync(join(tmpdir(), "rung-6-cli-"))]), 1);
});
