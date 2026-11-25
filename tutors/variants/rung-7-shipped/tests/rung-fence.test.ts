/**
 * Rung Fence: what rung 6 (Guarded) may use, as an executable rule. Each failure names the rule, the
 * offending file and the rung that introduces what was added. Only a person lifts the fence
 * (AGENTS.md, "Ask a human first"); an agent that meets it changes the code, not this file.
 *
 * Rung 6 adds no dependency at all: its defences are written with the language and Node's built-ins, so a
 * learner can read every line of them. What it adds is two packages (identity, rbac), one script that may
 * start one process (scripts/supply-chain.ts, for `pnpm audit`), and one rule: nothing weakens a CSP.
 */
import { test } from "vitest";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const RUNG = "rung 6 (Guarded)";
const ROOT = join(import.meta.dirname, "..");
const LIFT = 'Lifting the fence is a person\'s decision: see AGENTS.md, "Ask a human first".';

/** The workspace's own package.json files, by folder. */
const PACKAGES = ["", "packages/model", "packages/identity", "packages/rbac", "packages/gen", "packages/lite", "apps/cli", "apps/reader"];
const READER = "apps/reader";

/**
 * Dev tools the root package.json may add. Rung 3 allowed the first two; rung 4 (Proven) added the test
 * tools; rung 5 (Reader) added playwright, the library that drives Chromium for `pnpm test:e2e`. Rung 6 adds none.
 */
const ALLOWED_DEV = [
  "typescript",
  "@types/node",
  "vitest", // the runner, as upstream; Stryker's vitest-runner needs it
  "@amiceli/vitest-cucumber", // Gherkin features bound to vitest, as upstream tests/bdd
  "fast-check", // property-based tests, as upstream tests/fuzz
  "@stryker-mutator/core", // mutation testing, as upstream stryker.config.json
  "@stryker-mutator/vitest-runner",
  "playwright", // the browser for the smoke test; the library, not upstream's @playwright/test runner
];

/** Test tools: allowed in tests, never in a package's dependencies and never imported by source. */
const TEST_TOOLS = /^(vitest|@vitest\/|@amiceli\/|fast-check|@stryker-mutator\/|playwright$)/;

/**
 * What rung 5 added, unchanged here: the reader's build tools, each pinned to one version, as devDependencies of
 * apps/reader. RUNG.md names the same list in its "Dependencies" table, and the last test keeps the two in step.
 */
const READER_DEV: Record<string, string> = {
  "@sveltejs/adapter-static": "4.0.1",
  "@sveltejs/kit": "3.1.1",
  "@sveltejs/vite-plugin-svelte": "7.3.0",
  svelte: "5.57.2",
  "svelte-check": "4.7.6",
  vite: "8.3.5",
};

/** Where a package that is not allowed here arrives, so the failure can say which rung to climb to. */
const LATER: [pattern: RegExp, rung: string][] = [
  [/^(@playwright\/|@axe-core\/)/, "the Summit (upstream's Playwright runner and axe checks in apps/reader/tests/e2e; rung 5 drives Chromium with the playwright library)"],
  [/^(@cucumber\/|jest|mocha|ava|tap)/, "no rung: rung 4 (Proven) chose vitest and @amiceli/vitest-cucumber, as upstream does"],
  [/^(dompurify|isomorphic-dompurify|sanitize-html|better-auth|@supabase\/)/, "the Summit: upstream sanitises with DOMPurify, signs in with Better Auth and stores in Supabase; rung 6 sanitises by allow-list (packages/lite/src/url.ts) and stands in for identity with a port (packages/identity), so it needs no library"],
  [/^(helmet|jsonwebtoken|jose|passport|lucia|next-auth|@auth\/|bcrypt|argon2|js-yaml|yaml)\b/, "the Summit: rung 6 writes its policy, its session port and its small YAML reader by hand, so each can be read in one sitting"],
  [/^(@changesets\/|semantic-release|release-please)/, "rung 7 (Shipped)"],
  [/^(tailwindcss|@tailwindcss\/|@skeletonlabs\/|@iconify\/|markdown-it|marked|remark|micromark|shiki|katex|mermaid|@marp-team\/)/, "the Summit: upstream's reader uses it, and the ladder's variants leave it out"],
];
const arrivesIn = (name: string) => LATER.find(([pattern]) => pattern.test(name))?.[1] ?? "a later rung, which names it in its RUNG.md";

