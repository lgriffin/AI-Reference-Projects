/**
 * Grading test for Assignment 6, "Raw HTML and locked content" (tutors/course/topic-10-guarded, week 10,
 * the only week of rung 6). Skipped in the Single Gate until you start the assignment. Run it with:
 *
 *     pnpm test:assignment
 *
 * The assignment is specified first, like everything since rung 4: AC1 asks for your EARS requirements and
 * their Rules before any code. When this is green, run `pnpm test`: the closure audit, the architecture
 * tests (which keep your lock policy pure) and the Rung Fence must stay green too.
 * Each failure names the acceptance criterion (AC1 to AC8) it checks.
 */
import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { audit, parseRequirements } from "../../scripts/checks/ears-audit.ts";
import { ROOT } from "../support/paths.ts";

/** Skipped unless LADDER_ASSIGNMENT=1, so the variant's gate stays green until a learner starts. */
const graded = describe.skipIf(process.env["LADDER_ASSIGNMENT"] !== "1");

graded("Specified first", () => {
  test("AC1: REQUIREMENTS.md holds a generator requirement about raw HTML and a policy requirement about locks, each proved by a Rule", () => {
    const requirements = parseRequirements(readFileSync(join(ROOT, "REQUIREMENTS.md"), "utf8")).filter((r) => Number(r.id.slice(2)) > 36);
    const rawHtml = requirements.find((r) => /raw HTML/i.test(r.text) && /the generator shall/.test(r.text));
    const locks = requirements.find((r) => /\block/i.test(r.text) && /the policy shall/.test(r.text));
    assert.ok(rawHtml, "AC1: add a requirement after R-036 (pnpm test:ears:audit --next-id) that says what the generator shall do when a page holds raw HTML.");
    assert.ok(locks, "AC1: add a requirement after R-036 that says what the policy shall do with a locked route.");
    assert.deepEqual(audit(ROOT), [], "AC1: the closure audit must be green: each new requirement needs a Rule with its sentence, word for word, and a scenario (pnpm test:ears:audit).");
  });
});

type Gen = typeof import("../../packages/gen/src/index.ts") & { rawHtmlFindings?: (markdown: string) => string[] };
type Rbac = typeof import("../../packages/rbac/src/index.ts") & {
  isLoRouteLocked?: (route: string, locks: ReadonlyMap<string, boolean>) => boolean;
  canSeeLo?: (role: "anonymous" | "student" | "educator", route: string, locks: ReadonlyMap<string, boolean>) => boolean;
};

async function gen() {
  const module = (await import("../../packages/gen/src/index.ts")) as Gen;
  assert.equal(typeof module.rawHtmlFindings, "function", "AC2: @ladder/gen exports no rawHtmlFindings(markdown). Add it in packages/gen/src and export it from index.ts.");
  return { ...module, rawHtmlFindings: module.rawHtmlFindings! };
}

async function rbac() {
  const module = (await import("../../packages/rbac/src/index.ts")) as Rbac;
  assert.equal(typeof module.isLoRouteLocked, "function", "AC6: @ladder/rbac exports no isLoRouteLocked(route, locks).");
  assert.equal(typeof module.canSeeLo, "function", "AC8: @ladder/rbac exports no canSeeLo(role, route, locks).");
  return { isLoRouteLocked: module.isLoRouteLocked!, canSeeLo: module.canSeeLo! };
}

/** Raw HTML a course author might write, which lite shows as text and the Summit reader sanitises away. */
const RAW: [markdown: string, ...tags: string[]][] = [
  ['<iframe src="https://www.youtube.com/embed/x"></iframe>', "iframe"],
  ["<script>alert(1)</script>", "script"],
  ['<object data="x.swf"></object>', "object"],
  ['<embed src="x.swf">', "embed"],
  ['<form action="https://evil.example"><input name="password"></form>', "form", "input"],
  ["<svg/onload=alert(1)>", "svg"],
  ["<img src=x onerror=alert(1)>", "img"],
  ["<style>body{display:none}</style>", "style"],
  ['<a href="javascript:alert(1)">x</a>', "a"],
  ['<meta http-equiv="refresh" content="0;url=https://evil.example">', "meta"],
  ["<IFRAME SRC=https://evil.example>", "iframe"],
];

/** Text that only looks like HTML: no finding. */
const NOT_RAW: string[] = [
  "a < b and c > d",
  "Use `<iframe>` to embed a video.",
  "```html\n<iframe src=\"x\"></iframe>\n<script>alert(1)</script>\n```",
  "~~~\n<object></object>\n~~~",
  "Generics: Array<string> and Map<K, V>.",
  "An arrow -> and a fat arrow =>.",
  "Email <hello@tutors.dev>",
];

