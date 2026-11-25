/**
 * Grading test for the Layers assignment (course week 5, tutors/course/topic-05-layers-ports: "A validate package", the last week of rung 3).
 * Skipped unless LADDER_ASSIGNMENT=1, so the Single Gate stays green before you start:
 *
 *     LADDER_ASSIGNMENT=1 node --test tests/assignment/*.test.ts
 *
 * The package does not exist until you write it, so it is loaded with a dynamic import that tsc does
 * not follow. The messages are upstream's (packages/jsr/course-rules/src/messages.ts at 2b96b69).
 * Do not change the expectations to make the test pass: change the code.
 */
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { MemoryFileSystem } from "../../packages/gen/src/index.ts";
import type { FileSystemPort } from "../../packages/gen/src/index.ts";
import { NodeFileSystem } from "../../apps/cli/src/node-file-system.ts";

const skip = process.env.LADDER_ASSIGNMENT !== "1" && "set LADDER_ASSIGNMENT=1 to grade the validate assignment";

const ROOT = resolve(import.meta.dirname, "..", "..");
const FIXTURE = join(ROOT, "..", "fixtures", "ladder-sample-course");
const PACKAGE = join(ROOT, "packages", "validate");

type Finding = { rule: string; severity: string; path: string; message: string };
type Validate = (fs: FileSystemPort) => Promise<Finding[]>;

/** The package's validate function, loaded at run time so this file compiles before the package exists. */
async function loadValidate(): Promise<Validate> {
  const index = join(PACKAGE, "src", "index.ts");
  assert.ok(existsSync(index), "Create packages/validate/src/index.ts, exporting validate(fs: FileSystemPort): Promise<Finding[]>.");
  const module: { validate?: Validate } = await import(pathToFileURL(index).href);
  assert.equal(typeof module.validate, "function", "packages/validate/src/index.ts must export a function named validate.");
  return module.validate!;
}

const text = (path: string) => readFileSync(join(ROOT, path), "utf8");
const json = (path: string) => JSON.parse(text(path).replace(/^\s*\/\/.*$/gm, ""));

const V001 = "This folder has no course.md, so Tutors can't tell it is a course. Add a course.md whose first line is the course title, like # Web Development.";
const V003 = (name: string, kind: string) => `This ${name} has no .md file, so its card has no title. Add one, like ${kind}.md, whose first line is the title.`;

test("AC1: @ladder/validate is a workspace package that depends only on layers beneath it", { skip }, () => {
  const pkg = json("packages/validate/package.json");
  assert.equal(pkg.name, "@ladder/validate");
  assert.equal(pkg.exports?.["."], "./src/index.ts", "export ./src/index.ts as the package's only entry point");
  for (const [name, version] of Object.entries(pkg.dependencies ?? {})) {
    assert.ok(["@ladder/model", "@ladder/gen"].includes(name), `@ladder/validate may depend on @ladder/model and @ladder/gen only, not ${name}`);
    assert.equal(version, "workspace:*");
  }
  assert.deepEqual(json("packages/validate/tsconfig.json").compilerOptions?.types, [], "no Node types: the package receives the file system through FileSystemPort");
});

test("AC2: the gate, the layers and the fence all know the new package", { skip }, () => {
  assert.match(json("package.json").scripts.typecheck, /tsc -p packages\/validate/, "add tsc -p packages/validate to the typecheck script");
  const architecture = text("tests/architecture/architecture.test.ts");
  const layer = architecture.match(/"@ladder\/validate":\s*\{\s*dir:\s*"packages\/validate",\s*may:\s*\[([^\]]*)\]/);
  assert.ok(layer, 'add "@ladder/validate": { dir: "packages/validate", may: [...], job: "..." } to LAYERS');
  assert.doesNotMatch(layer[1]!, /lite|cli/, "validate checks a course; it must not reach the renderer or the command line");
  assert.match(architecture.match(/"@ladder\/cli":\s*\{[^}]*\}/)![0], /"@ladder\/validate"/, "the composition root wires validate, so @ladder/cli may import it");
  assert.match(text("tests/rung-fence.test.ts"), /"packages\/validate"/, "the Rung Fence checks every package: add packages/validate to PACKAGES (a person's change)");
});

test("AC3: V001, a course folder without course.md is one error at the root", { skip }, async () => {
  const validate = await loadValidate();
  const findings = await validate(new MemoryFileSystem({ "topic-01/topic.md": "# T\n" }));
  assert.deepEqual(findings, [{ rule: "V001", severity: "error", path: "", message: V001 }]);
});

test("AC4: V003, every topic, unit and side needs a .md, wherever it sits", { skip }, async () => {
  const validate = await loadValidate();
  const findings = await validate(new MemoryFileSystem({
    "course.md": "# C\n",
    "topic-01-a/note-1/note.md": "# N\n",
    "topic-02-b/topic.md": "# B\n",
    "topic-02-b/unit-1-x/talk-1/talk.md": "# Talk\n",
    "topic-02-b/side-1-y/web-1/weburl": "https://tutors.dev\n",
  }));
  assert.deepEqual(findings, [
    { rule: "V003", severity: "error", path: "topic-01-a", message: V003("Topic", "topic") },
    { rule: "V003", severity: "error", path: "topic-02-b/side-1-y", message: V003("Side unit", "side") },
    { rule: "V003", severity: "error", path: "topic-02-b/unit-1-x", message: V003("Unit", "unit") },
  ], "one finding per folder, sorted by path, with upstream's messages");
});

test("AC5: V003 is about composites only: folders of no kind and simple kinds are not checked", { skip }, async () => {
  const validate = await loadValidate();
  const findings = await validate(new MemoryFileSystem({
    "course.md": "# C\n",
    "topic-01/topic.md": "# T\n",
    "topic-01/talk-1/deck.marp": "---\nmarp: true\n---\n",
    "topic-01/drafts/notes.txt": "not content\n",
  }));
  assert.deepEqual(findings, []);
});

test("AC6: the shared fixture has no findings, read through the real adapter", { skip }, async () => {
  const validate = await loadValidate();
  assert.deepEqual(await validate(new NodeFileSystem(FIXTURE)), []);
});

test("AC7: the command line runs it: validate <courseFolder> prints each finding and fails on errors", { skip }, async () => {
  const broken = mkdtempSync(join(tmpdir(), "rung-3-validate-"));
  for (const [path, content] of Object.entries({ "course.md": "# C\n", "topic-01-a/note-1/note.md": "# N\n" })) {
    mkdirSync(dirname(join(broken, path)), { recursive: true });
    writeFileSync(join(broken, path), content);
  }
  const cli = (folder: string) => spawnSync(process.execPath, [join(ROOT, "apps", "cli", "src", "main.ts"), "validate", folder], { encoding: "utf8" });
  const [clean, failing] = [cli(FIXTURE), cli(broken)];
  const codes = [clean.status, failing.status];
  const output = [failing.stdout, failing.stderr];
  assert.deepEqual(codes, [0, 1], "exit 0 for a clean course, 1 when there is an error");
  assert.ok(output.join("").includes(`error V003 topic-01-a: ${V003("Topic", "topic")}`), `print each finding as "<severity> <rule> <path>: <message>", as upstream tutors validate does\n${output.join("")}`);
});
