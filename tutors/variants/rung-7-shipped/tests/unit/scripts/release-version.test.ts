/**
 * pnpm release:version, run as a process on a copy of the scripts in a scratch workspace: it prints the next
 * version, and only --write changes a file. The rules it applies are proved in tests/unit/release.
 */
import { test } from "vitest";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ROOT } from "../../support/paths.ts";

const FIXTURES = join(ROOT, "tests", "unit", "release", "fixtures");

test("the script prints the next version and, with --write, bumps every package.json and the changelog", () => {
  const work = mkdtempSync(join(tmpdir(), "rung-7-version-"));
  cpSync(join(ROOT, "scripts"), join(work, "scripts"), { recursive: true });
  writeFileSync(join(work, "package.json"), JSON.stringify({ name: "w", version: "1.0.0" }, null, 2));
  for (const app of ["cli", "reader"]) {
    mkdirSync(join(work, "apps", app), { recursive: true });
    writeFileSync(join(work, "apps", app, "package.json"), JSON.stringify({ name: `@ladder/${app}`, version: "1.0.0" }, null, 2));
  }
  writeFileSync(join(work, "CHANGELOG.md"), "# Changelog\n\n## [Unreleased]\n\n## [1.0.0] - 2026-01-01\n\n- first\n");
  const run = (...args: string[]) => execFileSync(process.execPath, [join(work, "scripts", "release-version.ts"), ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

  const dry = run("--commits", join(FIXTURES, "feat-and-fix.commits.txt"), "--date", "2026-11-25");
  assert.match(dry, /bump: minor: 1 feat, 3 fix or perf\nnext version: 1\.1\.0/);
  assert.equal(JSON.parse(readFileSync(join(work, "package.json"), "utf8")).version, "1.0.0", "without --write nothing changes");

  run("--commits", join(FIXTURES, "feat-and-fix.commits.txt"), "--date", "2026-11-25", "--write");
  assert.equal(JSON.parse(readFileSync(join(work, "package.json"), "utf8")).version, "1.1.0");
  for (const app of ["cli", "reader"]) assert.equal(JSON.parse(readFileSync(join(work, "apps", app, "package.json"), "utf8")).version, "1.1.0", "every app moves with the root");
  assert.ok(readFileSync(join(work, "CHANGELOG.md"), "utf8").includes(`## [Unreleased]\n\n${readFileSync(join(FIXTURES, "feat-and-fix.expected.md"), "utf8")}`));

  assert.match(run("--commits", join(FIXTURES, "chores-only.commits.txt")), /Nothing to release/);
});

test("with --from a release tag, the same commits are released once: the second --write is refused", () => {
  const work = mkdtempSync(join(tmpdir(), "rung-7-twice-"));
  cpSync(join(ROOT, "scripts"), join(work, "scripts"), { recursive: true });
  mkdirSync(join(work, "apps", "cli"), { recursive: true });
  for (const file of ["package.json", "apps/cli/package.json"]) writeFileSync(join(work, file), JSON.stringify({ name: "w", version: "1.0.0" }, null, 2));
  writeFileSync(join(work, "CHANGELOG.md"), "# Changelog\n\n## [Unreleased]\n\n## [1.0.0] - 2026-01-01\n\n- first\n");
  const git = (...args: string[]) => execFileSync("git", ["-c", "user.name=test", "-c", "user.email=test@example.invalid", "-c", "commit.gpgsign=false", ...args], { cwd: work, stdio: "pipe" });
  git("init", "-q", "-b", "main");
  git("add", "-A");
  git("commit", "-qm", "chore: start");
  git("tag", "v1.0.0");
  writeFileSync(join(work, "notes.txt"), "help\n");
  git("add", "-A");
  git("commit", "-qm", "feat(cli): print the usage with --help");
  const run = () => spawnSync(process.execPath, [join(work, "scripts", "release-version.ts"), "--from", "v1.0.0", "--date", "2026-11-25", "--write"], { encoding: "utf8" });

  const first = run();
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /current version: 1\.0\.0\n.*\nnext version: 1\.1\.0/);
  git("commit", "-qam", "chore(release): 1.1.0");

  const second = run();
  assert.equal(second.status, 2, "package.json says 1.1.0 now, but the commits since v1.0.0 are still release 1.1.0");
  assert.match(second.stderr, /CHANGELOG\.md already has a section for 1\.1\.0\. A version is released once/);
  assert.equal(JSON.parse(readFileSync(join(work, "package.json"), "utf8")).version, "1.1.0", "and nothing moved");
});

test("a bad argument is exit code 2 with one line that says what to give", () => {
  const result = spawnSync(process.execPath, [join(ROOT, "scripts", "release-version.ts")], { encoding: "utf8" });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /release-version: give exactly one of --commits <file> or --from <git ref>/);
});
