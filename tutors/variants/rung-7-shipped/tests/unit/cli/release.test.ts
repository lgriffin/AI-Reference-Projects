/**
 * What a release of the command promises about its output. Each test here is evidence for a claim in
 * release/claims.yaml, by its id (`<file>#<test name>`): rename a test and the claims check tells you.
 * The scenarios for R-037 and R-038 are in tests/bdd/features/command/version.feature.
 */
import { test } from "vitest";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildIdentity, describeIdentity } from "@ladder/lite";
import { gitHead, readBuildIdentity } from "../../../apps/cli/src/build-identity.ts";
import { run } from "../../../apps/cli/src/run.ts";
import { ROOT, SAMPLE_COURSE as FIXTURE } from "../../support/paths.ts";

const SENTINEL = buildIdentity("tutors-ladder", "9.8.7-sentinel", "feedfacefeedfacefeedfacefeedfacefeedface", "2099-01-02T03:04:05Z");

/** Every file of a built site, path to text. */
function files(dir: string): Map<string, string> {
  const all = readdirSync(dir, { recursive: true, encoding: "utf8" }).map((f) => f.replaceAll("\\", "/"));
  return new Map(all.filter((f) => /\.\w+$/.test(f)).map((f) => [f, readFileSync(join(dir, f), "utf8")]));
}

async function build(identity = SENTINEL): Promise<Map<string, string>> {
  const out = mkdtempSync(join(tmpdir(), "rung-7-release-"));
  assert.equal((await stdout(() => run([FIXTURE, out], identity))).code, 0);
  return files(out);
}

/** Capture what run() writes to stdout. */
async function stdout(action: () => Promise<number>): Promise<{ code: number; text: string }> {
  const write = process.stdout.write.bind(process.stdout);
  let text = "";
  process.stdout.write = ((chunk: string) => ((text += chunk), true)) as typeof process.stdout.write;
  try {
    return { code: await action(), text };
  } finally {
    process.stdout.write = write;
  }
}

test("R-037: --version prints the release version and the git commit, and writes nothing", async () => {
  const { code, text } = await stdout(() => run(["--version"], SENTINEL));
  assert.equal(code, 0);
  assert.equal(text, "tutors-ladder 9.8.7-sentinel (commit feedfac, built 2099-01-02T03:04:05Z)\n");
  const real = readBuildIdentity({ GIT_SHA: "0123456789abcdef0123456789abcdef01234567" });
  assert.equal(real.version, JSON.parse(readFileSync(join(ROOT, "apps", "cli", "package.json"), "utf8")).version);
  assert.equal(real.revision, "0123456789abcdef0123456789abcdef01234567", "GIT_SHA wins, as in the container build");
  assert.equal(real.built, "unknown", "no BUILD_DATE means unknown, so local builds repeat exactly");
});

test("without GIT_SHA the commit is read from the checkout's HEAD, as files", () => {
  const repo = mkdtempSync(join(tmpdir(), "rung-7-git-"));
  const sha = "abcdefabcdefabcdefabcdefabcdefabcdefabcd";
  mkdirSync(join(repo, ".git", "refs", "heads"), { recursive: true });
  mkdirSync(join(repo, "a", "b"), { recursive: true });
  writeFileSync(join(repo, ".git", "HEAD"), "ref: refs/heads/main\n");
  writeFileSync(join(repo, ".git", "refs", "heads", "main"), `${sha}\n`);
  assert.equal(gitHead(join(repo, "a", "b")), sha);
  writeFileSync(join(repo, ".git", "refs", "heads", "main"), "");
  writeFileSync(join(repo, ".git", "packed-refs"), `# pack-refs\n${sha} refs/heads/main\n`);
  assert.equal(gitHead(join(repo, "a")), sha, "a packed ref is found too");
  writeFileSync(join(repo, ".git", "HEAD"), `${sha}\n`);
  assert.equal(gitHead(repo), sha, "a detached HEAD is the commit itself");
});

test("R-038: the site writes version.json with the build identity, like upstream's GET /version", async () => {
  const site = await build();
  assert.deepEqual(JSON.parse(site.get("version.json")!), {
    app: "tutors-ladder",
    version: "9.8.7-sentinel",
    revision: "feedfacefeedfacefeedfacefeedfacefeedface",
    built: "2099-01-02T03:04:05Z",
  });
});

test("R-038: the build identity appears in version.json and nowhere else", async () => {
  const leaks = [...(await build())]
    .filter(([path]) => path !== "version.json")
    .flatMap(([path, text]) => ["feedfac", "9.8.7-sentinel", "2099-01-02"].filter((s) => text.includes(s)).map((s) => `${path} contains "${s}"`));
  assert.deepEqual(leaks, [], "Build identity rule: only version.json may name the commit, version or build date, so two builds of one course differ in one file (upstream scripts/checks/build-identity.ts).");
});

test("two builds of the same source write the same bytes, apart from version.json", async () => {
  const first = await build();
  const second = await build(buildIdentity("tutors-ladder", "1.0.0", "0000000000000000000000000000000000000000", "2000-01-01T00:00:00Z"));
  first.delete("version.json");
  second.delete("version.json");
  assert.deepEqual([...second.keys()].sort(), [...first.keys()].sort());
  for (const [path, text] of first) assert.equal(second.get(path), text, `${path} changed between two builds of the same course`);
});

test("an identity with no commit or date says unknown, and a short or odd revision is printed whole", () => {
  assert.deepEqual(buildIdentity("a", "1.0.0"), { app: "a", version: "1.0.0", revision: "unknown", built: "unknown" });
  assert.deepEqual(buildIdentity("a", "1.0.0", "  ", " 2026-11-25 "), { app: "a", version: "1.0.0", revision: "unknown", built: "2026-11-25" });
  assert.equal(describeIdentity(buildIdentity("a", "1.0.0")), "a 1.0.0 (commit unknown, built unknown)");
  assert.equal(readBuildIdentity({ BUILD_DATE: "2026-11-25T10:00:00Z" }, tmpdir()).built, "2026-11-25T10:00:00Z");
});

test("the command's last line names what it wrote, private or not, pages or not", async () => {
  const PRIVATE = join(ROOT, "tests", "fixtures", "private-course");
  const line = async (args: string[]) => (await stdout(() => run([...args, mkdtempSync(join(tmpdir(), "rung-7-line-"))], SENTINEL))).text.replace(/ to .*\n$/, "");
  assert.equal(await line([FIXTURE]), "wrote 8 pages, version.json and tutors.json");
  assert.equal(await line(["--json-only", FIXTURE]), "wrote 0 pages and tutors.json");
  assert.equal(await line(["--private", PRIVATE]), "wrote 2 pages, marked private, version.json and tutors.json");
  assert.equal(await line(["--json-only", "--private", PRIVATE]), "wrote 0 pages, marked private, and tutors.json");
});
