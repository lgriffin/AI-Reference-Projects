/**
 * Architecture: the rules of AGENTS.md, executable. If one fails, fix the code, not the test.
 * Each failure message names the rule, the offender and the fix.
 */

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
  [/console\./, "events"], // side effects (logs, mail, audit) belong to event handlers
];

// Constructs that make a decision. Routes translate between HTTP and a service call; they decide nothing.
const DECISION = /\b(if|for|while|switch|try|throw)\b|\.(filter|find|some|every|reduce)\(/;

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
    expect(illegal, `${layer} may import only [${ALLOWED_IMPORTS[layer]}]; move the code to a layer that may (AGENTS.md, "Where things go")`).toEqual([]);
  });

  test("leaves ambient capabilities to the layer that owns them", () => {
    const misplaced = RESERVED.filter(([pattern, owner]) => owner !== layer && pattern.test(source)).map(
      ([pattern, owner]) => `${pattern} belongs in ${owner}`,
    );
    expect(misplaced, "move that work into the owning layer; reach it through a constructor argument or a domain event").toEqual([]);
  });

  test("does not construct its own collaborators", () => {
    expect(source, "only app.ts constructs collaborators; take it as a constructor argument").not.toMatch(CONSTRUCTS_COLLABORATOR);
  });
});

test("the domain is free of frameworks", () => {
  const domain = modules.filter(({ name }) => layerOf(name) === "domain");
  const packages = domain.flatMap(({ source }) => [...source.matchAll(/from "([^".][^"]*)"/g)].map((m) => m[1]!));
  const frameworks = packages.filter((specifier) => !specifier.startsWith("node:"));
  expect(frameworks, "the domain may use only node: built-ins; move that code outward").toEqual([]);
});

test.each(modules.filter(({ name }) => name.endsWith("-routes.ts")))("$name decides nothing", ({ source }) => {
  const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ""); // comments may name what routes must not do
  const decision = code.match(DECISION)?.[0];
  expect(decision, "routes translate; put the rule on the entity if it concerns one task, otherwise in the service").toBeUndefined();
});
