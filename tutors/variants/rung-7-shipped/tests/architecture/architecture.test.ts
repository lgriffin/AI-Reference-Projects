/**
 * Architecture: the layering of README.md ("Architecture"), executable. If a rule fails, fix the code,
 * not the test. Every failure names the rule, the offending file and the fix (Teaching Failure).
 * The rules read source text, like the house style in typescript/tests/architecture.
 */
import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");

/** Each layer, where it lives, the only workspace packages it may import, and why. */
const LAYERS: Record<string, { dir: string; may: string[]; job: string }> = {
  "@ladder/model": { dir: "packages/model", may: [], job: "model is the shared vocabulary of types; it depends on nothing, so every layer can depend on it" },
  "@ladder/identity": { dir: "packages/identity", may: [], job: "identity is the verified-actor contract; like upstream's, it depends on nothing, so any edge can implement it" },
  "@ladder/rbac": { dir: "packages/rbac", may: ["@ladder/model", "@ladder/identity"], job: "rbac is a pure policy over a course's settings and an actor; it only needs their types" },
  "@ladder/gen": { dir: "packages/gen", may: ["@ladder/model"], job: "gen turns a course folder into a Course; it knows nothing of HTML or the command line" },
  "@ladder/lite": { dir: "packages/lite", may: ["@ladder/model"], job: "lite turns a Course into HTML; it never reads a course folder, so it can render any tutors.json" },
  "@ladder/cli": { dir: "apps/cli", may: ["@ladder/model", "@ladder/gen", "@ladder/lite", "@ladder/identity", "@ladder/rbac"], job: "cli is the composition root that wires adapters to packages" },
  "@ladder/reader": {
    dir: "apps/reader",
    may: ["@ladder/model", "@ladder/lite", "@ladder/identity", "@ladder/rbac"],
    job: "reader is browser code that renders any tutors.json and asks the policy who may see it; the course is built before the reader runs (pnpm course, through apps/cli), so gen and node: never reach the browser",
  },
};

/** The platform: only the composition root may touch it. Everything else is handed in through a port. */
const PLATFORM = /from "node:[^"]+"|\bprocess\.|\bconsole\.|\bfetch\(|\brequire\(|\bDeno\./;
/** The reader runs in a browser: Node's platform is not there to touch. (fetch is; the Loader rule says where.) */
const NODE_PLATFORM = /from "node:[^"]+"|\bprocess\.|\bconsole\.|\brequire\(|\bDeno\./;

type Module = { layer: string; file: string; source: string };

