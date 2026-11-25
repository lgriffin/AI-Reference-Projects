/**
 * Smoke test: the built reader, served as plain files, in a real browser. A learner's path from the home
 * page to a lab step, by clicks and one key press, and two 404s. Run with `pnpm test:e2e` (it builds first).
 * The scenarios in tests/bdd/features/reader prove R-014 to R-021 on the reader's logic; this proves that
 * the routes and components put that logic in front of a learner.
 */
import { afterAll, beforeAll, expect, test } from "vitest";
import { openReader, type Reader } from "./serve.ts";

let reader: Reader;
beforeAll(async () => {
  reader = await openReader();
});
afterAll(() => reader?.close());

test("a learner clicks from the home page to a lab step (R-018, R-019, R-021)", async () => {
  const page = await reader.browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(reader.origin);
  await page.getByRole("link", { name: "Open the course" }).click();
  await page.getByRole("heading", { level: 1, name: "Ladder Sample Course" }).waitFor();
  expect(await page.locator("article[data-lo-type=topic]").count()).toBe(2);

  await page.getByRole("link", { name: /Practice/ }).click();
  await page.getByRole("heading", { level: 2, name: "Hands On" }).waitFor();
  expect(page.url()).toMatch(/\/topic\/ladder-sample-course\/topic-02-practice$/);

  await page.locator("article[data-lo-type=lab] a").click();
  await page.getByRole("heading", { level: 1, name: "Objectives" }).waitFor();
  expect(await page.locator("nav[aria-label=Breadcrumb] li").allInnerTexts()).toEqual(["Ladder Sample Course", "Practice", "Lab-01-First-Steps"]);

  await page.getByRole("link", { name: "Setup →" }).click();
  await page.getByRole("heading", { level: 1, name: "Setup" }).waitFor();
  expect(page.url()).toMatch(/\/book-1-first-lab\/Setup$/);
  expect(await page.locator('[aria-current="step"]').innerText()).toBe("Setup");

  await page.keyboard.press("ArrowRight");
  await page.getByRole("heading", { level: 1, name: "Build" }).waitFor();
  expect(await page.locator("pre code").innerText()).toMatch(/node src\/main\.ts course/);
  expect(errors).toEqual([]);
});

test("an unknown course answers 404, though the host serves its fallback page (R-016, R-020)", async () => {
  const page = await reader.browser.newPage();
  await page.goto(`${reader.origin}/course/nope`);
  await page.getByRole("heading", { name: "404" }).waitFor();
  expect(await page.locator("main").innerText()).toMatch(/Not found: the course "nope"/);
});

test("an unknown lab step answers 404 with a message that names it (R-020)", async () => {
  const page = await reader.browser.newPage();
  await page.goto(`${reader.origin}/lab/ladder-sample-course/topic-02-practice/unit-1-lab/book-1-first-lab/Nope`);
  await page.getByRole("heading", { name: "404" }).waitFor();
  expect(await page.locator("main").innerText()).toMatch(/Not found: a lab step at/);
});
