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
  "@ladder/gen": { dir: "packages/gen", may: ["@ladder/model"], job: "gen turns a course folder into a Course; it knows nothing of HTML or the command line" },
  "@ladder/lite": { dir: "packages/lite", may: ["@ladder/model"], job: "lite turns a Course into HTML; it never reads a course folder, so it can render any tutors.json" },
  "@ladder/cli": { dir: "apps/cli", may: ["@ladder/model", "@ladder/gen", "@ladder/lite"], job: "cli is the composition root that wires adapters to packages" },
};

/** The platform: only the composition root may touch it. Everything else is handed in through a port. */
const PLATFORM = /from "node:[^"]+"|\bprocess\.|\bconsole\.|\bfetch\(|\brequire\(|\bDeno\./;

type Module = { layer: string; file: string; source: string };

/** Source without comments, so a comment may name what the code must not do. */
const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\/|(?<![:"'])\/\/.*$/gm, "");

const modules: Module[] = Object.entries(LAYERS).flatMap(([layer, { dir }]) =>
  readdirSync(join(ROOT, dir, "src"), { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".ts"))
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

    if (layer !== "@ladder/cli") {
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