/** What reader source may import: its own files, the workspace, SvelteKit's modules and Svelte. */
const READER_IMPORTS = /^(\.\.?\/|@ladder\/|#lib\/|\$app\/|svelte(\/|$)|@sveltejs\/kit$)/;
/** What every other package's source may import, as in rungs 3 and 4. */
const NODE_IMPORTS = /^(node:|\.\.?\/|@ladder\/)/;

/** Things source must not do, and why. `reader: true` means the reader may: it is browser code. */
const FORBIDDEN: { pattern: RegExp; what: string; why: string; reader?: boolean }[] = [
  { pattern: /\bfetch\s*\(|XMLHttpRequest|WebSocket/, reader: true, what: "network access", why: "The tools read a folder and write files. Only the reader fetches, and only its tutors.json." },
  { pattern: /"node:(https?|http2|net|tls|dgram|dns)"/, what: "a server or a socket", why: "No rung of the tools serves or connects. The reader is a folder of files any static host serves." },
  { pattern: /"node:child_process"|"node:worker_threads"/, what: "other processes or threads", why: "The command is one process that reads files and writes files; no rung of it starts another." },
  { pattern: /<script|\bon(click|load|error)=/i, reader: true, what: "client-side JavaScript", why: "The static pages stay static. Interactive pages live in apps/reader, in Svelte." },
  { pattern: /\b(localStorage|sessionStorage|indexedDB)\b|document\.cookie/, what: "browser storage", why: "The reader keeps nothing between visits: rung 6's session is a port with no sign-in behind it. Saved themes, real sign-in (Better Auth) and learning records (Supabase) arrive at the Summit." },
  {
    pattern: /unsafe-inline|unsafe-eval/,
    what: "a CSP escape hatch",
    why: "Both policies allow inline code only by hash: the site's one style (STYLE_HASH; tests/unit/lite/csp.test.ts prints the new hash when STYLE changes), the reader's start-up script (SvelteKit hashes it) and the one style attribute of SvelteKit's announcer (ANNOUNCER_STYLE_HASH in apps/reader/csp.ts). 'unsafe-inline' or 'unsafe-eval' would let injected markup run.",
  },
];

/** Source without comments, so a comment may name what the code must not do. */
const code = (file: string) => readFileSync(file, "utf8").replace(/<!--[\s\S]*?-->|\/\*[\s\S]*?\*\/|(?<![:"'])\/\/.*$/gm, "");

const sourceFiles = [
  ...PACKAGES.filter((dir) => dir !== "").flatMap((dir) =>
    readdirSync(join(ROOT, dir, "src"), { recursive: true, encoding: "utf8" })
      .filter((file) => /\.(ts|svelte)$/.test(file))
      .map((file) => `${dir}/src/${file.replaceAll("\\", "/")}`),
  ),
  // The reader's build configuration and the repository's scripts are source too: a CSP can be weakened in either.
  `${READER}/csp.ts`,
  `${READER}/vite.config.ts`,
  ...readdirSync(join(ROOT, "scripts"), { recursive: true, encoding: "utf8" }).filter((file) => file.endsWith(".ts")).map((file) => `scripts/${file.replaceAll("\\", "/")}`),
];

/** The one lifted exception, named with its file, so it cannot spread: the audit runs `pnpm audit`. */
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
        const readerTool = dir === READER && section === "devDependencies" && READER_DEV[name] === version;
        if (workspace || devTool || readerTool) continue;
        if (ALLOWED_DEV.includes(name)) {
          violations.push(
            `Rung Fence, ${RUNG}: ${file} declares the dev tool "${name}" in ${section}. The test tools and the browser are dev dependencies of the root package.json only: ` +
              "tests run them, and nothing that runs the command or builds the reader may need them. Move it to the root devDependencies.",
          );
          continue;
        }
        const pinned = dir === READER && READER_DEV[name] !== undefined;
        violations.push(
          pinned
            ? `Rung Fence, ${RUNG}: ${file} declares "${name}": "${version}" in ${section}. This rung pins it to "${READER_DEV[name]}" in devDependencies (RUNG.md, Dependencies). Upgrading is a person's decision.`
            : `Rung Fence, ${RUNG}: ${file} declares "${name}" in ${section}. Rung 6 adds no dependency; rung 5 added only the reader's build tools [${Object.keys(READER_DEV).join(", ")}], as devDependencies of apps/reader, ` +
                `and the root may add only [${ALLOWED_DEV.join(", ")}]. Packages depend on each other as "workspace:*". "${name}" arrives in ${arrivesIn(name)}.`,
        );
      }
    }
  }
  check(violations);
});

