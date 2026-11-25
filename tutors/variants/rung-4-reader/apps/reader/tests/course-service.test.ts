/** The course service with a stand-in for SvelteKit's fetch: one request per course, 404s as undefined. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { courseUrl, readCourse, readLab, readLo } from "../src/lib/course/course-service.ts";

const ORACLE = readFileSync(join(import.meta.dirname, "..", "..", "..", "..", "fixtures", "ladder-sample-course.tutors.json"), "utf8");

function fakeFetch() {
  const requests: string[] = [];
  const fetch = async (url: string) => {
    requests.push(url);
    const ok = url === "/courses/sample/tutors.json";
    return { ok, json: async () => JSON.parse(ORACLE) };
  };
  return { fetch, requests };
}

test("a course id becomes a path under /courses; anything else is refused", () => {
  assert.equal(courseUrl("ladder-sample-course"), "/courses/ladder-sample-course/tutors.json");
  assert.equal(courseUrl("../secrets"), undefined);
  assert.equal(courseUrl("https://example.org"), undefined);
});

test("a course is fetched once and reused by every page", async () => {
  const { fetch, requests } = fakeFetch();
  const first = await readCourse("sample", fetch);
  const second = await readCourse("sample", fetch);
  assert.equal(first, second);
  assert.ok((await readLo("sample", "/topic/sample/topic-02-practice", fetch))?.title);
  assert.deepEqual(requests.filter((url) => url.includes("/sample/")), ["/courses/sample/tutors.json"]);
});

test("a missing course is undefined", async () => {
  assert.equal(await readCourse("missing", fakeFetch().fetch), undefined);
});

test("a fallback page where tutors.json should be is not a course", async () => {
  const html = async () => ({ ok: true, json: () => Promise.reject(new SyntaxError("Unexpected token '<'")) });
  assert.equal(await readCourse("fallback", html), undefined);
  const notCourse = async () => ({ ok: true, json: async () => ({ type: "topic", los: [] }) });
  assert.equal(await readCourse("not-a-course", notCourse), undefined);
});

test("readLab opens a lab at its first step, or at the step the URL names", async () => {
  const { fetch } = fakeFetch();
  const lab = "/lab/sample/topic-02-practice/unit-1-lab/book-1-first-lab";
  assert.equal((await readLab("sample", lab, fetch))?.index, 0);
  assert.equal((await readLab("sample", `${lab}/Build`, fetch))?.step.id, "Build");
  assert.equal(await readLab("sample", `${lab}/Missing`, fetch), undefined);
  assert.equal(await readLab("sample", "/lab/sample/topic-02-practice", fetch), undefined);
});
