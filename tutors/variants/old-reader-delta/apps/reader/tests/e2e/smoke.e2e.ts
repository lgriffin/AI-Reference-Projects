/**
 * Smoke test: the built reader, served as plain files, in a real browser. A learner's path from the home
 * page to a lab step, by clicks and one key press. Run with `pnpm test:e2e` (it builds first).
 */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { openReader, type Reader } from "./serve.ts";

let reader: Reader;
before(async () => (reader = await openReader()));
after(() => reader?.close());

test("a learner clicks from the home page to a lab step", async () => {
  const page = await reader.browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(reader.origin);
  await page.getByRole("link", { name: "Open the course" }).click();
  await page.getByRole("heading", { level: 1, name: "Ladder Sample Course" }).waitFor();
  assert.equal(await page.locator("article[data-lo-type=topic]").count(), 2);

  await page.getByRole("link", { name: /Practice/ }).click();
  await page.getByRole("heading", { level: 2, name: "Hands On" }).waitFor();
  assert.match(page.url(), /\/topic\/ladder-sample-course\/topic-02-practice$/);

  await page.locator("article[data-lo-type=lab] a").click();
  await page.getByRole("heading", { level: 1, name: "Objectives" }).waitFor();
  assert.deepEqual(await page.locator("nav[aria-label=Breadcrumb] li").allInnerTexts(), ["Ladder Sample Course", "Practice", "Lab-01-First-Steps"]);

  await page.getByRole("link", { name: "Setup →" }).click();
  await page.getByRole("heading", { level: 1, name: "Setup" }).waitFor();
  assert.match(page.url(), /\/book-1-first-lab\/Setup$/);
  assert.equal(await page.locator('[aria-current="step"]').innerText(), "Setup");

  await page.keyboard.press("ArrowRight");
  await page.getByRole("heading", { level: 1, name: "Build" }).waitFor();
  assert.match(await page.locator("pre code").innerText(), /node src\/main\.ts course/);
  assert.deepEqual(errors, []);
});

test("an unknown course answers 404, though the host serves its fallback page", async () => {
  const page = await reader.browser.newPage();
  await page.goto(`${reader.origin}/course/nope`);
  await page.getByRole("heading", { name: "404" }).waitFor();
  assert.match(await page.locator("main").innerText(), /Not found: the course "nope"/);
});

test("an unknown page answers 404 with a message that names it", async () => {
  const page = await reader.browser.newPage();
  await page.goto(`${reader.origin}/lab/ladder-sample-course/topic-02-practice/unit-1-lab/book-1-first-lab/Nope`);
  await page.getByRole("heading", { name: "404" }).waitFor();
  assert.match(await page.locator("main").innerText(), /Not found: a lab step at/);
});
