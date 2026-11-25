/**
 * The readiness A3: one page that says whether this release is ready to tag, and why. Pure: the
 * readiness script gathers the facts, this lays them out (R-042).
 *
 * An A3 is the Lean single sheet a team reads to see where it stands: background, current condition,
 * goal, root cause, countermeasures, plan, follow-up. The release harness publishes one every night
 * (src/a3 in tutors-release-harness, "Daily A3 for the release reviewer"). Like the harness's, this one
 * judges nothing: the checks decide, and the page shows what they decided and where each number came from.
 */
import { format, type Result } from "./slo.ts";

/** A check that reads what another command left behind: it may not have run for this commit. */
export type Recorded = { status: "passed" | "failed" | "skipped" | "not run"; reason: string };

export type Readiness = {
  app: string;
  version: string;
  commit: string;
  date: string;
  /** The CHANGELOG.md section for `version`, without its heading, or undefined when there is none. */
  changelog?: string;
  /** Whether the working tree under this folder has changes git has not committed. */
  dirty: boolean | "unknown";
  claims: { count: number; problems: string[] };
  slo: Result[] | { error: string };
  /** The offline supply-chain audit's findings (pnpm audit:supply-chain). */
  supplyChain: { findings: string[] };
  /** The last mutation run against its floors (pnpm test:mutation, pnpm check:mutation-floors). */
  mutation: Recorded & { score?: number };
  container: Recorded;
  /** The last measured lead time, in words, when pnpm release:value-stream has run for this commit. */
  leadTime?: string;
};

export type Gap = { area: string; finding: string; countermeasure: string };

/** Everything that stands between this commit and a tag. */
export function gaps(r: Readiness): Gap[] {
  const found: Gap[] = [];
  if (!r.changelog) found.push({ area: "Changelog", finding: `CHANGELOG.md has no section for ${r.version}.`, countermeasure: "Run pnpm release:version --from <last tag> --write, then curate the section." });
  if (r.dirty === true) found.push({ area: "Source", finding: "The working tree has uncommitted changes, so no commit is what would ship.", countermeasure: "Commit or stash, then run this again: a release is a commit, not a folder." });
  for (const problem of r.claims.problems) found.push({ area: "Claims", finding: problem, countermeasure: "Give the promise evidence (a test that would fail if it broke) or withdraw the claim." });
  if ("error" in r.slo) found.push({ area: "SLO", finding: r.slo.error, countermeasure: "Fix release/slo.yaml so every objective can be judged." });
  else for (const s of r.slo.filter((s) => !s.ok)) found.push({ area: "SLO", finding: s.message, countermeasure: "Find what grew and why; shrink it, or raise the budget in its own pull request that says what value it buys." });
  for (const finding of r.supplyChain.findings) found.push({ area: "Supply chain", finding, countermeasure: "Take the dependency from the registry by version, pinned in the lockfile; an allowance needs a reason and a date, and a person." });
  if (r.mutation.status === "failed") found.push({ area: "Mutation", finding: r.mutation.reason, countermeasure: "Open reports/mutation/index.html, find the survivors, and add the test that kills them. A floor is lowered only by a person." });
  if (r.container.status === "failed") found.push({ area: "Container", finding: r.container.reason, countermeasure: "Fix the image; the smoke check names the rule it broke." });
  return found;
}

/** The checks that did not run for this commit. Not gaps, and not passes. */
export function unproven(r: Readiness): { area: string; reason: string }[] {
  return [
    ...(r.mutation.status === "passed" || r.mutation.status === "failed" ? [] : [{ area: "Mutation", reason: r.mutation.reason }]),
    ...(r.container.status === "passed" || r.container.status === "failed" ? [] : [{ area: "Container", reason: r.container.reason }]),
  ];
}

export function verdict(r: Readiness): string {
  const open = gaps(r).length;
  const notRun = unproven(r).length;
  if (open > 0) return "HOLD";
  if (notRun > 0) return `READY, with ${notRun === 1 ? "one check" : `${notRun} checks`} not run`;
  return "READY";
}

const cell = (text: string) => text.replaceAll("|", "\\|").replaceAll("\n", " ");

