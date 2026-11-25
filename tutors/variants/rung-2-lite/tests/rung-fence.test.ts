/**
 * Rung Fence: what rung 2 (Lite) may use, as an executable rule. Each failure names the rule, the
 * offending file and the rung that introduces what was added. Only a person lifts the fence
 * (AGENTS.md, "Ask a human first"); an agent that meets it changes the code, not this file.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const RUNG = "rung 2 (Lite)";
const ROOT = join(import.meta.dirname, "..");
const LIFT = 'Lifting the fence is a person\'s decision: see AGENTS.md, "Ask a human first".';

/** Dependencies this rung allows, by package.json section. Rung 2, like rung 1, runs on Node alone. */
const ALLOWED: Record<string, string[]> = { dependencies: [], devDependencies: [], peerDependencies: [], optionalDependencies: [] };

/** Things this rung's source must not do, and the rung that introduces each. */
const FORBIDDEN: { pattern: RegExp; what: string; why: string }[] = [
  { pattern: /\bfetch\s*\(|XMLHttpRequest|WebSocket|"node:(https?|http2|net|tls|dgram|dns)"/, what: "network access", why: "The generator reads a folder and writes a file; it never needs the network. The first network call is the reader loading tutors.json in rung 4 (Reader)." },
  { pattern: /"node:child_process"|"node:worker_threads"/, what: "other processes or threads", why: "The generator is one process that reads files and writes one; no rung of it starts another." },
  { pattern: /<script|\bon(click|load|error)=/i, what: "client-side JavaScript", why: "Rung 2 writes static pages. Interactive pages arrive with Svelte in rung 4 (Reader)." },
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".ts"))
    .map((file) => join(dir, file));
}

/** Source without comments, so a comment may name what the code must not do. */
const code = (file: string) => readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\/|(?<![:"'])\/\/.*$/gm, "");
const shortName = (file: string) => file.slice(ROOT.length + 1).replaceAll("\\", "/");

function check(violations: string[]) {
  if (violations.length > 0) assert.fail(`${violations.join("\n\n")}\n\n${LIFT}`);
}

test("package.json declares only the dependencies this rung allows", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  const violations: string[] = [];
  for (const section of [...Object.keys(ALLOWED), "bundleDependencies", "bundledDependencies"]) {
    for (const name of Object.keys(pkg[section] ?? {})) {
      if (ALLOWED[section]?.includes(name)) continue;
      violations.push(
        `Rung Fence, ${RUNG}: package.json declares "${name}" in ${section}. Rung 2 has no dependencies and needs no install. ` +
          "Its Markdown renderer is the small one in src/markdown.ts on purpose: a full Markdown library arrives in rung 4 (Reader), " +
          "TypeScript as a dev dependency in rung 3 (Layers), and URL sanitising by allow-list in rung 6 (Guarded). Extend src/markdown.ts instead.",
      );
    }
  }
  check(violations);
});

test("src imports only node: built-ins and relative files", () => {
  const violations: string[] = [];
  for (const file of sourceFiles(join(ROOT, "src"))) {
    const specifiers = [...code(file).matchAll(/(?:from|import|require)\s*\(?\s*["']([^"']+)["']/g)].map((m) => m[1]!);
    for (const specifier of specifiers.filter((s) => !s.startsWith("node:") && !s.startsWith("./") && !s.startsWith("../"))) {
      violations.push(
        `Rung Fence, ${RUNG}: ${shortName(file)} imports "${specifier}". Rung 2 may import only node: built-ins (node:fs, node:path) and relative files. ` +
          "Workspace packages arrive in rung 3 (Layers) and npm packages in rung 4 (Reader). Write it with a node: built-in, or as a small function in src/.",
      );
    }
  }
  check(violations);
});

test("src does nothing a later rung introduces", () => {
  const violations: string[] = [];
  for (const file of sourceFiles(join(ROOT, "src"))) {
    const source = code(file);
    for (const { pattern, what, why } of FORBIDDEN) {
      const found = source.match(pattern)?.[0];
      if (found) violations.push(`Rung Fence, ${RUNG}: ${shortName(file)} uses ${what} ("${found}"). ${why} Remove it from this rung.`);
    }
  }
  check(violations);
});
