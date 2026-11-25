/**
 * The course service with a stand-in for SvelteKit's fetch: one request per course, 404s as undefined.
 * The scenarios in tests/bdd/features/reader prove R-014 to R-020; these tests are what Stryker runs.
 */
import { test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AnonymousSession, FakeSession, githubActor } from "@ladder/identity";
import { courseUrl, readCourse, readLab, readLo, refusal, requestLab, requestLo } from "../../../apps/reader/src/lib/course/course-service.ts";
import { ORACLE as ORACLE_FILE } from "../../support/paths.ts";

const ORACLE = readFileSync(ORACLE_FILE, "utf8");

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

test("requestLo finds a page of the kind its route names, or says what is missing", async () => {
  const { fetch } = fakeFetch();
  const talk = "/talk/sample/topic-01-basics/unit-1-intro/talk-1-welcome";
  const found = await requestLo("talk", "sample", talk, fetch);
  assert.ok("found" in found && found.found.title === "Welcome" && found.tree.courseId === "sample");
  assert.equal((await requestLo("course", "sample", "/course/sample", fetch) as { found: { type: string } }).found.type, "course");
  assert.deepEqual(await requestLo("note", "sample", talk, fetch), { notFound: `Not found: a note at ${talk}` });
  assert.deepEqual(await requestLo("topic", "sample", "/topic/sample/nope", fetch), { notFound: "Not found: a topic at /topic/sample/nope" });
  assert.deepEqual(await requestLo("course", "missing", "/course/missing", fetch), { notFound: 'Not found: the course "missing"' });
});

test("requestLab opens a lab, or says whether the course or the step is missing", async () => {
  const { fetch } = fakeFetch();
  const lab = "/lab/sample/topic-02-practice/unit-1-lab/book-1-first-lab";
  const opened = await requestLab("sample", `${lab}/Setup`, fetch);
  assert.ok("found" in opened && opened.found.step.id === "Setup" && opened.tree.courseId === "sample");
  assert.deepEqual(await requestLab("sample", `${lab}/Nope`, fetch), { notFound: `Not found: a lab step at ${lab}/Nope` });
  assert.deepEqual(await requestLab("missing", lab, fetch), { notFound: 'Not found: the course "missing"' });
});

// Added in rung 5 to kill mutants that survived the first Stryker run over the reader (see RUNG.md).
test("a course id the reader refuses is never fetched, and readLab of a missing course is undefined", async () => {
  const { fetch, requests } = fakeFetch();
  assert.equal(await readCourse("../secrets", fetch), undefined);
  assert.equal(await readLab("../secrets", "/lab/x/y", fetch), undefined);
  assert.equal(await readLab("missing-lab-course", "/lab/missing-lab-course/y", fetch), undefined);
  assert.deepEqual(requests, ["/courses/missing-lab-course/tutors.json"]);
});

// Rung 6 (Guarded): the policy is asked before a page is handed out (R-032). What Stryker runs for refusal().
const PRIVATE = { type: "course", id: "p", title: "P", summary: "", contentMd: "", route: "/", properties: { auth: 1 }, enrollment: { educators: ["ada"], whitelist: ["bob"] }, los: [] };
const privateFetch = async (url: string) => ({ ok: url === "/courses/exam/tutors.json", json: async () => structuredClone(PRIVATE) });

test("R-032: a private course answers an anonymous session with a notice, and none of its pages", async () => {
  const notice = 'Private course: "exam" is not shown, because it is for signed-in readers, and this reader has no sign-in.';
  assert.deepEqual(await requestLo("course", "exam", "/course/exam", privateFetch), { refused: notice });
  assert.deepEqual(await requestLab("exam", "/lab/exam/x", privateFetch), { refused: notice });
  assert.deepEqual(await requestLo("course", "exam", "/course/exam", privateFetch, new AnonymousSession()), { refused: notice });
});

test("R-032: a signed-in reader is refused unless enrolled, and an enrolled reader or an educator sees the course", async () => {
  const as = (login: string) => new FakeSession(githubActor(login, 1));
  assert.deepEqual(await requestLo("course", "exam", "/course/exam", privateFetch, as("eve")), { refused: 'Private course: "exam" is not shown, because you are not on its enrolment list.' });
  assert.equal("found" in (await requestLo("course", "exam", "/course/exam", privateFetch, as("bob"))), true);
  assert.equal("found" in (await requestLo("course", "exam", "/course/exam", privateFetch, as("ada"))), true);
  assert.deepEqual(await requestLab("exam", "/lab/exam/x", privateFetch, as("bob")), { notFound: "Not found: a lab step at /lab/exam/x" });
  const tree = (await readCourse("exam", privateFetch))!;
  assert.equal(await refusal(tree, as("bob")), undefined);
});

test("R-020: a missing course is a 404, never a private notice", async () => {
  assert.deepEqual(await requestLo("course", "nope", "/course/nope", privateFetch), { notFound: 'Not found: the course "nope"' });
});
