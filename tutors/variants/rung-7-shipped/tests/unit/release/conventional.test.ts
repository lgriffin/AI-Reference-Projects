/**
 * SemVer and the changelog, from Conventional Commits. The fixtures are commits files, one message per
 * block between "---" lines, as `pnpm release:version --commits <file>` reads them. Pure logic, so Stryker
 * mutates it (R-039); the script itself is run as a process in tests/unit/scripts/release-version.test.ts.
 */
import { test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { addRelease, bumpFor, bumpOf, changelogSection, explainBump, nextVersion, parseCommits, parseMessage } from "../../../scripts/lib/conventional.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");
const fixture = (name: string) => readFileSync(join(FIXTURES, name), "utf8");

test("a Conventional Commit header gives its type, scope, breaking mark and description", () => {
  assert.deepEqual(parseMessage("feat(cli)!: drop --json"), { type: "feat", scope: "cli", breaking: true, description: "drop --json" });
  assert.deepEqual(parseMessage("fix: a\n\nBREAKING CHANGE: b"), { type: "fix", breaking: true, description: "a" });
  assert.deepEqual(parseMessage("fix: a\n\nBREAKING-CHANGE: b"), { type: "fix", breaking: true, description: "a" });
  assert.deepEqual(parseMessage("Update stuff"), { subject: "Update stuff" });
  assert.deepEqual(parseMessage("Feat: capitalised types are not Conventional"), { subject: "Feat: capitalised types are not Conventional" });
});

test("R-039: the largest bump wins: breaking is major, feat minor, fix and perf patch, the rest nothing", () => {
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

test("each commit asks for one bump, and the reason is given in words", () => {
  const { commits } = parseCommits(fixture("feat-and-fix.commits.txt"));
  assert.deepEqual(commits.map(bumpOf), ["minor", "patch", "none", "patch", "patch"]);
  assert.equal(explainBump(commits), "minor: 1 feat, 3 fix or perf");
  assert.equal(explainBump(parseCommits(fixture("breaking.commits.txt")).commits), "major: 2 breaking, 1 feat");
  assert.equal(explainBump(parseCommits(fixture("chores-only.commits.txt")).commits), "none: no commit changes what a user gets");
});

test("a hash line starts a message, blank blocks are skipped, and Windows line ends are read", () => {
  assert.deepEqual(parseMessage("commit 1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d\n\nfeat: a"), { hash: "1a2b3c4", type: "feat", breaking: false, description: "a" });
  assert.deepEqual(parseMessage("fix(lite): a\r\n\r\nBREAKING CHANGE: b\r\n"), { type: "fix", scope: "lite", breaking: true, description: "a" });
  assert.deepEqual(parseMessage("feat: a", "abcdef0"), { hash: "abcdef0", type: "feat", breaking: false, description: "a" });
  assert.deepEqual(parseCommits("\n---\nfeat: a\n---\n\n---\n"), { commits: [{ type: "feat", breaking: false, description: "a" }], unconventional: [] });
  assert.deepEqual(parseMessage("fix: a\n\nNot BREAKING CHANGE: b"), { type: "fix", breaking: false, description: "a" }, "the footer starts its line");
});

test("a section with no user-facing change says so, and the version may carry build metadata", () => {
  assert.equal(changelogSection("1.0.1", "2026-11-25", parseCommits("chore: tidy").commits), "## [1.0.1] - 2026-11-25\n\nNo user-facing changes.\n");
  assert.equal(nextVersion("1.0.0+build.5", "minor"), "1.1.0");
  assert.equal(nextVersion("0.3.1", "minor"), "0.4.0");
  assert.equal(nextVersion("0.3.1", "patch"), "0.3.2");
  assert.equal(nextVersion("2.0.0-rc.2", "none"), "2.0.0-rc.2");
  assert.throws(() => nextVersion("01.2.3", "patch"), /not a SemVer version/);
  assert.throws(() => addRelease("# Changelog\n\n## [Unreleased]\n\n## [1.0.0+b] - x\n", "## [1.0.0+b] - y\n"), /already has a section for 1\.0\.0\+b/);
});
