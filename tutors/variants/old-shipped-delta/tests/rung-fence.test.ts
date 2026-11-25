/**
 * Rung Fence: what rung 7 (Shipped) may use, as an executable rule. Each failure names the rule, the
 * offending file and the rung that introduces what was added. Only a person lifts the fence
 * (AGENTS.md, "Ask a human first"); an agent that meets it changes the code, not this file.
 *
 * Rung 7 starts from rung 3 and lifts the fence in three places, each named in RUNG.md:
 *   - the root may add the dev dependency `yaml`, to read release/claims.yaml and release/slo.yaml;
 *   - release scripts in scripts/ may use any node: built-in, including node:child_process (git, docker);
 *   - one script, scripts/container-smoke.ts, may use fetch, to ask the container it started on 127.0.0.1.
 * The packages and the cli stay as rung 3 left them: no runtime dependency, no network, no process.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const RUNG = "rung 7 (Shipped)";
const ROOT = join(import.meta.dirname, "..");
const LIFT = 'Lifting the fence is a person\'s decision: see AGENTS.md, "Ask a human first".';

/** The workspace's own package.json files, by folder. */
const PACKAGES = ["", "packages/model", "packages/gen", "packages/lite", "apps/cli"];

/** The only outside packages this rung allows: dev tools in the root package.json, never at run time. */
const ALLOWED_DEV = ["typescript", "@types/node", "yaml"];

/** What the release scripts may import besides node: built-ins and their own relative files. */
const SCRIPT_IMPORTS = ["yaml"];

/** The one script that may use the network, and why. */
const NETWORK_ALLOWED: Record<string, string> = {
  "scripts/container-smoke.ts": "it asks the container it started, on 127.0.0.1, for /version.json",
};

/** Where a package that is not allowed here arrives, so the failure can say which rung to climb to. */
const LATER: [pattern: RegExp, rung: string][] = [
  [/^(svelte|@sveltejs\/|vite|@vitejs\/|markdown-it|marked|remark|micromark|@marp-team\/)/, "rung 4 (Reader)"],
  [/^(vitest|@vitest\/|@stryker-mutator\/|fast-check|@cucumber\/|@amiceli\/|playwright|@playwright\/)/, "rung 5 (Proven)"],
  [/^(dompurify|isomorphic-dompurify|sanitize-html|better-auth|@supabase\/)/, "the Summit (rung 6 Guarded sanitises by allow-list and fakes identity without a library)"],
  [
    /^(@changesets\/|semantic-release|@semantic-release\/|release-please|conventional-changelog|@commitlint\/|standard-version|js-yaml)/,
    "the Summit, if ever: rung 7 derives versions and checks claims with its own short scripts (scripts/), so a learner can read every step. Adopting a release tool is a decision for a real repository",
  ],
];
const arrivesIn = (name: string) => LATER.find(([pattern]) => pattern.test(name))?.[1] ?? "a later rung, which names it in its RUNG.md";

