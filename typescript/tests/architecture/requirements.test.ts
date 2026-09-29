/** Requirements: every rule in REQUIREMENTS.md has a scenario, and every scenario cites a rule. */

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, test } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");
const ID = /\bR-[A-Z]+-\d+\b/g;

const read = (folder: string) =>
  readdirSync(join(ROOT, "tests", folder))
    .filter((file) => file.endsWith(".test.ts"))
    .map((file) => ({ name: `${folder}/${file}`, source: readFileSync(join(ROOT, "tests", folder, file), "utf8") }));

// Scenarios describe the board's behaviour; the contract and architecture tests check machinery.
const scenarios = [...read("unit"), ...read("api")];

test("every requirement has a scenario, and every citation is a requirement", () => {
  const required = new Set(readFileSync(join(ROOT, "REQUIREMENTS.md"), "utf8").match(ID));
  const cited = new Set([...scenarios, ...read("integration")].flatMap(({ source }) => source.match(ID) ?? []));
  expect([...required].filter((id) => !cited.has(id)), "add a test whose title opens with each id").toEqual([]);
  expect([...cited].filter((id) => !required.has(id)), "state the rule in REQUIREMENTS.md first").toEqual([]);
});

test.each(scenarios)("$name: every scenario cites a requirement", ({ source }) => {
  const titles = [...source.matchAll(/\btest\("([^"]*)"/g)].map((match) => match[1]!);
  const uncited = titles.filter((title) => !/^R-[A-Z]+-\d+/.test(title));
  expect(uncited, 'open each title with the ids it covers, then given / when / then, e.g. "R-WIP-1: given a full board, ..."').toEqual([]);
});
