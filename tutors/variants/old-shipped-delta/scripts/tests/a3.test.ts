/**
 * The readiness A3: one page, the Lean A3's sections in order, a verdict the checks decided.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { gaps, renderA3, type Readiness } from "../lib/a3.ts";
import { changelogSection } from "../release-readiness.ts";

const ready: Readiness = {
  app: "tutors-ladder",
  version: "1.1.0",
  commit: "1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d",
  date: "2026-11-25",
  changelog: "### Added\n\n- **cli:** --version",
  dirty: false,
  claims: { count: 9, problems: [] },
  slo: [{ id: "site-size", measure: "site-bytes", unit: "bytes", value: 15000, budget: 25000, ok: true, message: "ok" }],
  container: { status: "passed", reason: "every check passed" },
};

test("a ready release reads READY, with the seven A3 sections in order", () => {
  const page = renderA3(ready);
  assert.match(page, /^# Release readiness: tutors-ladder 1\.1\.0/);
  assert.match(page, /\*\*READY\.\*\* Nothing stands between this commit and a tag\./);
  const headings = [...page.matchAll(/^## (\d)\. (\w+)/gm)].map((m) => m[2]);
  assert.deepEqual(headings, ["Background", "Current", "Goal", "Root", "Countermeasures", "Plan", "Follow"]);
  assert.match(page, /\| SLO site-size \| within 24\.4 kB \| 14\.6 kB \(ok\) \|/);
  assert.match(page, /- \[ \] A person reads this page and tags `v1\.1\.0`/, "the tag stays a person's act");
});

test("every gap holds the release and gets a root cause line and a countermeasure", () => {
  const held: Readiness = {
    ...ready,
    changelog: undefined,
    dirty: true,
    claims: { count: 9, problems: ['Claim "x" names no evidence.'] },
    slo: [{ id: "site-size", measure: "site-bytes", unit: "bytes", value: 30000, budget: 25000, ok: false, message: 'SLO "site-size" exceeded' }],
    container: { status: "failed", reason: "runs as root" },
  };
  assert.deepEqual(gaps(held).map((g) => g.area), ["Changelog", "Source", "Claims", "SLO", "Container"]);
  const page = renderA3(held);
  assert.match(page, /\*\*HOLD\.\*\* 5 gap\(s\)/);
  assert.match(page, /"Human error" is not an answer; it is the prompt for the next why\./);
  assert.match(page, /\| 5 \| Container \| Fix the image/);
});

test("a container check that did not run is not a pass", () => {
  const page = renderA3({ ...ready, container: { status: "skipped", reason: "no Docker daemon" } });
  assert.match(page, /\*\*READY, with one check not run\.\*\*/);
  assert.match(page, /The container check did not run \(no Docker daemon\); that is not a pass/);
});

test("the changelog section for a version is read up to the next version", () => {
  const changelog = "# Changelog\n\n## [Unreleased]\n\n## [1.1.0] - 2026-11-25\n\n### Added\n\n- a\n\n## [1.0.0] - 2026-01-01\n\n- b\n";
  assert.equal(changelogSection(changelog, "1.1.0"), "### Added\n\n- a");
  assert.equal(changelogSection(changelog, "2.0.0"), undefined);
});
