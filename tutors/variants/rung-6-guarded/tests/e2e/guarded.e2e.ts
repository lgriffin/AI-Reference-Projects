/**
 * The guarded reader in a real browser: the built reader is pointed at a course written to attack it
 * (tests/fixtures/hostile-course) and at a private one (tests/fixtures/private-course). `pnpm course`
 * builds both beside the sample course. The scenarios in tests/bdd/features/reader/guarded-reader.feature
 * prove R-032 to R-034 on the reader's logic; this proves that nothing a course wrote runs in Chromium.
 */
import { afterAll, beforeAll, expect, test } from "vitest";
import type { Page } from "playwright";
import { openReader, type Reader } from "./serve.ts";

let reader: Reader;
beforeAll(async () => {
  reader = await openReader();
});
afterAll(() => reader?.close());

/** A page that records everything a successful attack would leave behind. */
async function watched(): Promise<{ page: Page; dialogs: string[]; violations: string[]; errors: string[] }> {
  const page = await reader.browser.newPage();
  const dialogs: string[] = [];
  const violations: string[] = [];
  const errors: string[] = [];
  page.on("dialog", (dialog) => (dialogs.push(dialog.message()), dialog.dismiss()));
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (/Content Security Policy/i.test(message.text())) violations.push(message.text());
  });
  return { page, dialogs, violations, errors };
}

test("the hostile course runs no script: not from a link, an image, raw HTML or a web link (R-022, R-033, R-034)", async () => {
  const { page, dialogs, violations, errors } = await watched();
  const base = `${reader.origin}/note/hostile-course/topic-01-attack/unit-1-payloads/note-1-links`;

  await page.goto(base);
  await page.getByRole("heading", { level: 1, name: "Links that run script" }).waitFor();
  // Every script-bearing address lost its link; the text is still there to read.
  expect(await page.locator(".prose .blocked").allInnerTexts()).toEqual(["the reading list", "this one", "a harmless picture"]);
  expect(await page.locator('.prose a[href^="javascript" i], .prose img[src^="data:" i], .prose script, .prose img[onerror]').count()).toBe(0);
  expect(await page.locator(".prose").innerText()).toContain("<script>alert('script-tag')</script>");

  await page.goto(`${reader.origin}/topic/hostile-course/topic-01-attack`);
  await page.getByRole("heading", { level: 1, name: "Attack" }).waitFor();
  const web = page.locator("article[data-lo-type=web]");
  expect(await web.locator("a").count(), "the web link's address was javascript:, so its card has no link").toBe(0);
  await web.click();

  await page.goto(`${reader.origin}/lab/hostile-course/topic-01-attack/unit-1-payloads/book-1-lab`);
  await page.getByRole("heading", { level: 1, name: "Setup" }).waitFor();
  // A tab inside the address means the Markdown renderer never saw a link at all: it is text.
  expect(await page.locator(".prose a").count()).toBe(0);
  expect(await page.locator(".prose").innerText()).toContain("[copy](java");

  expect(dialogs, "no alert() ran").toEqual([]);
  expect(errors).toEqual([]);
  expect(violations, "the reader itself never trips its own policy").toEqual([]);
});

test("the built page carries the policy, and the policy stops a script the page did not ship (R-034)", async () => {
  const { page, dialogs, violations } = await watched();
  await page.goto(`${reader.origin}/course/ladder-sample-course`);
  await page.getByRole("heading", { level: 1, name: "Ladder Sample Course" }).waitFor();
  const policy = await page.locator('meta[http-equiv="content-security-policy" i]').getAttribute("content");
  expect(policy).toMatch(/default-src 'none'/);
  expect(policy).toMatch(/script-src 'self' 'sha256-[A-Za-z0-9+/=]+'/);
  expect(policy).toMatch(/style-src 'self';/);
  expect(policy).toMatch(/style-src-attr 'unsafe-hashes' 'sha256-[A-Za-z0-9+/=]+'/);
  expect(policy).not.toMatch(/unsafe-inline|unsafe-eval/);
  expect(violations, "the reader's own start-up script and styles are allowed").toEqual([]);

  // The last wall, tested by walking through the first two: inject what an XSS hole would inject.
  // A string, so it is the browser's code, not this file's: the test's own tsconfig has no DOM types.
  await page.evaluate(`
    const script = document.createElement("script");
    script.textContent = "alert('injected')";
    document.body.append(script);
    const image = document.createElement("img");
    image.setAttribute("onerror", "alert('handler')");
    image.setAttribute("style", "position: fixed");
    image.src = "/no-such-image.png";
    document.body.append(image);
  `);
  await page.waitForTimeout(300);
  expect(dialogs, "the policy refused both").toEqual([]);
  expect(violations.length).toBeGreaterThanOrEqual(3);
});

test("an anonymous reader of a private course gets the notice, and none of its pages (R-032)", async () => {
  const { page } = await watched();
  for (const path of ["/course/private-course", "/topic/private-course/topic-01-enrolled"]) {
    await page.goto(`${reader.origin}${path}`);
    await page.getByRole("heading", { name: "403" }).waitFor();
    const text = await page.locator("main").innerText();
    expect(text).toMatch(/Private course: "private-course" is not shown, because it is for signed-in readers/);
    expect(text).not.toMatch(/exam answers|Enrolled only/);
  }
});
