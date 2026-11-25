/**
 * Release architecture: where the release tools stand, executable. Rung 7 adds no layer to the product; it
 * adds tools at the edge that judge the product from outside. Every failure names the rule, the offending
 * file and the fix (Teaching Failure).
 */
import { test } from "vitest";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { ROOT } from "../support/paths.ts";

/** Source without comments, so a comment may name what the code must not do. */
const stripComments = (text: string) => text.replace(/<!--[\s\S]*?-->|\/\*[\s\S]*?\*\/|(?<![:"'])\/\/.*$/gm, "");
const specifiers = (source: string) => [...source.matchAll(/(?:from|import)\s*\(?\s*"([^"]+)"/g)].map((match) => match[1]!);

const sourcesIn = (dir: string) =>
  readdirSync(join(ROOT, dir), { recursive: true, encoding: "utf8" })
    .map((file) => `${dir}/${file.replaceAll("\\", "/")}`)
    .filter((file) => /\.(ts|svelte)$/.test(file) && !/\/(node_modules|\.svelte-kit|build)\//.test(file))
    .map((file) => ({ file, source: stripComments(readFileSync(join(ROOT, file), "utf8")) }));

const scripts = sourcesIn("scripts");
const product = [...readdirSync(join(ROOT, "packages")).map((name) => `packages/${name}/src`), "apps/cli/src", "apps/reader/src"].flatMap(sourcesIn);

function none(found: string[], rule: string) {
  if (found.length > 0) assert.fail(`${rule}\n  ${found.join("\n  ")}`);
}

test("scripts judge the workspace from outside: they never import a package or an app", () => {
  const reaches = scripts.flatMap(({ file, source }) =>
    specifiers(source)
      .filter((s) => s.startsWith("@ladder/") || (s.startsWith(".") && relative(join(ROOT, "scripts"), resolve(ROOT, dirname(file), s)).startsWith("..")))
      .map((s) => `${file} imports "${s}"`),
  );
  none(
    reaches,
    "Scripts rule: a release script judges the workspace from outside, as CI does. It runs the command (node apps/cli/src/main.ts, see scripts/lib/measure.ts) and reads files; " +
      "it never imports a package or an app, so a check cannot share a bug with the code it checks, and the packages never grow a release concern.",
  );
});

test("nothing in the packages or the apps imports a script", () => {
  none(
    product.filter(({ source }) => specifiers(source).some((s) => /(^|\/)scripts\//.test(s))).map(({ file }) => file),
    "Scripts rule: release scripts depend on the workspace, never the other way round. Move what you need into the layer that owns it.",
  );
});

test("release logic is pure: scripts/lib touches no process, no clock and no network, except the one module that measures", () => {
  const impure: [pattern: RegExp, what: string][] = [
    [/from "node:child_process"/, "starts a process"],
    [/\bfetch\(/, "uses the network"],
    [/\bnew Date\(|Date\.now\(/, "reads the clock"],
    [/\bprocess\.(env|argv|exit|stdout|stderr|cwd)\b/, "reads or writes the process"],
    [/from "node:fs"/, "reads or writes files"],
  ];
  // measure.ts runs the command and reads what it wrote; cli.ts is how a script finds out it is the main module and sets its exit code.
  const EDGE = ["scripts/lib/measure.ts", "scripts/lib/cli.ts"];
  const found = scripts
    .filter(({ file }) => file.startsWith("scripts/lib/") && !EDGE.includes(file))
    .flatMap(({ file, source }) => impure.filter(([pattern]) => pattern.test(source)).map(([, what]) => `${file} ${what}`));
  none(
    found,
    "Pure release logic rule: the judgements of a release (the next version, a claim's problems, a budget, the A3, the image's facts, the value stream's arithmetic) live in scripts/lib as pure functions, " +
      "so a scenario can state them, a unit test can pin them and Stryker can mutate them. Read files, the clock, git and docker in the script beside it (scripts/*.ts) and hand the answers in.",
  );
});

test("the build identity is read from the environment in one file", () => {
  const readers = [...product, ...scripts].filter(({ source }) => /\b(GIT_SHA|BUILD_DATE)\b/.test(source)).map(({ file }) => file);
  assert.deepEqual(
    readers.sort(),
    ["apps/cli/src/build-identity.ts", "scripts/lib/smoke.ts"],
    "Build identity rule: GIT_SHA and BUILD_DATE are read in apps/cli/src/build-identity.ts and nowhere else in the product, and lite receives the result as a BuildIdentity value. " +
      "One reader means one place to look when version.json is wrong (upstream: packages/svelte/utils/runtime/src/version.ts). " +
      "scripts/lib/smoke.ts is the one writer: it passes GIT_SHA to docker build. " +
      "(This is not rung 6's Identity rule, which keeps packages/identity free of imports: that one is about who a reader is, this one about which build this is.)",
  );
});

test("lite takes the build identity as a value and never looks for it", () => {
  const lite = product.filter(({ file }) => file.startsWith("packages/lite/src/"));
  none(
    lite.filter(({ source }) => /\bprocess\b|\.git\b|package\.json/.test(source)).map(({ file }) => file),
    "Build identity rule: packages/lite turns a BuildIdentity into version.json and a line of text. It never reads the environment, git or a package.json: apps/cli/src/build-identity.ts finds the values and hands them in (the Port rule, from rung 3).",
  );
});
