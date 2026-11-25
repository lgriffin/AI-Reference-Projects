/**
 * The guarded command, end to end on the disk: a hostile course is built safely, a course whose
 * course.md is a link out of the folder is refused, and a private course needs --private.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/run.ts";

const HOSTILE = join(import.meta.dirname, "..", "..", "..", "tests", "fixtures", "hostile-course");
const temp = (name: string) => mkdtempSync(join(tmpdir(), `rung-6-${name}-`));

/** Runs the command and keeps what it wrote to stderr. */
async function runCapturing(args: string[]): Promise<{ code: number; stderr: string }> {
  const write = process.stderr.write;
  let stderr = "";
  process.stderr.write = ((chunk: string) => ((stderr += chunk), true)) as typeof process.stderr.write;
  try {
    return { code: await run(args), stderr };
  } finally {
    process.stderr.write = write;
  }
}

const pagesIn = (dir: string): string[] =>
  readdirSync(dir, { recursive: true, encoding: "utf8" }).filter((file) => file.endsWith(".html")).map((file) => readFileSync(join(dir, file), "utf8"));

test("the hostile course builds, with every script neutralised and every link out of a folder reported", async () => {
  const out = temp("hostile");
  const { code, stderr } = await runCapturing([HOSTILE, out]);
  assert.equal(code, 0);
  const pages = pagesIn(out);
  assert.ok(pages.length >= 5);
  for (const html of pages) {
    assert.doesNotMatch(html, /href="\s*(java|vb)script:|src="\s*data:|<script|<iframe|<svg|<img src=x/i);
    assert.match(html, /http-equiv="Content-Security-Policy"/);
  }
  assert.match(stderr, /warning: V021 topic-01-attack\/unit-1-payloads\/note-1-links\/note.md: This page uses "..\/..\/..\/answers\/solutions.md"/);
  assert.match(stderr, /warning: V021 topic-01-attack\/unit-1-payloads\/book-1-lab\/01.Next.md: This page uses "..\/..\/..\/..\/..\/etc\/passwd"/);
});

test("a course.md that is a link to a file outside the course is refused, and nothing is written", async () => {
  const base = temp("link");
  const course = join(base, "course");
  cpSync(HOSTILE, course, { recursive: true });
  mkdirSync(join(base, "home"));
  writeFileSync(join(base, "home", "secret.txt"), "# my private notes\n");
  rmSync(join(course, "course.md"));
  symlinkSync(join(base, "home", "secret.txt"), join(course, "course.md"));
  const out = join(base, "out");
  const { code, stderr } = await runCapturing([course, out]);
  assert.equal(code, 1);
  assert.match(stderr, /refused to read "course.md": a link leads outside the course folder/);
  assert.throws(() => readdirSync(out), "nothing is written");
});

test("a private course is refused without --private, and built with every page marked when it is given", async () => {
  const course = temp("private");
  writeFileSync(join(course, "course.md"), "# Private\n\nFor enrolled readers.\n");
  writeFileSync(join(course, "properties.yaml"), "auth: 1\n");
  const refused = await runCapturing([course, temp("private-refused")]);
  assert.equal(refused.code, 1);
  assert.match(refused.stderr, /is a private course \(properties.yaml says auth: 1\).*\(sign-in-required\).*--private/s);
  const out = temp("private-out");
  const built = await runCapturing([course, out, "--private"]);
  assert.equal(built.code, 0);
  for (const html of pagesIn(out)) assert.match(html, /<meta name="tutors-access" content="private">/);
  assert.equal(JSON.parse(readFileSync(join(out, "tutors.json"), "utf8")).properties.auth, 1);
});

test("an unknown flag is a usage error", async () => {
  assert.equal((await runCapturing([HOSTILE, temp("flag"), "--public"])).code, 2);
});