graded("Part A: raw HTML in Markdown", () => {
  for (const [markdown, ...tags] of RAW) {
    test(`AC3: finds ${tags.map((tag) => `<${tag}>`).join(" and ")} in ${JSON.stringify(markdown)}`, async () => {
      const { rawHtmlFindings } = await gen();
      assert.deepEqual(rawHtmlFindings(markdown), tags, `AC3: rawHtmlFindings should return ${JSON.stringify(tags)}: each HTML element's lower-case name once, in order of first appearance.`);
    });
  }

  for (const markdown of NOT_RAW) {
    test(`AC4: no finding in ${JSON.stringify(markdown)}`, async () => {
      const { rawHtmlFindings } = await gen();
      assert.deepEqual(rawHtmlFindings(markdown), [], "AC4: code spans, fenced code, comparisons, generics, arrows and autolinks are not raw HTML.");
    });
  }

  test("AC3: several tags are each reported once, in order", async () => {
    const { rawHtmlFindings } = await gen();
    assert.deepEqual(rawHtmlFindings("<iframe></iframe> then <script>x</script> and <iframe>"), ["iframe", "script"]);
  });

  test("AC5: buildCourse warns once per file and tag, naming both", async () => {
    const { buildCourse, MemoryFileSystem } = await gen();
    const warnings: string[] = [];
    await buildCourse(
      new MemoryFileSystem({
        "course.md": "# C\n\nA <b>bold</b> course.\n",
        "topic-1/topic.md": "# T\n",
        "topic-1/note-1/note.md": "# N\n\n<iframe src=\"https://www.youtube.com/embed/x\"></iframe>\n\n`<script>` is fine in code.\n",
      }),
      "c",
      { warn: (message: string) => warnings.push(message) },
    );
    const raw = warnings.filter((w) => w.startsWith("raw-html "));
    assert.equal(raw.length, 2, `AC5: expected a raw-html warning for course.md <b> and note.md <iframe>, got:\n${warnings.join("\n")}`);
    assert.match(raw.find((w) => w.includes("note.md")) ?? "", /^raw-html topic-1\/note-1\/note.md: .*<iframe>/);
    assert.match(raw.find((w) => w.includes("course.md")) ?? "", /^raw-html course.md: .*<b>/);
  });
});

graded("Part B: locked content", () => {
  /** The table in upstream guides/RBAC.md ("Descendant Route Filtering") and tests/unit/rbac/lock-matching.test.ts. */
  const CASES: [label: string, route: string, locks: [string, boolean][], locked: boolean][] = [
    ["exact match", "/topic/cs101/topic-01", [["/topic/cs101/topic-01", true]], true],
    ["a descendant", "/lab/cs101/topic-01/lab-03", [["/topic/cs101/topic-01", true]], true],
    ["a descendant under another type prefix", "/talk/cs101/week-01/slides", [["/topic/cs101/week-01", true]], true],
    ["a sibling topic", "/lab/cs101/topic-02/lab-03", [["/topic/cs101/topic-01", true]], false],
    ["a similar but distinct name", "/lab/cs101/week-010/lab-03", [["/topic/cs101/week-01", true]], false],
    ["a lock on the course id alone locks nothing", "/topic/cs101/week-02", [["/topic/cs101", true]], false],
    ["an unlocked entry", "/lab/cs101/topic-01/lab-03", [["/topic/cs101/topic-01", false]], false],
    ["trailing slashes are ignored", "/lab/cs101/topic-01/lab-03/", [["/topic/cs101/topic-01//", true]], true],
    ["no locks", "/topic/cs101/topic-01", [], false],
  ];

  for (const [label, route, locks, locked] of CASES) {
    test(`AC6: ${label}: ${route} is ${locked ? "" : "not "}locked`, async () => {
      const { isLoRouteLocked } = await rbac();
      assert.equal(isLoRouteLocked(route, new Map(locks)), locked);
    });
  }

  test("AC7: a long run of slashes is handled in linear time (no regular-expression backtracking)", async () => {
    const { isLoRouteLocked } = await rbac();
    const started = performance.now();
    isLoRouteLocked(`/topic/cs101/topic-01${"/".repeat(200_000)}x`, new Map([["/topic/cs101/topic-01", true]]));
    assert.ok(performance.now() - started < 500, "AC7: normalise with a loop, as upstream normalizeRoute does (CodeQL js/polynomial-redos).");
  });

  test("AC8: educators see locked content; students and anonymous readers do not", async () => {
    const { canSeeLo } = await rbac();
    const locks = new Map([["/topic/cs101/topic-01", true]]);
    assert.equal(canSeeLo("educator", "/lab/cs101/topic-01/lab-03", locks), true);
    assert.equal(canSeeLo("student", "/lab/cs101/topic-01/lab-03", locks), false);
    assert.equal(canSeeLo("anonymous", "/lab/cs101/topic-01/lab-03", locks), false);
    assert.equal(canSeeLo("student", "/lab/cs101/topic-02/lab-03", locks), true);
  });
});