test("source imports only what its package may", () => {
  const violations: string[] = [];
  for (const file of sourceFiles) {
    const reader = file.startsWith(`${READER}/src/`);
    if (file === `${READER}/vite.config.ts`) continue; // build configuration imports the build tools RUNG.md names
    const specifiers = [...code(join(ROOT, file)).matchAll(/(?:from|import|require)\s*\(?\s*["']([^"']+)["']/g)].map((m) => m[1]!);
    for (const specifier of specifiers.filter((s) => !(reader ? READER_IMPORTS : NODE_IMPORTS).test(s))) {
      if (TEST_TOOLS.test(specifier)) {
        violations.push(
          `Rung Fence, ${RUNG}: ${file} imports the test tool "${specifier}". Source never imports a test tool; tests import the source. ` +
            "Put the test under tests/ (see tests/TESTING.md for the tier).",
        );
        continue;
      }
      violations.push(
        reader
          ? `Rung Fence, ${RUNG}: ${file} imports "${specifier}". The reader may import its own files (relative or #lib/), @ladder packages, $app/ modules, svelte and @sveltejs/kit. ` +
            (specifier.startsWith("node:")
              ? "No rung adds node: to the reader: it runs in a browser. Do Node work at build time, in apps/cli."
              : `"${specifier}" arrives in ${arrivesIn(specifier)}.`)
          : `Rung Fence, ${RUNG}: ${file} imports "${specifier}". This package may import only node: built-ins, relative files and the workspace's own @ladder packages. "${specifier}" arrives in ${arrivesIn(specifier)}.`,
      );
    }
  }
  check(violations);
});

test("source does nothing a later rung introduces", () => {
  const violations: string[] = [];
  for (const file of sourceFiles) {
    const source = code(join(ROOT, file));
    for (const { pattern, what, why, reader } of FORBIDDEN) {
      if (reader && file.startsWith(`${READER}/`)) continue;
      if (EXCEPTIONS[file]?.includes(what)) continue;
      const found = source.match(pattern)?.[0];
      if (found) violations.push(`Rung Fence, ${RUNG}: ${file} uses ${what} ("${found}"). ${why} Remove it from this rung.`);
    }
  }
  check(violations);
});

test("the reader has no server code", () => {
  const server = sourceFiles.filter((file) => file.startsWith(`${READER}/`) && /(\+server|\.server)\.ts$/.test(file));
  check(
    server.map(
      (file) =>
        `Rung Fence, ${RUNG}: ${file} is server code. The reader is a static build (adapter-static, ssr = false): every load runs in the browser. ` +
          "Upstream's server routes serve sign-in and learning records, which arrive at the Summit; rung 6's session is a port with no server behind it. Move the work into a universal +page.ts.",
    ),
  );
});

test("the workspace holds exactly the packages this rung allows", () => {
  const found = ["packages", "apps"].flatMap((dir) => readdirSync(join(ROOT, dir)).map((name) => `${dir}/${name}`)).sort();
  const extra = found.filter((dir) => !PACKAGES.includes(dir));
  if (extra.length > 0) {
    assert.fail(
      `Rung Fence, ${RUNG}: ${extra.join(", ")} ${extra.length === 1 ? "is a package" : "are packages"} this rung does not have. Rung 6 adds identity and rbac to rung 5's ` +
        `model, gen, lite, cli and reader. A release pipeline, a container and CI arrive in rung 7 (Shipped); a server, a database and a real identity provider at the Summit.\n\n${LIFT}`,
    );
  }
});

test("RUNG.md names exactly the dependencies the fence allows", () => {
  const rung = readFileSync(join(ROOT, "RUNG.md"), "utf8");
  const start = rung.indexOf("## Dependencies");
  const table = rung.slice(start, rung.indexOf("\n## ", start + 1));
  const named = Object.fromEntries([...table.matchAll(/^\| `([^`]+)` \| `([^`]+)` \|/gm)].map((m) => [m[1]!, m[2]!]));
  const rootDev = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).devDependencies ?? {};
  const allowed = { ...READER_DEV, ...Object.fromEntries(ALLOWED_DEV.map((name) => [name, rootDev[name] ?? "(missing)"])) };
  assert.deepEqual(
    named,
    allowed,
    `Rung Fence, ${RUNG}: RUNG.md's "Dependencies" table and READER_DEV/ALLOWED_DEV in tests/rung-fence.test.ts disagree. A learner reads RUNG.md to see what this rung adds, so it must name every dependency the fence allows, with its version. ${LIFT}`,
  );
});
