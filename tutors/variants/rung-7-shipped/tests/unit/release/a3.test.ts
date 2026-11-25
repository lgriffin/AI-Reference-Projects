/**
 * The readiness A3: one page, the Lean A3's sections in order, a verdict the checks decided.
 */
import { test } from "vitest";
import assert from "node:assert/strict";
import { changelogBody, gaps, renderA3, unproven, verdict, type Readiness } from "../../../scripts/lib/a3.ts";

const ready: Readiness = {
  app: "tutors-ladder",
  version: "1.1.0",
  commit: "1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d",
  date: "2026-11-25",
  changelog: "### Added\n\n- **cli:** --version",
  dirty: false,
  claims: { count: 14, problems: [] },
  slo: [{ id: "site-size", measure: "site-bytes", unit: "bytes", value: 15000, budget: 25000, ok: true, message: "ok" }],
  supplyChain: { findings: [] },
  mutation: { status: "passed", reason: "every file holds its floor", score: 94.213 },
  container: { status: "passed", reason: "every check passed" },
};

test("R-042: a ready release reads READY, with the seven A3 sections in order", () => {
  const page = renderA3(ready);
  assert.match(page, /^# Release readiness: tutors-ladder 1\.1\.0/);
  assert.match(page, /\*\*READY\.\*\* Nothing stands between this commit and a tag\./);
  const headings = [...page.matchAll(/^## (\d)\. (\w+)/gm)].map((m) => m[2]);
  assert.deepEqual(headings, ["Background", "Current", "Goal", "Root", "Countermeasures", "Plan", "Follow"]);
  assert.match(page, /\| SLO site-size \| within 24\.4 kB \| 14\.6 kB \(ok\) \|/);
  assert.match(page, /\| Mutation \| every file holds its floor \| passed, 94\.21% of mutants killed \|/);
  assert.match(page, /\| Supply chain \| registry sources, a lockfile, allowances in date \| 0 finding\(s\) \|/);
  assert.doesNotMatch(page, /\| Lead time \|/, "no lead time until the value stream was measured for this commit");
  assert.equal(page.match(/- \[x\]/g)?.length, 6, "every step a machine can check is ticked");
  assert.match(page, /## 4\. Root cause analysis\n\nNo gap to analyse\.\n\n## 5\. Countermeasures\n\nNone needed\./);
  assert.match(page, /- \[ \] A person reads this page and tags `v1\.1\.0`/, "the tag stays a person's act");
});

test("R-042: every gap holds the release and gets a root cause line and a countermeasure", () => {
  const held: Readiness = {
    ...ready,
    changelog: undefined,
    dirty: true,
    claims: { count: 14, problems: ['Claim "x" names no evidence.'] },
    slo: [{ id: "site-size", measure: "site-bytes", unit: "bytes", value: 30000, budget: 25000, ok: false, message: 'SLO "site-size" exceeded' }],
    supplyChain: { findings: ["non-registry-source: package.json asks for \"x\" at \"github:evil/x\""] },
    mutation: { status: "failed", reason: "below-floor: scripts/lib/slo.ts 80% < floor 90%", score: 88 },
    container: { status: "failed", reason: "runs as root" },
  };
  assert.deepEqual(gaps(held).map((g) => g.area), ["Changelog", "Source", "Claims", "SLO", "Supply chain", "Mutation", "Container"]);
  const page = renderA3(held);
  assert.match(page, /\*\*HOLD\.\*\* 7 gap\(s\)/);
  assert.equal(verdict(held), "HOLD");
  assert.doesNotMatch(page, /- \[x\]/, "nothing is ticked");
  assert.match(page, /\| Changelog \| a section for 1\.1\.0 \| missing \|/);
  assert.match(page, /\| Source \| committed \| uncommitted changes \|/);
  assert.match(page, /\| SLO site-size \| within 24\.4 kB \| 29\.3 kB \(over\) \|/);
  assert.match(page, /6\. \*\*Mutation\.\*\* below-floor: scripts\/lib\/slo\.ts/);
  assert.match(page, /"Human error" is not an answer; it is the prompt for the next why\./);
  assert.match(page, /\| 7 \| Container \| Fix the image/);
});

test("R-042: a check that did not run is not a pass, and not a gap", () => {
  const skipped: Readiness = { ...ready, container: { status: "skipped", reason: "no Docker daemon" } };
  const page = renderA3(skipped);
  assert.match(page, /\*\*READY, with one check not run\.\*\*/);
  assert.match(page, /The container check did not run \(no Docker daemon\); that is not a pass/);
  assert.deepEqual(gaps(skipped), []);
  assert.match(page, /- \[ \] Container smoke passed/);
  const neither: Readiness = { ...skipped, mutation: { status: "not run", reason: "no reports/mutation/mutation.json" } };
  assert.equal(verdict(neither), "READY, with 2 checks not run");
  assert.deepEqual(unproven(neither).map((n) => n.area), ["Mutation", "Container"]);
  assert.match(renderA3(neither), /\| Mutation \| every file holds its floor \| not run \|/);
  assert.equal(verdict({ ...neither, dirty: true }), "HOLD", "a gap outranks a check that did not run");
  assert.deepEqual(unproven(ready), []);
});

test("what cannot be judged is said, not guessed", () => {
  const page = renderA3({ ...ready, dirty: "unknown", slo: { error: "release/slo.yaml is not valid" }, leadTime: "1 min 05 s (100% flow efficiency)" });
  assert.match(page, /\| Source \| committed \| unknown \(no git\) \|/);
  assert.match(page, /\| SLO \| a valid release\/slo\.yaml \| not judged \|/);
  assert.match(page, /\*\*HOLD\.\*\* 1 gap\(s\)/);
  assert.match(page, /- \[ \] Every SLO within budget/);
  assert.match(page, /\| Lead time \| measured, and no longer than last release \| 1 min 05 s \(100% flow efficiency\) \|/);
  const unmeasured = renderA3({ ...ready, slo: [{ id: "reader-size", measure: "reader-bytes", unit: "bytes", value: Number.NaN, budget: 1000, ok: false, message: "not judged" }] });
  assert.match(unmeasured, /\| SLO reader-size \| within 1000 B \| not measured  \|/);
});

test("the changelog section for a version is read up to the next version", () => {
  const changelog = "# Changelog\n\n## [Unreleased]\n\n## [1.1.0] - 2026-11-25\n\n### Added\n\n- a\n\n## [1.0.0] - 2026-01-01\n\n- b\n";
  assert.equal(changelogBody(changelog, "1.1.0"), "### Added\n\n- a");
  assert.equal(changelogBody(changelog, "2.0.0"), undefined);
  assert.equal(changelogBody(changelog, "1.0.0"), "- b", "the last section runs to the end");
  assert.equal(changelogBody("## [1.0.0] - x\n\n## [0.9.0] - y\n", "1.0.0"), undefined, "an empty section is no section");
});

test("the page says exactly what it was given, and no more", () => {
  const page = renderA3({ ...ready, changelog: "\n### Added\n\n- **cli:** --version\n\n" });
  assert.match(page, /A3 for commit `1a2b3c4d5e6f`, 2026-11-25\./);
  assert.match(page, /it is not value we can name\.\n\n### Added\n\n- \*\*cli:\*\* --version\n\n## 2\. Current condition/);
  const rows = (text: string) => text.slice(text.indexOf("## 2."), text.indexOf("## 3.")).split("\n").filter((line) => line.startsWith("| "));
  assert.equal(rows(page).length, 2 + 7, "a header, a rule, and one row per check: changelog, source, claims, one SLO, supply chain, mutation, container");
  assert.equal(rows(renderA3({ ...ready, leadTime: "1 min" })).length, 2 + 8);
  assert.equal(rows(renderA3({ ...ready, slo: { error: "bad file" } })).length, 2 + 7, "an SLO file that cannot be judged is one row");
  assert.match(renderA3({ ...ready, changelog: undefined }), /name\.\n\n_No section for 1\.1\.0 in CHANGELOG\.md\._\n\n## 2\./);
  const mixed = renderA3({ ...ready, slo: [...(ready.slo as []), { id: "reader-size", measure: "reader-bytes", unit: "bytes", value: 2000, budget: 1000, ok: false, message: "over" }] });
  assert.match(mixed, /- \[ \] Every SLO within budget/, "one objective over budget leaves the box unticked");
  assert.deepEqual(unproven({ ...ready, mutation: { status: "failed", reason: "below" }, container: { status: "failed", reason: "root" } }), [], "a failed check is a gap, not a check that did not run");
});

test("a changelog section is found by its heading at the start of a line, wherever the file ends", () => {
  const changelog = "# Changelog\nAll notable changes.\n\n## [1.1.0] - 2026-11-25\n\n- write headings as ## [x.y.z]\n- a\n\n## [1.0.0] - 2026-01-01\n\n- b";
  assert.equal(changelogBody(changelog, "1.1.0"), "- write headings as ## [x.y.z]\n- a");
  assert.equal(changelogBody(changelog, "1.0.0"), "- b");
  assert.equal(changelogBody(changelog, "9.9.9"), undefined);
});
