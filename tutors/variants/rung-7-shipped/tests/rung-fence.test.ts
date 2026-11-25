/**
 * Rung Fence: what rung 7 (Shipped) may use, as an executable rule. Each failure names the rule, the
 * offending file and the rung that introduces what was added. Only a person lifts the fence
 * (AGENTS.md, "Ask a human first"); an agent that meets it changes the code, not this file.
 *
 * Rung 6 added no dependency: two packages (identity, rbac), one script that may start one process
 * (scripts/supply-chain.ts, for `pnpm audit`), and one rule: nothing weakens a CSP. All of that stands.
 *
 * Rung 7 lifts the fence in three places, each named in RUNG.md, and all of them outside the product:
 *   - the root may add the dev dependency `yaml`, which the release scripts and the release tests use to
 *     read release/claims.yaml, release/slo.yaml and the CI workflow. No package or app may import it;
 *   - the release scripts named in RELEASE_SCRIPTS may start a process (the command, git, docker, pnpm);
 *   - one of them, scripts/container-smoke.ts, may use fetch, to ask the container it started on 127.0.0.1.
 * And it adds one rule: no script tags, pushes or publishes. That is a person's act (release/SOP.md).
 * The packages, the command and the reader stay as rung 6 left them.
 */
import { test } from "vitest";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const RUNG = "rung 7 (Shipped)";
const ROOT = join(import.meta.dirname, "..");
const LIFT = 'Lifting the fence is a person\'s decision: see AGENTS.md, "Ask a human first".';

/** The workspace's own package.json files, by folder. */
const PACKAGES = ["", "packages/model", "packages/identity", "packages/rbac", "packages/gen", "packages/lite", "apps/cli", "apps/reader"];
const READER = "apps/reader";

/**
 * Dev tools the root package.json may add. Rung 3 allowed the first two; rung 4 (Proven) added the test
 * tools; rung 5 (Reader) added playwright, the library that drives Chromium for `pnpm test:e2e`. Rung 6 added
 * none. Rung 7 (Shipped) adds yaml, for the release scripts and the release tests.
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
  "yaml", // reads release/claims.yaml, release/slo.yaml and the CI workflow; a dev tool of scripts/ and tests/ only
];

/** The one package a release script may import besides node: built-ins and its own files, and where: never scripts/checks. */
const SCRIPT_IMPORTS = ["yaml"];
const mayImportYaml = (file: string) => file.startsWith("scripts/") && !file.startsWith("scripts/checks/");

/**
 * The release scripts, and why each starts a process. They judge the workspace from outside, as CI does
 * (the Scripts rule in tests/architecture/release.test.ts), so they run its commands instead of importing its code.
 */
const RELEASE_SCRIPTS: Record<string, string> = {
  "scripts/lib/measure.ts": "runs the command on the fixture, to measure the build",
  "scripts/release-version.ts": "runs git log, to read the commits since the last release",
  "scripts/release-readiness.ts": "runs git status and the supply-chain audit, to lay their answers on the A3",
  "scripts/container-smoke.ts": "runs docker, to build the image and start the container",
  "scripts/value-stream.ts": "runs each step of the SOP, to time it",
};

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
  [/^(helmet|jsonwebtoken|jose|passport|lucia|next-auth|@auth\/|bcrypt|argon2|js-yaml)\b/, "the Summit: rung 6 writes its policy, its session port and its small YAML reader by hand, so each can be read in one sitting"],
  [
    /^(@changesets\/|semantic-release|@semantic-release\/|release-please|conventional-changelog|@commitlint\/|standard-version|release-it)/,
    "the Summit, if ever: rung 7 derives versions and checks claims with its own short scripts (scripts/), so a learner can read every step. Adopting a release tool is a decision for a real repository",
  ],
  [/^(@actions\/|@octokit\/|dockerode|testcontainers|execa|zx|shelljs|simple-git)/, "no rung: the release scripts start git, docker and pnpm with node:child_process, which is enough to read in one sitting"],
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
  { pattern: /\b(localStorage|sessionStorage|indexedDB)\b|document\.cookie/, what: "browser storage", why: "The reader keeps nothing between visits: the session is a port with no sign-in behind it (rung 6). Saved themes, real sign-in (Better Auth) and learning records (Supabase) arrive at the Summit." },
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

/** The lifted exceptions, each named with its file, so none can spread: the audit runs `pnpm audit`, and the release scripts run what RELEASE_SCRIPTS says. */
const EXCEPTIONS: Record<string, string[]> = {
  "scripts/supply-chain.ts": ["other processes or threads"],
  ...Object.fromEntries(Object.keys(RELEASE_SCRIPTS).map((file) => [file, ["other processes or threads"]])),
  // The smoke check asks the container it started, on 127.0.0.1, for /version.json. No other script goes near the network.
  "scripts/container-smoke.ts": ["other processes or threads", "network access"],
};

