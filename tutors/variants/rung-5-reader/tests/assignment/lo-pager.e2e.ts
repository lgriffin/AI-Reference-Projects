/**
 * Grading check in a browser for Assignment 09 (AC7). Run with `pnpm test:assignment`, which builds the
 * reader first. Skipped unless LADDER_ASSIGNMENT=1.
 */
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { openReader, type Reader } from "../e2e/serve.ts";

describe.skipIf(!process.env.LADDER_ASSIGNMENT)("Assignment 09 in a browser", () => {
  let reader: Reader;
  beforeAll(async () => {
    reader = await openReader();
  });
  afterAll(() => reader?.close());

  test("AC7: a learner pages from the first talk to the lab and no further", async () => {
    const page = await reader.browser.newPage();
    await page.goto(`${reader.origin}/talk/ladder-sample-course/topic-01-basics/unit-1-intro/talk-1-welcome`);
    const pager = page.getByRole("navigation", { name: "Learning object pager" });
    await pager.waitFor();
    expect(await pager.getByRole("link").count(), "AC7: the first learning object has no previous link.").toBe(1);

    await pager.getByRole("link", { name: /Reading Guide/ }).click();
    await page.waitForURL(/\/note\/ladder-sample-course\//);
    await pager.getByRole("link", { name: /Lab-01-First-Steps/ }).click();
    await page.waitForURL(/\/lab\/ladder-sample-course\//);
    expect(await pager.getByRole("link").count(), "AC7: the last learning object has no next link.").toBe(1);
    expect(await pager.innerText(), "AC7: the lab links back to the note before it.").toMatch(/Reading Guide/);
  });
});
