/**
 * Rung Fence: what rung 6 (Guarded) may use, as an executable rule. Each failure names the rule, the
 * offending file and the rung that introduces what was added. Only a person lifts the fence
 * (AGENTS.md, "Ask a human first"); an agent that meets it changes the code, not this file.
 *
 * Lifted from rung 3, on purpose: two packages (@ladder/identity, @ladder/rbac), and one script that may
 * start one process (scripts/supply-chain.ts runs `pnpm audit`). Still no runtime dependency: the
 * sanitiser, the policy and the checks are written here, small enough to read.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const RUNG = "rung 6 (Guarded)";
const ROOT = join(import.meta.dirname, "..");
const LIFT = 'Lifting the fence is a person\'s decision: see AGENTS.md, "Ask a human first".';

/** The workspace's own package.json files, by folder. */
const PACKAGES = ["", "packages/model", "packages/identity", "packages/rbac", "packages/gen", "packages/lite", "apps/cli"];

/** The only outside packages this rung allows: dev tools in the root package.json, never at run time. */
const ALLOWED_DEV = ["typescript", "@types/node"];

/** Where a package that is not allowed here arrives, so the failure can say which rung to climb to. */
const LATER: [pattern: RegExp, rung: string][] = [
  [/^(svelte|@sveltejs\/|vite|@vitejs\/|markdown-it|marked|remark|micromark|@marp-team\/)/, "rung 4 (Reader)"],
  [/^(vitest|@vitest\/|@stryker-mutator\/|fast-check|@cucumber\/|@amiceli\/|playwright|@playwright\/)/, "rung 5 (Proven)"],
  [/^(dompurify|isomorphic-dompurify|sanitize-html|jsdom|better-auth|@better-auth\/|@supabase\/|@auth\/|jose|jsonwebtoken)/, "the Summit (tutors-mono-repo): rung 6 renders no raw HTML, so it sanitises URLs by allow-list instead of a DOM sanitiser, and it verifies no sessions, so identity is a port with no provider"],
  [/^(@changesets\/|semantic-release|release-please)/, "rung 7 (Shipped)"],
];
const arrivesIn = (name: string) => LATER.find(([pattern]) => pattern.test(name))?.[1] ?? "a later rung, which names it in its RUNG.md";

/** Things this rung's source must not do, and why. */
const FORBIDDEN: { pattern: RegExp; what: string; why: string }[] = [
  { pattern: /\bfetch\s*\(|XMLHttpRequest|WebSocket|"node:(https?|http2|net|tls|dgram|dns)"/, what: "network access", why: "The tools read a folder and write files; they never need the network. The first network call is the reader loading tutors.json in rung 4 (Reader)." },
  { pattern: /"node:child_process"|"node:worker_threads"/, what: "other processes or threads", why: "The command is one process that reads files and writes files; no rung of it starts another. Only scripts/supply-chain.ts may start one, to run `pnpm audit`." },
  { pattern: /<script|\bon(click|load|error)=/i, what: "client-side JavaScript", why: "Rung 6 writes static pages under a CSP that allows no script at all. Interactive pages arrive with Svelte in rung 4 (Reader)." },
  { pattern: /unsafe-inline|unsafe-eval/, what: "a CSP escape hatch", why: "The policy allows the one inline style by its hash; 'unsafe-inline' or 'unsafe-eval' would let injected markup run. Update STYLE_HASH instead (packages/lite/tests/csp.test.ts prints it)." },
];

/** Source without comments, so a comment may name what the code must not do. */
const code = (file: string) => readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\/|(?<![:"'])\/\/.*$/gm, "");

const sourceFiles = [
  ...PACKAGES.filter((dir) => dir !== "").flatMap((dir) =>
    readdirSync(join(ROOT, dir, "src"), { recursive: true, encoding: "utf8" })
      .filter((file) => file.endsWith(".ts"))
      .map((file) => `${dir}/src/${file.replaceAll("\\", "/")}`),
  ),
  ...readdirSync(join(ROOT, "scripts")).filter((file) => file.endsWith(".ts")).map((file) => `scripts/${file}`),
];

/** The one lifted exception, named with its file, so it cannot spread. */
const EXCEPTIONS: Record<string, string[]> = { "scripts/supply-chain.ts": ["other processes or threads"] };

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
          `Rung Fence, ${RUNG}: ${file} declares "${name}" in ${section}. Rung 6 has no runtime dependencies: packages depend only on each other ("@ladder/...": "workspace:*"), ` +
            `and the root may add only the dev tools [${ALLOWED_DEV.join(", ")}]. "${name}" arrives in ${arrivesIn(name)}. Write it with Node's built-ins, in the layer it belongs to.`,
        );
      }
    }
  }
  check(violations);
});

test("source imports only node: built-ins, relative files and @ladder packages", () => {
  const violations: string[] = [];
  for (const file of sourceFiles) {
    const specifiers = [...code(join(ROOT, file)).matchAll(/(?:from|import|require)\s*\(?\s*["']([^"']+)["']/g)].map((m) => m[1]!);
    for (const specifier of specifiers.filter((s) => !/^(node:|\.\.?\/|@ladder\/)/.test(s))) {
      violations.push(
        `Rung Fence, ${RUNG}: ${file} imports "${specifier}". Rung 6 may import only node: built-ins, relative files and the workspace's own @ladder packages. ` +
          `"${specifier}" arrives in ${arrivesIn(specifier)}.`,
      );
    }
  }
  check(violations);
});

test("source does nothing a later rung introduces", () => {
  const violations: string[] = [];
  for (const file of sourceFiles) {
    const source = code(join(ROOT, file));
    for (const { pattern, what, why } of FORBIDDEN) {
      if (EXCEPTIONS[file]?.includes(what)) continue;
      const found = source.match(pattern)?.[0];
      if (found) violations.push(`Rung Fence, ${RUNG}: ${file} uses ${what} ("${found}"). ${why} Remove it from this rung.`);
    }
  }
  check(violations);
});

test("the workspace holds exactly the packages this rung allows", () => {
  const found = ["packages", "apps"].flatMap((dir) => readdirSync(join(ROOT, dir)).map((name) => `${dir}/${name}`)).sort();
  const allowed = PACKAGES.filter((dir) => dir !== "").sort();
  const extra = found.filter((dir) => !allowed.includes(dir));
  if (extra.length > 0) {
    assert.fail(
      `Rung Fence, ${RUNG}: ${extra.join(", ")} ${extra.length === 1 ? "is a package" : "are packages"} this rung does not have. Rung 6 adds identity and rbac to rung 3's ` +
        "model, gen, lite and cli. A reader app arrives in rung 4 (Reader); a release pipeline in rung 7 (Shipped).\n\n" + LIFT,
    );
  }
});