/** What no script may do, whatever else it is allowed. */
const SCRIPT_FORBIDDEN: { pattern: RegExp; what: string; why: string }[] = [
  {
    pattern: /["'`](push|tag)["'`]|\bgit\s+(push|tag)\b/,
    what: "git push or git tag",
    why: "Tagging and pushing a release is a person's act (release/SOP.md, step 10: the Human Boundary). A script prints the command; a person runs it.",
  },
  {
    pattern: /\bdocker\s+(push|login)\b|["'`]login["'`]|\b(npm|pnpm|jsr|deno)\s+publish\b|\bgh\s+release\b|["'`]publish["'`]/,
    what: "publishing",
    why: "Rung 7 builds an image and proves it; it pushes nothing to a registry and creates no release. Publishing, signing and promotion arrive at the Summit (upstream image-build.yml, scripts/promote-image.ts), and a person starts them.",
  },
];

/**
 * Every module specifier in a source text: static imports and re-exports, bare imports, dynamic import() and
 * require(). Anchored to statements, because the release scripts hold words such as "--from" in strings.
 */
const importsOf = (source: string) =>
  [...source.matchAll(/^\s*(?:import|export)\b[^;"'`]*?\bfrom\s*["']([^"']+)["']|^\s*import\s*["']([^"']+)["']|\b(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/gm)].map((m) => (m[1] ?? m[2] ?? m[3])!);

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
            : `Rung Fence, ${RUNG}: ${file} declares "${name}" in ${section}. Rung 7 adds one dev tool to the root, yaml, for its release scripts; rung 5 added only the reader's build tools [${Object.keys(READER_DEV).join(", ")}], as devDependencies of apps/reader, ` +
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
    const specifiers = importsOf(code(join(ROOT, file)));
    for (const specifier of specifiers.filter((s) => !(reader ? READER_IMPORTS : NODE_IMPORTS).test(s))) {
      if (SCRIPT_IMPORTS.includes(specifier)) {
        if (mayImportYaml(file)) continue;
        violations.push(
          `Rung Fence, ${RUNG}: ${file} imports "${specifier}". It is a dev tool of the release scripts (scripts/, but not scripts/checks) and the tests, for release/*.yaml and the CI workflow. ` +
            "A course's settings are read by gen's own small reader (packages/gen/src/settings.ts), so nothing a learner runs needs a YAML library. A full YAML parser in the product arrives at the Summit.",
        );
        continue;
      }
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
      if (found) {
        const release = file.startsWith("scripts/") && what === "other processes or threads";
        violations.push(
          `Rung Fence, ${RUNG}: ${file} uses ${what} ("${found}"). ${why} ` +
            (release ? `Only the release scripts named in RELEASE_SCRIPTS start a process, each for one reason: [${Object.keys(RELEASE_SCRIPTS).join(", ")}]. Put pure logic in scripts/lib, and ask a person before adding a script to that list.` : "Remove it from this rung."),
        );
      }
    }
  }
  check(violations);
});

test("no script tags, pushes or publishes", () => {
  const violations: string[] = [];
  for (const file of sourceFiles.filter((f) => f.startsWith("scripts/"))) {
    const source = code(join(ROOT, file));
    for (const { pattern, what, why } of SCRIPT_FORBIDDEN) {
      const found = source.match(pattern)?.[0];
      if (found) violations.push(`Rung Fence, ${RUNG}: ${file} uses ${what} (${found}). ${why}`);
    }
  }
  check(violations);
});

test("every release script that may start a process exists, and says why", () => {
  const missing = Object.keys(RELEASE_SCRIPTS).filter((file) => !sourceFiles.includes(file));
  assert.deepEqual(missing, [], `Rung Fence, ${RUNG}: RELEASE_SCRIPTS names a script that is gone. Remove its entry, so the exception cannot be picked up by a new file of the same name. ${LIFT}`);
});

test("the reader has no server code", () => {
  const server = sourceFiles.filter((file) => file.startsWith(`${READER}/`) && /(\+server|\.server)\.ts$/.test(file));
  check(
    server.map(
      (file) =>
        `Rung Fence, ${RUNG}: ${file} is server code. The reader is a static build (adapter-static, ssr = false): every load runs in the browser. ` +
          "Upstream's server routes serve sign-in and learning records, which arrive at the Summit; the session is a port with no server behind it (rung 6). Move the work into a universal +page.ts.",
    ),
  );
});

test("the workspace holds exactly the packages this rung allows", () => {
  const found = ["packages", "apps"].flatMap((dir) => readdirSync(join(ROOT, dir)).map((name) => `${dir}/${name}`)).sort();
  const extra = found.filter((dir) => !PACKAGES.includes(dir));
  if (extra.length > 0) {
    assert.fail(
      `Rung Fence, ${RUNG}: ${extra.join(", ")} ${extra.length === 1 ? "is a package" : "are packages"} this rung does not have. Rung 7 adds no package: it releases rung 6's ` +
        `model, identity, rbac, gen, lite, cli and reader, with release tools in scripts/ and release/. A server, a database, a real identity provider and the release harness arrive at the Summit.\n\n${LIFT}`,
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
