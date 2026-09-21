/** Architecture: the rules of AGENTS.md, executable. If one fails, fix the code, not the test. */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, test } from "vitest";

const SRC = resolve(import.meta.dirname, "../../src");

// Each layer, and the only layers it may import. app.ts and main.ts form the composition root.
const ALLOWED_IMPORTS: Record<string, string[]> = {
  domain: [],
  config: [],
  events: ["domain"],
  repositories: ["domain"],
  services: ["domain", "events", "repositories"],
  api: ["domain", "services"],
};

// Ambient capabilities, and the one layer that may touch each.
const RESERVED: [pattern: RegExp, layer: string][] = [
  [/process\.env/, "config"],
  [/from "node:sqlite"/, "repositories"],
  [/from "fastify"/, "api"],
];

const CONSTRUCTS_COLLABORATOR = /new \w*(Repository|Service|EventBus)\(/;

const modules = readdirSync(SRC, { recursive: true, encoding: "utf8" })
  .filter((file) => file.endsWith(".ts") && !["app.ts", "main.ts"].includes(file))
  .map((file) => ({ name: file.replaceAll("\\", "/"), source: readFileSync(join(SRC, file), "utf8") }));

const layerOf = (file: string) => file.split("/")[0]!.replace(".ts", "");

function importedLayers(name: string, source: string): string[] {
  const specifiers = [...source.matchAll(/from "(\.[^"]+)"/g)].map((match) => match[1]!);
  const targets = specifiers.map((s) => relative(SRC, resolve(SRC, dirname(name), s)));
  return targets.map((target) => layerOf(target.replaceAll("\\", "/")));
}

describe.each(modules)("$name", ({ name, source }) => {
  const layer = layerOf(name);

  test("imports only from the layers beneath it", () => {
    const illegal = importedLayers(name, source).filter(
      (imported) => imported !== layer && !ALLOWED_IMPORTS[layer]!.includes(imported),
    );
    expect(illegal).toEqual([]);
  });

  test("leaves ambient capabilities to the layer that owns them", () => {
    const misplaced = RESERVED.filter(([pattern, owner]) => owner !== layer && pattern.test(source));
    expect(misplaced).toEqual([]);
  });

  test("does not construct its own collaborators", () => {
    expect(source).not.toMatch(CONSTRUCTS_COLLABORATOR);
  });
});

test("the domain is free of frameworks", () => {
  const domain = modules.filter(({ name }) => layerOf(name) === "domain");
  const packages = domain.flatMap(({ source }) => [...source.matchAll(/from "([^".][^"]*)"/g)].map((m) => m[1]!));
  expect(packages.filter((specifier) => !specifier.startsWith("node:"))).toEqual([]);
});
