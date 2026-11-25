/**
 * The small YAML reader, one decision at a time (R-026). It decides whether a course is private, so every
 * line of it is security logic. Added in rung 6 for the mutants that survived the first Stryker run.
 */
import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { parseSimpleYaml, readEnrollment, readProperties } from "@ladder/gen";

describe("parseSimpleYaml: values", () => {
  const CASES: [line: string, value: unknown][] = [
    ["auth: 1", 1],
    ["auth:   1  ", 1],
    ["auth: -2", -2],
    ["auth: 0.5", 0.5],
    ["auth: 12", 12],
    ["auth: 1.25", 1.25],
    ["auth: 1x", "1x"],
    ["auth: x1", "x1"],
    ["auth: 1.x", "1.x"],
    ["auth: 1.2.3", "1.2.3"],
    ["auth: true", true],
    ["auth: false", false],
    ["auth: yes", "yes"],
    ["auth: 'quoted: value'", "quoted: value"],
    ['auth: "1"', "1"],
    ["auth: it's", "it's"],
    ["auth: 'a' and 'b", "'a' and 'b"],
    ["auth: x 'a'", "x 'a'"],
    ["auth: 1 # a comment", 1],
    ["auth: 1   # a comment # twice", 1],
    ["auth: a#b", "a#b"],
    ["auth: C# rocks", "C# rocks"],
  ];
  for (const [line, value] of CASES) test(line, () => assert.deepEqual(parseSimpleYaml(`${line}\n`), { auth: value }));
});

describe("parseSimpleYaml: lines", () => {
  test("blank lines, indented blank lines and comments are skipped, whatever the line ends", () => {
    assert.deepEqual(parseSimpleYaml("# top\r\na: 1\r\n\r\n   \n  # indented comment\nb: 2\rc: 3"), { a: 1, b: 2, c: 3 });
  });
  test("a line that only ends with # is not a comment, and a key needs its colon at the start of the line", () => {
    assert.deepEqual(parseSimpleYaml("a: b #\n not: a key\nx y: z\n1a: no\n_a-b: yes\n"), { a: "b", "_a-b": "yes" });
  });
  test("a key with no value starts a list; a key with a value ends it", () => {
    assert.deepEqual(parseSimpleYaml("list:\n  - one\n  -  two words\n- 3\nother: x\n  - stray\n"), { list: ["one", "two words", 3], other: "x" });
    assert.deepEqual(parseSimpleYaml("list:   \n  - one\n"), { list: ["one"] });
  });
  test("an item must start its line with a dash and a space; text with a dash in it is not an item", () => {
    assert.deepEqual(parseSimpleYaml("list:\n  -tight\n  a - b\n  - ok\n"), { list: ["ok"] });
  });
  test("an item that is a map entry (a student record) is skipped, but a value with a colon inside is kept", () => {
    assert.deepEqual(parseSimpleYaml("list:\n  - name: Bob\n  - n: Bob\n  - a:b\n  - see: also: this\n  - x y: z\n  - : odd\n  - k:v w: x\n"), { list: ["a:b", "x y: z", ": odd", "k:v w: x"] });
  });
});

test("properties keep values and leave lists out", () => {
  assert.deepEqual(readProperties("auth: 1\nignore:\n  - x\ncredits: Ada\n"), { auth: 1, credits: "Ada" });
});

test("enrollment keeps each list only when the file holds it, as strings", () => {
  assert.deepEqual(readEnrollment("educators:\n  - ada\n"), { educators: ["ada"] });
  assert.deepEqual(readEnrollment("whitelist:\n  - bob\n  - 42\n"), { whitelist: ["bob", "42"] });
  assert.deepEqual(readEnrollment("educators: ada\n"), {});
  assert.equal("educators" in readEnrollment("whitelist:\n  - bob\n"), false);
  assert.equal("whitelist" in readEnrollment("educators:\n  - ada\n"), false);
});