/** Source without comments, so a comment may name what the code must not do. */
const stripComments = (text: string) => text.replace(/<!--[\s\S]*?-->|\/\*[\s\S]*?\*\/|(?<![:"'])\/\/.*$/gm, "");

const modules: Module[] = Object.entries(LAYERS).flatMap(([layer, { dir }]) =>
  readdirSync(join(ROOT, dir, "src"), { recursive: true, encoding: "utf8" })
    .filter((file) => /\.(ts|svelte)$/.test(file))
    .map((file) => ({ layer, file: `${dir}/src/${file.replaceAll("\\", "/")}`, source: stripComments(readFileSync(join(ROOT, dir, "src", file), "utf8")) })),
);

const specifiers = (source: string) => [...source.matchAll(/(?:from|import)\s*\(?\s*"([^"]+)"/g)].map((match) => match[1]!);
const workspaceImports = (source: string) => specifiers(source).filter((s) => s.startsWith("@ladder/"));

function none(found: string[], rule: string) {
  if (found.length > 0) assert.fail(`${rule}\n  ${found.join("\n  ")}`);
}

for (const { layer, file, source } of modules) {
  const { dir, may, job } = LAYERS[layer]!;
  describe(file, () => {
    test("imports only the workspace packages beneath it", () => {
      const illegal = workspaceImports(source).filter((imported) => imported !== layer && !may.includes(imported));
      none(
        illegal.map((imported) => `${file} imports ${imported}`),
        `Layering rule: ${layer} may import only [${may.join(", ")}], because ${job}. ` +
          "Move the code to a layer that may make this import, or take what you need as an argument; apps/cli wires the layers together (README.md, Architecture).",
      );
    });

    test("reaches other files only inside its own package", () => {
      const escapes = specifiers(source)
        .filter((s) => s.startsWith("."))
        .filter((s) => !relative(join(ROOT, dir, "src"), resolve(join(ROOT, dirname(file)), s)).match(/^[^.]/));
      none(
        escapes.map((s) => `${file} imports "${s}"`),
        `Package boundary rule: a relative import may not leave ${dir}/src. Import another package by its name (@ladder/...) through its index.ts, and only if the layering rule allows it.`,
      );
    });

    if (layer === "@ladder/reader") {
      test("runs in the browser, without Node", () => {
        const found = source.match(new RegExp(NODE_PLATFORM, "g")) ?? [];
        none(
          found.map((use) => `${file} uses ${use}`),
          "Browser rule: apps/reader/src is shipped to the browser, where node: modules, process, require and Deno do not exist, and the console is not how a page talks to a learner. " +
            "Work that needs Node belongs at build time: in apps/cli, which `pnpm course` runs to write static/courses/<id>/tutors.json.",
        );
      });
    } else if (layer !== "@ladder/cli") {
      test("leaves the platform to the composition root", () => {
        const found = source.match(new RegExp(PLATFORM, "g")) ?? [];
        none(
          found.map((use) => `${file} uses ${use}`),
          `Port rule: only apps/cli touches node: modules, process, the console or the network. ${layer.slice(8)} receives the world through ports: ` +
            "gen reads files through FileSystemPort (its `fs` argument) and reports through BuildOptions.warn; lite returns pages as data for apps/cli to write. " +
            "The package's tsconfig.json has no Node types, so tsc rejects this too.",
        );
      });
    }
  });
}

test("model holds types only and imports nothing", () => {
  const runtime = modules
    .filter(({ layer }) => layer === "@ladder/model")
    .flatMap(({ file, source }) => [...source.matchAll(/^\s*(import\b.*|export\s+(?!type\b|interface\b).*)$/gm)].map((m) => `${file}: ${m[1]!.trim()}`));
  none(
    runtime,
    "Model rule: packages/model holds only `export type` and `export interface`, and imports nothing, so it adds no code and no dependency to any layer. " +
      "Put functions and constants in the layer that uses them (preOrder and folderKinds live in gen).",
  );
});

test("each package.json declares exactly the workspace packages its source imports", () => {
  const drift: string[] = [];
  for (const [layer, { dir }] of Object.entries(LAYERS)) {
    const declared = Object.keys(JSON.parse(readFileSync(join(ROOT, dir, "package.json"), "utf8")).dependencies ?? {}).filter((p) => p.startsWith("@ladder/")).sort();
    const imported = [...new Set(modules.filter((m) => m.layer === layer).flatMap((m) => workspaceImports(m.source)))].filter((p) => p !== layer).sort();
    if (declared.join() !== imported.join()) drift.push(`${dir}/package.json declares [${declared.join(", ")}] but its src imports [${imported.join(", ")}]`);
  }
  none(drift, "Closure rule: a package's dependencies are exactly what its source imports. Add the missing dependency as \"workspace:*\", or remove the unused one, then run pnpm install.");
});

test("every FileSystemPort adapter runs the port contract", () => {
  const contract = readFileSync(join(ROOT, "tests/contract/file-system-port.contract.test.ts"), "utf8");
  const adapters = modules.flatMap(({ source, file }) => [...source.matchAll(/class (\w+) implements FileSystemPort/g)].map((m) => ({ name: m[1]!, file })));
  assert.ok(adapters.length >= 2, "expected NodeFileSystem and MemoryFileSystem to implement FileSystemPort");
  none(
    adapters.filter(({ name }) => !contract.includes(`["${name}",`)).map(({ name, file }) => `${name} (${file})`),
    "Honest Double rule: every FileSystemPort adapter runs the same contract, so a test double cannot drift from the real thing. " +
      "Add the adapter to ADAPTERS in tests/contract/file-system-port.contract.test.ts.",
  );
});

test("identity imports nothing outside itself", () => {
  const outside = modules
    .filter(({ layer }) => layer === "@ladder/identity")
    .flatMap(({ file, source }) => specifiers(source).filter((s) => !s.startsWith("./")).map((s) => `${file} imports "${s}"`));
  none(
    outside,
    "Identity rule (upstream .dependency-cruiser.cjs, identity-contracts-self-contained): packages/identity holds the verified-actor contract and imports " +
      "no framework, database, auth provider or other package, not even @ladder/model. A provider (Better Auth upstream) belongs in an adapter at the edge, " +
      "in apps/, that implements SessionPort; course roles belong in packages/rbac.",
  );
});

/** What a pure policy may not do: reach the world, keep state, wait, or read the clock or chance. */
const IMPURE: [pattern: RegExp, what: string][] = [
  [/\basync\b|\bawait\b|\bPromise\b/, "waits on something (async, await, Promise)"],
  [/\bDate\b|\bperformance\.|Math\.random/, "reads the clock or chance"],
  [/^(export\s+)?(let|var)\s/m, "keeps module state (a top-level let or var)"],
  [/\bclass\s/, "defines a class, which invites state"],
  [/\bglobalThis\b|\bwindow\b|\bdocument\b|\blocalStorage\b/, "touches a global"],
  [/^import (?!type\b)/m, "imports a value, not only a type"],
];

test("rbac is a pure policy", () => {
  const found = modules
    .filter(({ layer }) => layer === "@ladder/rbac")
    .flatMap(({ file, source }) => IMPURE.filter(([pattern]) => pattern.test(source)).map(([, what]) => `${file} ${what}`));
  none(
    found,
    "Purity rule: packages/rbac answers who may do what from its arguments alone: no I/O, no clock, no state, no async, and `import type` only. " +
      "Then a table of cases is the whole truth about it (tests/unit/rbac/policy.test.ts). Fetch the actor or the settings in apps/cli or the reader's course service " +
      "and pass them in; upstream keeps the same split between permissions.ts (pure) and rbac-service.svelte.ts (state).",
  );
});

test("every FileSystemPort adapter guards its paths with containedPath", () => {
  const unguarded = modules
    .filter(({ source }) => /class \w+ implements FileSystemPort/.test(source))
    .filter(({ source }) => !/containedPath\(/.test(source))
    .map(({ file }) => file);
  none(
    unguarded,
    "Containment rule: an adapter is where a path meets the real files, so it is where a path is checked. Call containedPath(path) from @ladder/gen " +
      "on every path before touching storage, and refuse links that lead outside (see apps/cli/src/node-file-system.ts). " +
      "The containment cases in tests/contract/file-system-port.contract.test.ts then run against it.",
  );
});

test("every SessionPort adapter runs the session contract", () => {
  const contract = readFileSync(join(ROOT, "tests/contract/session-port.contract.test.ts"), "utf8");
  const adapters = modules.flatMap(({ source, file }) => [...source.matchAll(/class (\w+) implements SessionPort/g)].map((m) => ({ name: m[1]!, file })));
  assert.ok(adapters.length >= 2, "expected AnonymousSession and FakeSession to implement SessionPort");
  none(
    adapters.filter(({ name }) => !contract.includes(`["${name}",`)).map(({ name, file }) => `${name} (${file})`),
    "Honest Double rule: every SessionPort adapter runs the same contract, so a fake identity cannot claim more than a real one. " +
      "Add the adapter to ADAPTERS in tests/contract/session-port.contract.test.ts.",
  );
});

test("every course URL the site writes passes safeUrl", () => {
  const lite = modules.filter(({ layer }) => layer === "@ladder/lite");
  const unguarded = lite
    .filter(({ file }) => !file.endsWith("/url.ts"))
    .flatMap(({ file, source }) =>
      [...source.matchAll(/(?:href|src)="\$\{([^}]+)\}"/g)]
        .map((m) => m[1]!.trim())
        // A page's own links (dir, fileOf, home, up) are built by lite from folder names; an address from a course is anything else.
        .filter((expression) => !/^(escapeHtml\(safe\)|url|dir|home|up|fileOf\(.*\))/.test(expression))
        .map((expression) => `${file} writes \${${expression}} into an href or src`),
    );
  none(
    unguarded,
    "Sanitising rule: escaping keeps text from becoming markup, but an escaped javascript: address still runs when clicked. Every address that comes from a course " +
      "passes safeUrl (packages/lite/src/url.ts) first: `const url = safeUrl(lo.route, \"link\")`, then write `url`, or the text alone when it is null (R-022).",
  );
});
