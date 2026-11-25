/**
 * SemVer and the changelog, from Conventional Commits. The fixtures are commits files, one message per
 * block between "---" lines, as `pnpm release:version --commits <file>` reads them.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addRelease, bumpFor, changelogSection, nextVersion, parseCommits, parseMessage } from "../lib/conventional.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");
const fixture = (name: string) => readFileSync(join(FIXTURES, name), "utf8");

test("a Conventional Commit header gives its type, scope, breaking mark and description", () => {
  assert.deepEqual(parseMessage("feat(cli)!: drop --json"), { type: "feat", scope: "cli", breaking: true, description: "drop --json" });
  assert.deepEqual(parseMessage("fix: a\n\nBREAKING CHANGE: b"), { type: "fix", breaking: true, description: "a" });
  assert.deepEqual(parseMessage("fix: a\n\nBREAKING-CHANGE: b"), { type: "fix", breaking: true, description: "a" });
  assert.deepEqual(parseMessage("Update stuff"), { subject: "Update stuff" });
  assert.deepEqual(parseMessage("Feat: capitalised types are not Conventional"), { subject: "Feat: capitalised types are not Conventional" });
});

test("the largest bump wins: breaking is major, feat minor, fix and perf patch, the rest nothing", () => {
  assert.equal(bumpFor(parseCommits(fixture("feat-and-fix.commits.txt")).commits), "minor");
  assert.equal(bumpFor(parseCommits(fixture("breaking.commits.txt")).commits), "major");
  assert.equal(bumpFor(parseCommits(fixture("chores-only.commits.txt")).commits), "none");
  assert.equal(bumpFor(parseCommits("fix: a\n---\nperf: b").commits), "patch");
});

test("the next version follows SemVer, including before 1.0.0 and after a pre-release", () => {
  assert.equal(nextVersion("1.4.2", "major"), "2.0.0");
  assert.equal(nextVersion("1.4.2", "minor"), "1.5.0");
  assert.equal(nextVersion("1.4.2", "patch"), "1.4.3");
  assert.equal(nextVersion("1.4.2", "none"), "1.4.2");
  assert.equal(nextVersion("0.3.1", "major"), "0.4.0", "before 1.0.0 a breaking change moves the minor number");
  assert.equal(nextVersion("2.0.0-rc.2", "patch"), "2.0.0", "a pre-release is finished, not skipped");
  assert.throws(() => nextVersion("v1.2", "patch"), /not a SemVer version/);
});

test("the changelog section is Keep a Changelog, from the fixture commits (golden file)", () => {
  const { commits, unconventional } = parseCommits(fixture("feat-and-fix.commits.txt"));
  assert.deepEqual(unconventional, [{ hash: "6f70819", subject: "Update stuff" }]);
  assert.equal(changelogSection(nextVersion("1.0.0", bumpFor(commits)), "2026-11-25", commits), fixture("feat-and-fix.expected.md"));
});

test("a breaking change is listed under Changed and marked", () => {
  const section = changelogSection("2.0.0", "2026-11-25", parseCommits(fixture("breaking.commits.txt")).commits);
  assert.match(section, /### Changed\n\n- \*\*Breaking:\*\* \*\*gen:\*\* FileSystemPort.list returns names only\n- \*\*Breaking:\*\* keep lab step order stable/);
  assert.match(section, /### Added\n\n- \*\*model:\*\* add the video learning object/);
});

test("a release goes under Unreleased, which is emptied, and a version is released once", () => {
  const before = "# Changelog\n\n## [Unreleased]\n\n- something\n\n## [1.0.0] - 2026-01-01\n\n- first\n";
  const after = addRelease(before, "## [1.1.0] - 2026-11-25\n\n### Added\n\n- x\n");
  assert.equal(after, "# Changelog\n\n## [Unreleased]\n\n## [1.1.0] - 2026-11-25\n\n### Added\n\n- x\n\n## [1.0.0] - 2026-01-01\n\n- first\n");
  assert.throws(() => addRelease(after, "## [1.1.0] - 2026-11-26\n"), /already has a section for 1.1.0/);
  assert.throws(() => addRelease("# Changelog\n", "## [1.0.0] - x\n"), /no "## \[Unreleased\]" heading/);
});

test("the script prints the next version and, with --write, bumps every package.json and the changelog", () => {
  const work = mkdtempSync(join(tmpdir(), "rung-7-version-"));
  const root = join(import.meta.dirname, "..", "..");
  for (const path of ["apps", "scripts"]) cpSync(join(root, path), join(work, path), { recursive: true, filter: (f) => !f.includes("node_modules") });
  writeFileSync(join(work, "package.json"), JSON.stringify({ name: "w", version: "1.0.0" }, null, 2));
  writeFileSync(join(work, "apps", "cli", "package.json"), JSON.stringify({ name: "@ladder/cli", version: "1.0.0" }, null, 2));
  writeFileSync(join(work, "CHANGELOG.md"), "# Changelog\n\n## [Unreleased]\n\n## [1.0.0] - 2026-01-01\n\n- first\n");
  const run = (...args: string[]) => execFileSync(process.execPath, [join(work, "scripts", "release-version.ts"), ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

  const dry = run("--commits", join(FIXTURES, "feat-and-fix.commits.txt"), "--date", "2026-11-25");
  assert.match(dry, /bump: minor: 1 feat, 3 fix or perf\nnext version: 1\.1\.0/);
  assert.equal(JSON.parse(readFileSync(join(work, "package.json"), "utf8")).version, "1.0.0", "without --write nothing changes");

  run("--commits", join(FIXTURES, "feat-and-fix.commits.txt"), "--date", "2026-11-25", "--write");
  assert.equal(JSON.parse(readFileSync(join(work, "package.json"), "utf8")).version, "1.1.0");
  assert.equal(JSON.parse(readFileSync(join(work, "apps", "cli", "package.json"), "utf8")).version, "1.1.0");
  assert.ok(readFileSync(join(work, "CHANGELOG.md"), "utf8").includes(`## [Unreleased]\n\n${fixture("feat-and-fix.expected.md")}`));

  assert.match(run("--commits", join(FIXTURES, "chores-only.commits.txt")), /Nothing to release/);
});
