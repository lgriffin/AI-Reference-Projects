/**
 * EARS audit and Requirement Closure Check. REQUIREMENTS.md states each rule once, with an id; the
 * `Rule:` blocks in tests/bdd/features repeat the sentence and prove it with scenarios. This check keeps
 * the two closed over each other, and every sentence in EARS form:
 *
 *   - every requirement has a Rule with at least one scenario, and every Rule cites one requirement;
 *   - a Rule's title is its requirement's sentence, word for word, and its @ears- tag is its pattern;
 *   - every scenario sits under a Rule, and every feature is loaded by a steps file;
 *   - every test that cites an id (in a title, "R-008: ...") cites one that exists;
 *   - each sentence has one "shall", a known system before it, the opening its pattern needs, no vague
 *     words, and a layer that matches its system.
 *
 *   node scripts/checks/ears-audit.ts            # every finding; exit 1 if there are any
 *   node scripts/checks/ears-audit.ts --next-id  # the next free id
 *
 * Mirrors upstream scripts/checks/ears-audit.ts (pnpm test:ears:audit), which audits @rule-NNNN tags in
 * the same way, and the house style of typescript/tests/architecture/requirements.test.ts. The logic is
 * pure functions; tests/suite-health/requirements.test.ts runs them on negative fixtures, then on this repo.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { parseGherkin } from "./lib/gherkin.ts";
import type { GherkinDocument } from "./lib/gherkin.ts";

export const ID = /\bR-\d{3}\b/g;
const ID_TAG = /^@R-\d{3}$/;

/** EARS patterns, as REQUIREMENTS.md names them, with the tag and the opening word each takes. */
export const PATTERNS: Record<string, { tag: string; opening: RegExp; form: string }> = {
  Ubiquitous: { tag: "@ears-ubiquitous", opening: /^The\b/, form: "The <system> shall <response>." },
  "Event-driven": { tag: "@ears-event-driven", opening: /^When\b[^,]*,/, form: "When <trigger>, the <system> shall <response>." },
  "State-driven": { tag: "@ears-state-driven", opening: /^While\b[^,]*,/, form: "While <state>, the <system> shall <response>." },
  Optional: { tag: "@ears-optional", opening: /^Where\b[^,]*,/, form: "Where <feature is included>, the <system> shall <response>." },
  "Unwanted behaviour": { tag: "@ears-unwanted", opening: /^If\b[^]*,\s*then\b/, form: "If <condition>, then the <system> shall <response>." },
};

/** The systems a requirement may name before "shall", and the layer each lives in. */
export const SYSTEMS: Record<string, string> = {
  "the generator": "gen",
  "the site": "lite",
  "the command": "cli",
  "the reader": "reader",
  // Rung 6 (Guarded): the RBAC policy in packages/rbac, and the supply-chain audit in scripts/supply-chain.ts.
  "the policy": "rbac",
  "the audit": "scripts",
};

export const VAGUE = ["appropriate", "appropriately", "adequate", "as needed", "correctly", "easily", "efficient", "efficiently", "etc", "fast", "handle", "handles", "if possible", "properly", "quickly", "robust", "seamlessly", "several", "some", "user-friendly", "various"];

export type Requirement = { id: string; pattern: string; text: string; layer: string; line: number };
export type Finding = { code: string; where: string; message: string };
export type Feature = { file: string; doc: GherkinDocument };
export type Source = { file: string; text: string };

