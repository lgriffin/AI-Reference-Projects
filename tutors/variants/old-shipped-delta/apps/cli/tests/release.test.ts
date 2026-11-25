/**
 * What a release of the command promises about its output. Each test here is evidence for a claim in
 * release/claims.yaml, by its id (`<file>#<test name>`): rename a test and the claims check tells you.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildIdentity } from "@ladder/lite";
import { gitHead, readBuildIdentity } from "../src/build-identity.ts";
import { run } from "../src/run.ts";

const FIXTURE = join(import.meta.dirname, "..", "..", "..", "..", "fixtures", "ladder-sample-course");
const SENTINEL = buildIdentity("tutors-ladder", "9.8.7-sentinel", "feedfacefeedfacefeedfacefeedfacefeedface", "2099-01-02T03:04:05Z");

/** Every file of a built site, path to text. */
function files(dir: string): Map<string, string> {
  const all = readdirSync(dir, { recursive: true, encoding: "utf8" }).map((f) => f.replaceAll("\\", "/"));
  return new Map(all.filter((f) => /\.\w+$/.test(f)).map((f) => [f, readFileSync(join(dir, f), "utf8")]));
}

async function build(identity = SENTINEL): Promise<Map<string, string>> {
  const out = mkdtempSync(join(tmpdir(), "rung-7-release-"));
  assert.equal(await run([FIXTURE, out], identity), 0);
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

test("--version prints the release version and the git commit", async () => {
  const { code, text } = await stdout(() => run(["--version"], SENTINEL));
  assert.equal(code, 0);
  assert.equal(text, "tutors-ladder 9.8.7-sentinel (commit feedfac, built 2099-01-02T03:04:05Z)\n");
  const real = readBuildIdentity({ GIT_SHA: "0123456789abcdef0123456789abcdef01234567" });
  assert.equal(real.version, JSON.parse(readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8")).version);
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

test("the site writes version.json with the build identity, like upstream's GET /version", async () => {
  const site = await build();
  assert.deepEqual(JSON.parse(site.get("version.json")!), {
    app: "tutors-ladder",
    version: "9.8.7-sentinel",
    revision: "feedfacefeedfacefeedfacefeedfacefeedface",
    built: "2099-01-02T03:04:05Z",
  });
});

test("the build identity appears in version.json and nowhere else", async () => {
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

test("the site has no script: no <script> element and no inline event handler", async () => {
  const found = [...(await build())]
    .filter(([path]) => path.endsWith(".html"))
    .flatMap(([path, text]) => [...text.matchAll(/<script\b|\son[a-z]+\s*=|javascript:/gi)].map((m) => `${path}: ${m[0]}`));
  assert.deepEqual(found, [], "No-script rule: the lite site is static HTML. A script on a page needs a Content Security Policy and a reason; interactive pages are rung 4 (Reader).");
});
