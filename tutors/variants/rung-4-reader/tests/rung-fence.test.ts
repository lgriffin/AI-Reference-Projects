/**
 * Rung Fence: what rung 4 (Reader) may use, as an executable rule. Each failure names the rule, the
 * offending file and the rung that introduces what was added. Only a person lifts the fence
 * (AGENTS.md, "Ask a human first"); an agent that meets it changes the code, not this file.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const RUNG = "rung 4 (Reader)";
const ROOT = join(import.meta.dirname, "..");
const LIFT = 'Lifting the fence is a person\'s decision: see AGENTS.md, "Ask a human first".';

/** The workspace's own package.json files, by folder. */
const PACKAGES = ["", "packages/model", "packages/gen", "packages/lite", "apps/cli", "apps/reader"];
const READER = "apps/reader";

/** Dev tools the root package.json may add: the compiler, Node's types, and the browser for the smoke test. */
const ALLOWED_DEV = ["typescript", "@types/node", "playwright"];

/**
 * What this rung adds: the reader's build tools, each pinned to one version. RUNG.md names the same list
 * in its "Dependencies" table, and the last test below keeps the two in step.
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
  [/^(vitest|@vitest\/|@stryker-mutator\/|fast-check|@cucumber\/|@amiceli\/|@playwright\/)/, "rung 5 (Proven)"],
  [/^(dompurify|isomorphic-dompurify|sanitize-html|better-auth|@supabase\/)/, "the Summit (rung 6 Guarded sanitises by allow-list and fakes identity without a library)"],
  [/^(@changesets\/|semantic-release|release-please)/, "rung 7 (Shipped)"],
  [/^(tailwindcss|@tailwindcss\/|@skeletonlabs\/|@iconify\/|markdown-it|shiki|katex|mermaid|@marp-team\/)/, "the Summit: upstream's reader uses it, and the ladder's variants leave it out"],
];
const arrivesIn = (name: string) => LATER.find(([pattern]) => pattern.test(name))?.[1] ?? "a later rung, which names it in its RUNG.md";

/** What reader source may import: its own files, the workspace, SvelteKit's modules and Svelte. */
const READER_IMPORTS = /^(\.\.?\/|@ladder\/|#lib\/|\$app\/|svelte(\/|$)|@sveltejs\/kit$)/;
/** What every other package's source may import, as in rung 3. */
const NODE_IMPORTS = /^(node:|\.\.?\/|@ladder\/)/;

/** Things source must not do, and why. `reader: true` means the reader may: it is browser code. */
const FORBIDDEN: { pattern: RegExp; what: string; why: string; reader?: boolean }[] = [
  { pattern: /\bfetch\s*\(|XMLHttpRequest|WebSocket/, reader: true, what: "network access", why: "The tools read a folder and write files. Only the reader fetches, and only its tutors.json." },
  { pattern: /"node:(https?|http2|net|tls|dgram|dns)"/, what: "a server or a socket", why: "No rung of the tools serves or connects. The reader is a folder of files any static host serves." },
  { pattern: /"node:child_process"|"node:worker_threads"/, what: "other processes or threads", why: "The command is one process that reads files and writes files; no rung of it starts another." },
  { pattern: /<script|\bon(click|load|error)=/i, reader: true, what: "client-side JavaScript", why: "The static pages stay static. Interactive pages live in apps/reader, in Svelte." },
  { pattern: /\b(localStorage|sessionStorage|indexedDB)\b|document\.cookie/, what: "browser storage", why: "The reader keeps nothing between visits. Saved themes, sign-in and learning records arrive with identity in rung 6 (Guarded) and upstream's Supabase at the Summit." },
];

/** Source without comments, so a comment may name what the code must not do. */
const code = (file: string) =>
  readFileSync(file, "utf8").replace(/<!--[\s\S]*?-->|\/\*[\s\S]*?\*\/|(?<![:"'])\/\/.*$/gm, "");

const sourceFiles = PACKAGES.filter((dir) => dir !== "").flatMap((dir) =>
  readdirSync(join(ROOT, dir, "src"), { recursive: true, encoding: "utf8" })
    .filter((file) => /\.(ts|svelte)$/.test(file))
    .map((file) => `${dir}/src/${file.replaceAll("\\", "/")}`),
);

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
        const pinned = dir === READER && READER_DEV[name] !== undefined;
        violations.push(
          pinned
            ? `Rung Fence, ${RUNG}: ${file} declares "${name}": "${version}" in ${section}. This rung pins it to "${READER_DEV[name]}" in devDependencies (RUNG.md, Dependencies). Upgrading is a person's decision.`
            : `Rung Fence, ${RUNG}: ${file} declares "${name}" in ${section}. Rung 4 adds only the reader's build tools [${Object.keys(READER_DEV).join(", ")}], as devDependencies of apps/reader, ` +
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
    const reader = file.startsWith(`${READER}/`);
    const specifiers = [...code(join(ROOT, file)).matchAll(/(?:from|import|require)\s*\(?\s*["']([^"']+)["']/g)].map((m) => m[1]!);
    for (const specifier of specifiers.filter((s) => !(reader ? READER_IMPORTS : NODE_IMPORTS).test(s))) {
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
          "Upstream's server routes serve sign-in and learning records, which arrive with identity in rung 6 (Guarded). Move the work into a universal +page.ts.",
    ),
  );
});

test("RUNG.md names exactly the dependencies the fence allows", () => {
  const rung = readFileSync(join(ROOT, "RUNG.md"), "utf8");
  const table = rung.slice(rung.indexOf("## Dependencies"), rung.indexOf("\n## ", rung.indexOf("## Dependencies") + 1));
  const named = Object.fromEntries([...table.matchAll(/^\| `([^`]+)` \| `([^`]+)` \|/gm)].map((m) => [m[1]!, m[2]!]));
  const rootDev = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).devDependencies ?? {};
  const allowed = { ...READER_DEV, ...Object.fromEntries(ALLOWED_DEV.map((name) => [name, rootDev[name] ?? "(missing)"])) };
  assert.deepEqual(
    named,
    allowed,
    `Rung Fence, ${RUNG}: RUNG.md's "Dependencies" table and READER_DEV/ALLOWED_DEV in tests/rung-fence.test.ts disagree. A learner reads RUNG.md to see what this rung adds, so it must name every dependency the fence allows, with its version. ${LIFT}`,
  );
});
