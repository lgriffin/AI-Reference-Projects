/**
 * Just enough of Gherkin to audit it: tags, the Feature, its Rules and the Scenarios beneath each, with
 * line numbers. vitest-cucumber parses the files properly to run them; this reads their shape without
 * running anything. Mirrors upstream scripts/checks/lib/gherkin-rules.ts.
 */

export type GherkinScenario = { title: string; tags: string[]; line: number };
export type GherkinRule = { title: string; tags: string[]; line: number; scenarios: GherkinScenario[] };
export type GherkinDocument = { feature: string; tags: string[]; rules: GherkinRule[]; looseScenarios: GherkinScenario[] };

export function parseGherkin(text: string): GherkinDocument {
  const doc: GherkinDocument = { feature: "", tags: [], rules: [], looseScenarios: [] };
  let pending: string[] = [];
  let rule: GherkinRule | undefined;
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    const number = index + 1;
    if (line.startsWith("@")) {
      pending.push(...line.split(/\s+/).filter((tag) => tag.startsWith("@")));
      return;
    }
    const keyword = line.match(/^(Feature|Rule|Scenario Outline|Scenario|Example):\s*(.*)$/);
    if (!keyword) return;
    const [, kind, title = ""] = keyword;
    if (kind === "Feature") {
      doc.feature = title;
      doc.tags = pending;
    } else if (kind === "Rule") {
      rule = { title, tags: pending, line: number, scenarios: [] };
      doc.rules.push(rule);
    } else {
      (rule ? rule.scenarios : doc.looseScenarios).push({ title, tags: pending, line: number });
    }
    pending = [];
  });
  return doc;
}