/** The rows of REQUIREMENTS.md's table: | R-001 | Pattern | Sentence | Layer |. */
export function parseRequirements(markdown: string): Requirement[] {
  return markdown.split("\n").flatMap((row, index) => {
    const cells = row.split("|").map((cell) => cell.trim());
    if (!/^R-\d{3}$/.test(cells[1] ?? "")) return [];
    return [{ id: cells[1]!, pattern: cells[2] ?? "", text: cells[3] ?? "", layer: cells[4] ?? "", line: index + 1 }];
  });
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Everything wrong with the sentences on their own. */
export function auditRequirements(requirements: Requirement[], retired: string[] = []): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();
  for (const { id, pattern, text, layer, line } of requirements) {
    const where = `REQUIREMENTS.md:${line} ${id}`;
    const add = (code: string, message: string) => findings.push({ code, where, message });
    if (seen.has(id)) add("duplicate-id", `${id} is used twice. Ids are unique; take the next free one with --next-id.`);
    seen.add(id);
    if (retired.includes(id)) add("retired-id", `${id} is retired (tests/bdd/retired-requirement-ids.txt) and is never reused. Take the next free one with --next-id.`);
    const shalls = text.match(/\bshall\b/gi)?.length ?? 0;
    if (shalls !== 1) add("shall-count", `the sentence has ${shalls} "shall"; a requirement has exactly one. Split it into two requirements.`);
    const wrong = text.match(/\b(should|must|will|may|might|could)\b/i);
    if (wrong) add("obligation-keyword", `the sentence says "${wrong[0]}"; the obligation keyword is "shall".`);
    const vague = VAGUE.filter((word) => new RegExp(`(?<![\\w-])${escape(word)}(?![\\w-])`, "i").test(text));
    if (vague.length > 0) add("vague-language", `the sentence uses vague language (${vague.map((w) => `"${w}"`).join(", ")}); say what can be observed.`);
    const system = Object.keys(SYSTEMS).find((name) => new RegExp(`(?<![\\w-])${name}\\s+shall\\b`, "i").test(text));
    if (!system) add("system-name", `the words before "shall" must name a system: ${Object.keys(SYSTEMS).join(", ")}.`);
    else if (!layer.split(/[\s,]+/).includes(SYSTEMS[system]!)) {
      add("layer-mismatch", `the sentence is about ${system}, which lives in ${SYSTEMS[system]}, but "Implemented in" says "${layer}". Name the layer that holds the code.`);
    }
    const form = PATTERNS[pattern];
    if (!form) add("unknown-pattern", `"${pattern}" is not an EARS pattern; use one of ${Object.keys(PATTERNS).join(", ")}.`);
    else if (!form.opening.test(text)) add("ears-form", `a ${pattern} requirement reads "${form.form}"`);
  }
  return findings;
}

/** Everything wrong between the requirements and the features that prove them. */
export function auditFeatures(features: Feature[], requirements: Requirement[], steps: Source[] = []): Finding[] {
  const findings: Finding[] = [];
  const byId = new Map(requirements.map((r) => [r.id, r]));
  const proved = new Set<string>();
  for (const { file, doc } of features) {
    if (steps.length > 0 && !steps.some(({ text }) => text.includes(`loadFeature("${file}")`))) {
      findings.push({ code: "unbound-feature", where: file, message: `no steps file loads this feature. Add tests/bdd/steps/<area>/<name>.steps.ts calling loadFeature("${file}").` });
    }
    for (const scenario of doc.looseScenarios) {
      findings.push({ code: "scenario-outside-rule", where: `${file}:${scenario.line}`, message: `"${scenario.title}" is not under a Rule, so it cites no requirement. Move it under the Rule it proves.` });
    }
    for (const rule of doc.rules) {
      const where = `${file}:${rule.line}`;
      const add = (code: string, message: string) => findings.push({ code, where, message });
      const ids = rule.tags.filter((tag) => ID_TAG.test(tag)).map((tag) => tag.slice(1));
      if (ids.length !== 1) {
        add("rule-id", `the Rule "${rule.title.slice(0, 60)}..." has ${ids.length} id tags; it takes exactly one, such as @R-001, above the Rule line.`);
        continue;
      }
      const requirement = byId.get(ids[0]!);
      if (!requirement) {
        add("unknown-id", `@${ids[0]} is not in REQUIREMENTS.md. State the requirement there first, with --next-id, then prove it here.`);
        continue;
      }
      if (rule.title !== requirement.text) {
        add("rule-title-drift", `the Rule's title is not ${requirement.id}'s sentence. One sentence, one source: copy it from REQUIREMENTS.md:${requirement.line} word for word.\n    REQUIREMENTS.md: ${requirement.text}\n    feature:         ${rule.title}`);
      }
      const tag = PATTERNS[requirement.pattern]?.tag;
      const earsTags = rule.tags.filter((t) => t.startsWith("@ears-"));
      if (tag && (earsTags.length !== 1 || earsTags[0] !== tag)) {
        add("ears-tag", `${requirement.id} is ${requirement.pattern}, so its Rule takes exactly ${tag}; it has ${earsTags.join(", ") || "none"}.`);
      }
      if (rule.scenarios.length === 0) add("no-scenarios", `${requirement.id} has a Rule but no scenario. A requirement without proof is a wish: add a Given/When/Then scenario.`);
      else proved.add(requirement.id);
    }
  }
  for (const { id, line } of requirements) {
    if (!proved.has(id)) {
      findings.push({ code: "unproved-requirement", where: `REQUIREMENTS.md:${line} ${id}`, message: `no Rule tagged @${id} has a scenario. Add one to the feature for its layer in tests/bdd/features.` });
    }
  }
  return findings;
}