/** Things the packages and the cli must not do, and why. */
const FORBIDDEN: { pattern: RegExp; what: string; why: string }[] = [
  { pattern: /\bfetch\s*\(|XMLHttpRequest|WebSocket|"node:(https?|http2|net|tls|dgram|dns)"/, what: "network access", why: "The tools read a folder and write files; they never need the network. The first network call is the reader loading tutors.json in rung 4 (Reader)." },
  { pattern: /"node:child_process"|"node:worker_threads"/, what: "other processes or threads", why: "The command is one process that reads files and writes files. It reads the git commit as files (apps/cli/src/build-identity.ts); running git or docker belongs to the release scripts in scripts/." },
  { pattern: /<script|\bon(click|load|error)=/i, what: "client-side JavaScript", why: "Rung 7 ships static pages and promises it (release/claims.yaml, no-script). Interactive pages arrive with Svelte in rung 4 (Reader)." },
];

/** What the release scripts must not do: everything else in node: is theirs. */
const SCRIPT_FORBIDDEN: { pattern: RegExp; what: string; why: string }[] = [
  { pattern: /\bfetch\s*\(|XMLHttpRequest|WebSocket|"node:(https?|http2|net|tls|dgram|dns)"/, what: "network access", why: "A release check judges this checkout, so it must give the same answer offline. Only the container smoke may talk to the container it started." },
  { pattern: /\bgit\b["']?\s*,\s*\[\s*["'](push|tag)["']|git (push|tag) /, what: "git push or git tag", why: "Tagging and pushing a release is a person's act (release/SOP.md, step 8: the Human Boundary). A script prints the command; a person runs it." },
];

/** Source without comments, so a comment may name what the code must not do. */
const code = (file: string) => readFileSync(join(ROOT, file), "utf8").replace(/\/\*[\s\S]*?\*\/|(?<![:"'])\/\/.*$/gm, "");

const tsFiles = (dir: string) =>
  readdirSync(join(ROOT, dir), { recursive: true, encoding: "utf8" })
    .map((file) => file.replaceAll("\\", "/"))
    .filter((file) => file.endsWith(".ts"))
    .map((file) => `${dir}/${file}`);

const sourceFiles = PACKAGES.filter((dir) => dir !== "").flatMap((dir) => tsFiles(`${dir}/src`));
const scriptFiles = tsFiles("scripts").filter((file) => !file.startsWith("scripts/tests/"));

/** Every module specifier: static imports and re-exports, bare imports, dynamic import() and require(). */
const importsOf = (file: string) =>
  [...code(file).matchAll(/^\s*(?:import|export)\b[^;"'`]*?\bfrom\s*["']([^"']+)["']|^\s*import\s*["']([^"']+)["']|\b(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/gm)].map((m) => (m[1] ?? m[2] ?? m[3])!);

function check(violations: string[]) {
  if (violations.length > 0) assert.fail(`${violations.join("\n\n")}\n\n${LIFT}`);
}

test("no package.json declares a dependency this rung does not allow", () => {
  const violations: string[] = [];
  for (const dir of PACKAGES) {
    const file = `${dir === "" ? "" : `${dir}/`}package.json`;
    const pkg = JSON.parse(readFileSync(join(ROOT, file), "utf8"));
    for (const section of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies", "bundleDependencies", "bundledDependencies"]) {
      for (const [name, version] of Object.entries<string>(pkg[section] ?? {})) {
        const workspace = name.startsWith("@ladder/") && version === "workspace:*" && section === "dependencies";
        const devTool = dir === "" && section === "devDependencies" && ALLOWED_DEV.includes(name);
        if (workspace || devTool) continue;
        violations.push(
          `Rung Fence, ${RUNG}: ${file} declares "${name}" in ${section}. Rung 7 has no runtime dependencies: packages depend only on each other ("@ladder/...": "workspace:*"), ` +
            `and the root may add only the dev tools [${ALLOWED_DEV.join(", ")}]. "${name}" arrives in ${arrivesIn(name)}.`,
        );
      }
    }
  }
  check(violations);
});

test("source imports only node: built-ins, relative files and @ladder packages", () => {
  const violations = sourceFiles.flatMap((file) =>
    importsOf(file)
      .filter((s) => !/^(node:|\.\.?\/|@ladder\/)/.test(s))
      .map((s) => `Rung Fence, ${RUNG}: ${file} imports "${s}". The packages and the cli may import only node: built-ins, relative files and the workspace's own @ladder packages. "${s}" arrives in ${arrivesIn(s)}.`),
  );
  check(violations);
});

test("source does nothing a later rung introduces", () => {
  const violations: string[] = [];
  for (const file of sourceFiles) {
    const source = code(file);
    for (const { pattern, what, why } of FORBIDDEN) {
      const found = source.match(pattern)?.[0];
      if (found) violations.push(`Rung Fence, ${RUNG}: ${file} uses ${what} ("${found}"). ${why} Remove it from this rung.`);
    }
  }
  check(violations);
});

test("release scripts import only node: built-ins, their own files and yaml", () => {
  const violations = scriptFiles.flatMap((file) =>
    importsOf(file)
      .filter((s) => !s.startsWith("node:") && !SCRIPT_IMPORTS.includes(s) && !s.startsWith(".") && !s.startsWith("@ladder/"))
      .map((s) => `Rung Fence, ${RUNG}: ${file} imports "${s}". Release scripts may import node: built-ins, their own files and [${SCRIPT_IMPORTS.join(", ")}]. "${s}" arrives in ${arrivesIn(s)}.`),
  );
  check(violations);
});

test("release scripts stay offline and never tag or push", () => {
  const violations: string[] = [];
  for (const file of scriptFiles) {
    const source = code(file);
    for (const { pattern, what, why } of SCRIPT_FORBIDDEN) {
      if (what === "network access" && file in NETWORK_ALLOWED) continue;
      const found = source.match(pattern)?.[0];
      if (found) violations.push(`Rung Fence, ${RUNG}: ${file} uses ${what} ("${found}"). ${why}`);
    }
  }
  check(violations);
});
