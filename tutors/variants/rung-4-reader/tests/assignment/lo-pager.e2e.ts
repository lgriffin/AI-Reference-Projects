/**
 * Grading check in a browser for the topic 5 assignment. Run with `pnpm test:assignment` (it builds first).
 */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { openReader, type Reader } from "../../apps/reader/tests/e2e/serve.ts";

const skip = process.env.ASSIGNMENT ? false : "the assignment's grading test: run pnpm test:assignment";
let reader: Reader | undefined;
before(async () => {
  if (!skip) reader = await openReader();
});
after(() => reader?.close());

test("AC1 to AC3: a learner pages from the first talk to the lab and no further", { skip }, async () => {
  const page = await reader!.browser.newPage();
  await page.goto(`${reader!.origin}/talk/ladder-sample-course/topic-01-basics/unit-1-intro/talk-1-welcome`);
  const pager = page.getByRole("navigation", { name: "Learning object pager" });
  await pager.waitFor();
  assert.equal(await pager.getByRole("link").count(), 1, "AC2: the first learning object has no previous link.");

  await pager.getByRole("link", { name: /Reading Guide/ }).click();
  await page.waitForURL(/\/note\/ladder-sample-course\//);
  await pager.getByRole("link", { name: /Lab-01-First-Steps/ }).click();
  await page.waitForURL(/\/lab\/ladder-sample-course\//);
  assert.equal(await pager.getByRole("link").count(), 1, "AC3: the last learning object has no next link.");
  assert.match(await pager.innerText(), /Reading Guide/, "AC2: the lab links back to the note before it.");
});