/** Ids cited anywhere in the tests must be requirements. */
export function auditCitations(sources: Source[], requirements: Requirement[]): Finding[] {
  const known = new Set(requirements.map((r) => r.id));
  return sources.flatMap(({ file, text }) =>
    [...new Set(text.match(ID) ?? [])]
      .filter((id) => !known.has(id))
      .map((id) => ({ code: "unknown-citation", where: file, message: `cites ${id}, which is not in REQUIREMENTS.md. Cite an id that exists, or state the requirement first.` })),
  );
}

/** The next id: one past the highest ever used, retired ones included. */
export function nextId(requirements: Requirement[], retired: string[] = []): string {
  const highest = Math.max(0, ...[...requirements.map((r) => r.id), ...retired].map((id) => Number(id.slice(2))));
  return `R-${String(highest + 1).padStart(3, "0")}`;
}

function walk(dir: string, keep: (name: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter(keep)
    .map((file) => join(dir, file));
}

/** The retired ids: one per line, # comments allowed. */
export function readRetired(root: string): string[] {
  const file = join(root, "tests/bdd/retired-requirement-ids.txt");
  return existsSync(file) ? readFileSync(file, "utf8").split("\n").map((line) => line.replace(/#.*/, "").trim()).filter(Boolean) : [];
}

/** Every finding for the variant at `root`. */
export function audit(root: string): Finding[] {
  const rel = (path: string) => relative(root, path).replaceAll("\\", "/");
  const requirements = parseRequirements(readFileSync(join(root, "REQUIREMENTS.md"), "utf8"));
  const retired = readRetired(root);
  const features = walk(join(root, "tests/bdd/features"), (name) => name.endsWith(".feature")).map((path) => ({ file: rel(path), doc: parseGherkin(readFileSync(path, "utf8")) }));
  const steps = walk(join(root, "tests/bdd/steps"), (name) => name.endsWith(".steps.ts")).map((path) => ({ file: rel(path), text: readFileSync(path, "utf8") }));
  const tests = walk(join(root, "tests"), (name) => /\.(test|steps|e2e)\.ts$/.test(name) && !name.includes("fixtures") && !name.includes("suite-health"))
    .map((path) => ({ file: rel(path), text: readFileSync(path, "utf8") }));
  return [...auditRequirements(requirements, retired), ...auditFeatures(features, requirements, steps), ...auditCitations(tests, requirements)];
}

/** Findings as the command prints them. */
export const format = (findings: Finding[]) => findings.map(({ code, where, message }) => `${code}: ${where}: ${message}`).join("\n");

/** True when this file is the script node was asked to run, not a module a test imported. */
const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === import.meta.filename;

if (isMain) {
  const root = join(import.meta.dirname, "..", "..");
  if (process.argv.includes("--next-id")) {
    console.log(nextId(parseRequirements(readFileSync(join(root, "REQUIREMENTS.md"), "utf8")), readRetired(root)));
  } else {
    const findings = audit(root);
    console.log(findings.length === 0 ? "EARS audit: every requirement is proved, and every citation is known." : format(findings));
    process.exitCode = findings.length === 0 ? 0 : 1;
  }
}