export function renderA3(r: Readiness): string {
  const open = gaps(r);
  const notRun = unproven(r);
  const slo = "error" in r.slo ? [] : r.slo;
  const lines: string[] = [
    `# Release readiness: ${r.app} ${r.version}`,
    "",
    `A3 for commit \`${r.commit.slice(0, 12)}\`, ${r.date}. Advisory: the checks decide and this page shows what they decided. Read it top to bottom; it should take two minutes.`,
    "",
    `**${verdict(r)}.** ${open.length === 0 ? "Nothing stands between this commit and a tag." : `${open.length} gap(s) stand between this commit and a tag; each is under Root cause.`}`,
    "",
    "## 1. Background: the value in this release",
    "",
    "What a learner or contributor gets, from CHANGELOG.md. If it is not here, it is not value we can name.",
    "",
    r.changelog?.trim() || `_No section for ${r.version} in CHANGELOG.md._`,
    "",
    "## 2. Current condition",
    "",
    "| Check | Standard | Now | Source |",
    "| --- | --- | --- | --- |",
    `| Changelog | a section for ${r.version} | ${r.changelog ? "present" : "missing"} | CHANGELOG.md |`,
    `| Source | committed | ${r.dirty === "unknown" ? "unknown (no git)" : r.dirty ? "uncommitted changes" : "clean"} | git status |`,
    `| Claims | every claim has evidence | ${r.claims.count} claims, ${r.claims.problems.length} problem(s) | pnpm release:claims |`,
    ...slo.map((s) => `| SLO ${s.id} | within ${format(s.budget, s.unit)} | ${format(s.value, s.unit)} ${s.ok ? "(ok)" : Number.isNaN(s.value) ? "" : "(over)"} | pnpm release:slo |`),
    ...("error" in r.slo ? ["| SLO | a valid release/slo.yaml | not judged | pnpm release:slo |"] : []),
    `| Supply chain | registry sources, a lockfile, allowances in date | ${r.supplyChain.findings.length} finding(s) | pnpm audit:supply-chain |`,
    `| Mutation | every file holds its floor | ${r.mutation.status}${r.mutation.score === undefined ? "" : `, ${r.mutation.score.toFixed(2)}% of mutants killed`} | pnpm test:mutation, pnpm check:mutation-floors |`,
    `| Container | smoke passes | ${r.container.status} | pnpm container:smoke |`,
    ...(r.leadTime ? [`| Lead time | measured, and no longer than last release | ${r.leadTime} | pnpm release:value-stream |`] : []),
    "",
    "## 3. Goal",
    "",
    "Every promise in release/claims.yaml has evidence, every objective in release/slo.yaml is within budget, the supply chain is clean, the suite holds its mutation floors, the image passes its smoke check, and a clean commit carries the version and its changelog section. Then a person tags it.",
    "",
    "## 4. Root cause analysis",
    "",
    ...(open.length === 0
      ? ["No gap to analyse.", ...notRun.map((n) => `The ${n.area.toLowerCase()} check did not run (${n.reason}); that is not a pass, so run it before you tag.`)]
      : [
          "For each gap, ask why until the answer is a process or a tool you can change (5 Whys). \"Human error\" is not an answer; it is the prompt for the next why.",
          "",
          ...open.map((g, i) => `${i + 1}. **${g.area}.** ${g.finding}`),
        ]),
    "",
    "## 5. Countermeasures",
    "",
    ...(open.length === 0 ? ["None needed."] : ["| # | Area | Countermeasure |", "| --- | --- | --- |", ...open.map((g, i) => `| ${i + 1} | ${g.area} | ${cell(g.countermeasure)} |`)]),
    "",
    "## 6. Plan: the standard work left (release/SOP.md)",
    "",
    `- [${r.changelog ? "x" : " "}] Version and changelog section for ${r.version}`,
    `- [${r.claims.problems.length === 0 ? "x" : " "}] Claims check clean`,
    `- [${!("error" in r.slo) && slo.every((s) => s.ok) ? "x" : " "}] Every SLO within budget`,
    `- [${r.supplyChain.findings.length === 0 ? "x" : " "}] Supply-chain audit clean`,
    `- [${r.mutation.status === "passed" ? "x" : " "}] Mutation floors held`,
    `- [${r.container.status === "passed" ? "x" : " "}] Container smoke passed`,
    `- [ ] A person reads this page and tags \`v${r.version}\` (the Human Boundary: no script tags a release)`,
    "",
    "## 7. Follow-up",
    "",
    "After the tag: keep this page with the release, compare its numbers with the last release's (is any headroom shrinking, is the lead time growing?), and turn every gap that recurred into a countermeasure in the system, not a reminder to a person.",
    "",
  ];
  return lines.join("\n");
}

/** The body of `## [version]` in a Keep a Changelog file, or undefined. */
export function changelogBody(changelog: string, version: string): string | undefined {
  const start = changelog.indexOf(`## [${version}]`);
  if (start === -1) return undefined;
  const body = changelog.slice(changelog.indexOf("\n", start) + 1);
  const end = body.search(/^## \[/m);
  return (end === -1 ? body : body.slice(0, end)).trim() || undefined;
}
