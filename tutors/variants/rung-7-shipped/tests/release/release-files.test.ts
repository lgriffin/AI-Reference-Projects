/**
 * The release's own files agree with each other: one version, a changelog section for it, an SOP for
 * the steps. Each failure says which file to change.
 */
import { test } from "vitest";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const json = (file: string) => JSON.parse(readFileSync(join(ROOT, file), "utf8"));
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;
const version = json("package.json").version as string;

test("one SemVer version for the root and every app", () => {
  assert.match(version, SEMVER, `Version rule: package.json's version "${version}" is not SemVer (MAJOR.MINOR.PATCH, https://semver.org/).`);
  const apps = readdirSync(join(ROOT, "apps")).map((app) => `apps/${app}/package.json`);
  const drift = apps.filter((file) => json(file).version !== version).map((file) => `${file} is ${json(file).version}`);
  assert.deepEqual(
    drift,
    [],
    `Version rule: what ships carries one version, the root's (${version}), as upstream's root and apps/* share theirs. ` +
      "Change versions only with pnpm release:version --write, which sets them all.",
  );
});

test("CHANGELOG.md has a section for the version being released", () => {
  const changelog = readFileSync(join(ROOT, "CHANGELOG.md"), "utf8");
  assert.match(changelog, /^## \[Unreleased\]/m, 'Changelog rule: keep a "## [Unreleased]" heading at the top (Keep a Changelog), so the next change has a place to go.');
  assert.match(
    changelog,
    new RegExp(`^## \\[${version.replace(/\./g, "\\.")}\\] - \\d{4}-\\d{2}-\\d{2}$`, "m"),
    `Changelog rule: package.json says ${version} but CHANGELOG.md has no "## [${version}] - YYYY-MM-DD" section. A version without release notes is the gap upstream's Release Strategy was written to close (guides/Release-Strategy.md, "Problems with the Current Approach").`,
  );
  const versions = [...changelog.matchAll(/^## \[(\d[^\]]*)\]/gm)].map((m) => m[1]!);
  assert.equal(versions[0], version, `Changelog rule: the newest section (${versions[0]}) must be the version in package.json (${version}).`);
});

test("the SOP names every release command, and every command it names exists", () => {
  const sop = readFileSync(join(ROOT, "release", "SOP.md"), "utf8");
  const scripts = Object.keys(json("package.json").scripts as Record<string, string>);
  const releaseScripts = scripts.filter((s) => /^(release|container|audit):/.test(s) || s === "test:mutation" || s === "check:mutation-floors" || s === "test:e2e");
  const unnamed = releaseScripts.filter((s) => !sop.includes(`pnpm ${s}`));
  assert.deepEqual(unnamed, [], "Standard work rule: every command a release runs has a step in release/SOP.md, or nobody knows when to run it.");
  const unknown = [...sop.matchAll(/pnpm ((?:release|container|audit|test|check):[\w-]+)/g)].map((m) => m[1]!).filter((s) => !scripts.includes(s));
  assert.deepEqual(unknown, [], "Standard work rule: release/SOP.md names a command package.json does not have. Fix the SOP or add the script.");
});

test("the value stream times the steps of the SOP, by number", async () => {
  const { STEPS } = await import("../../scripts/value-stream.ts");
  const sop = readFileSync(join(ROOT, "release", "SOP.md"), "utf8");
  const scripts = Object.keys(json("package.json").scripts as Record<string, string>);
  const drift = STEPS.flatMap(({ id, sop: number, command }) => {
    const row = sop.split("\n").find((line) => line.startsWith(`| ${number} |`)) ?? "";
    return command.split(" && ").filter((c) => !row.includes(c) || !scripts.includes(c.replace(/^pnpm /, ""))).map((c) => `${id}: "${c}" is not a script named in SOP step ${number}`);
  });
  assert.deepEqual(drift, [], "Standard work rule: pnpm release:value-stream measures the standard work, so each of its steps is a command its SOP step names. Change scripts/value-stream.ts and release/SOP.md together.");
});
