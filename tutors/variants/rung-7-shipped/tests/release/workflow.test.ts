/**
 * The CI workflow, held to the rules zizmor audits upstream (.github/workflows/zizmor.yml there) and that
 * upstream's ci.yml follows: every action pinned to a full commit SHA, permissions declared and read-only,
 * no credentials left on disk, no untrusted text in a shell, a timeout on every job, and one Single Gate.
 * These read the file; they are not zizmor. Upstream runs zizmor itself, and so should a real repository.
 */
import { test } from "vitest";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

const DIR = join(import.meta.dirname, "..", "..", ".github", "workflows");
const workflows = readdirSync(DIR)
  .filter((f) => /\.ya?ml$/.test(f))
  .map((file) => ({ file: `.github/workflows/${file}`, text: readFileSync(join(DIR, file), "utf8") }))
  .map((w) => ({ ...w, doc: parse(w.text) as Workflow }));

type Step = { uses?: string; run?: string; with?: Record<string, unknown> };
type Job = { name?: string; if?: string; needs?: string | string[]; permissions?: unknown; "timeout-minutes"?: number; steps?: Step[] };
type Workflow = { on: Record<string, unknown>; permissions?: unknown; jobs: Record<string, Job> };

const steps = (doc: Workflow) => Object.entries(doc.jobs).flatMap(([job, j]) => (j.steps ?? []).map((step) => ({ job, step })));

function none(found: string[], rule: string) {
  if (found.length > 0) assert.fail(`${rule}\n  ${found.join("\n  ")}`);
}

test("there is a workflow to check", () => {
  assert.ok(workflows.some((w) => w.file.endsWith("ladder-ci.yml")));
});

test("every action is pinned to a full commit SHA, with its version in a comment", () => {
  const found: string[] = [];
  for (const { file, text, doc } of workflows) {
    for (const { job, step } of steps(doc)) {
      if (!step.uses || step.uses.startsWith("./")) continue;
      if (!/^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/.test(step.uses)) found.push(`${file} job ${job}: uses ${step.uses}`);
      else if (!new RegExp(`uses: ${step.uses.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")} # v\\d`).test(text)) found.push(`${file} job ${job}: ${step.uses} has no "# vX" comment`);
    }
  }
  none(
    found,
    "Pinning rule (zizmor: unpinned-uses): a tag such as @v4 can be moved to other code by whoever controls the action, and your next run executes it with your token. " +
      "Pin the full 40-character commit SHA and keep the version in a comment for people (uses: actions/checkout@<sha> # v7), as upstream's workflows do. Dependabot updates both.",
  );
});

test("permissions are declared and read-only", () => {
  const found: string[] = [];
  for (const { file, doc } of workflows) {
    if (doc.permissions === undefined) found.push(`${file}: no top-level permissions, so every job gets the repository's default token`);
    const grants = [["(workflow)", doc.permissions], ...Object.entries(doc.jobs).map(([name, j]) => [name, j.permissions])] as [string, unknown][];
    for (const [where, permissions] of grants) {
      if (permissions === "write-all" || permissions === "read-all") found.push(`${file} ${where}: permissions: ${permissions}`);
      else if (permissions && typeof permissions === "object") {
        for (const [scope, level] of Object.entries(permissions)) if (level === "write") found.push(`${file} ${where}: ${scope}: write`);
      }
    }
  }
  none(
    found,
    "Least-privilege rule (zizmor: excessive-permissions): declare `permissions: contents: read` at the top, as upstream's ci.yml does. " +
      "A job that must write (a release, a pin pull request) lives in its own workflow and asks for exactly that scope there, with a comment that says why.",
  );
});

test("checkouts keep no credentials, and no trigger runs untrusted code with secrets", () => {
  const found: string[] = [];
  for (const { file, doc } of workflows) {
    for (const trigger of ["pull_request_target", "workflow_run"]) if (trigger in (doc.on ?? {})) found.push(`${file}: on ${trigger} (zizmor: dangerous-triggers)`);
    for (const { job, step } of steps(doc)) {
      if (step.uses?.startsWith("actions/checkout@") && step.with?.["persist-credentials"] !== false) found.push(`${file} job ${job}: checkout without persist-credentials: false (zizmor: artipacked)`);
      const injected = step.run?.match(/\$\{\{\s*(github\.event\.[^}]*|github\.head_ref|inputs\.[^}]*)\}\}/);
      if (injected) found.push(`${file} job ${job}: ${injected[0]} inside run (zizmor: template-injection)`);
    }
  }
  none(
    found,
    "Workflow hygiene rule: set persist-credentials: false on every checkout so the token is not left in .git/config for later steps; " +
      "pass untrusted text (titles, branch names, inputs) to a shell through env:, never ${{ }} inside run:; and use pull_request, not pull_request_target or workflow_run, for code from a fork.",
  );
});

test("every job has a timeout", () => {
  none(
    workflows.flatMap(({ file, doc }) => Object.entries(doc.jobs).filter(([, j]) => typeof j["timeout-minutes"] !== "number").map(([name]) => `${file} job ${name}`)),
    "Timeout rule: a job without timeout-minutes can hang for six hours and hold a runner. Upstream sets one on every job; set the time it takes, with room to spare.",
  );
});

test("one job is the Single Gate, and it needs every other job", () => {
  for (const { file, doc } of workflows) {
    const gates = Object.entries(doc.jobs).filter(([, j]) => j.if === "always()" && j.needs !== undefined);
    assert.equal(gates.length, 1, `Single Gate rule: ${file} needs exactly one job with if: always() that needs every other job, the one check branch protection requires (upstream ci.yml: "CI success").`);
    const [gate, job] = gates[0]!;
    const needs = [Array.isArray(job.needs) ? job.needs : [job.needs]].flat().sort();
    const others = Object.keys(doc.jobs).filter((name) => name !== gate).sort();
    assert.deepEqual(
      needs,
      others,
      `Single Gate rule: ${file} job ${gate} must need every other job, or a job outside it can fail and the pull request still merges. Add the missing job to its needs.`,
    );
    assert.match(JSON.stringify(job.steps), /needs\.\*\.result/, `Single Gate rule: ${gate} must fail on any result but success (skipped and cancelled included), reading needs.*.result.`);
  }
});

test("CI runs the whole line: the gate, the browser tier, mutation, the release checks and the container", () => {
  const { text } = workflows.find((w) => w.file.endsWith("ladder-ci.yml"))!;
  const commands = ["pnpm install --frozen-lockfile", "pnpm test", "pnpm test:ears:audit", "pnpm test:e2e", "pnpm test:mutation", "pnpm check:mutation-floors", "pnpm audit:supply-chain", "pnpm release:claims", "pnpm release:slo", "pnpm release:readiness", "node scripts/container-smoke.ts"];
  none(
    commands.filter((command) => !new RegExp(`run: ${command.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}$`, "m").test(text)).map((command) => `no step runs "${command}"`),
    "Whole line rule: a release is of the whole workspace, so CI runs every check release/SOP.md names. A check CI does not run is a check that will one day be forgotten.",
  );
});
