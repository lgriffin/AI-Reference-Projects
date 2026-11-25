/**
 * The Closure Check for release/claims.yaml: every promise names a test that exists and runs.
 *
 *   node scripts/check-release-claims.ts                 # release/claims.yaml
 *   node scripts/check-release-claims.ts path/to/file    # any other claims file
 *
 * Exit 0 when every claim resolves, 1 with a teaching message per problem, 2 when the file cannot be read.
 * Mirrors upstream scripts/checks/release-claims.ts (`pnpm check:release-claims`).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { checkClaims } from "./lib/claims.ts";
import { isMain, runMain } from "./lib/cli.ts";

const ROOT = join(import.meta.dirname, "..");

export function readIfPresent(path: string): string | undefined {
  try {
    return readFileSync(join(ROOT, path), "utf8");
  } catch {
    return undefined;
  }
}

/** The claims file's problems, read from disk. */
export function claimProblems(file = "release/claims.yaml"): { count: number; problems: string[] } {
  const doc = parse(readFileSync(join(ROOT, file), "utf8")) as { claims?: unknown[] } | null;
  return { count: Array.isArray(doc?.claims) ? doc.claims.length : 0, problems: checkClaims(doc, readIfPresent) };
}

export function main(argv: string[]): number {
  const file = argv[0] ?? "release/claims.yaml";
  const { count, problems } = claimProblems(file);
  if (problems.length === 0) {
    process.stdout.write(`${file}: ${count} claims, each with evidence that exists and runs.\n`);
    return 0;
  }
  process.stderr.write(`${file}: ${problems.length} problem(s). A release may not promise what no test checks.\n\n${problems.map((p) => `- ${p}`).join("\n")}\n`);
  return 1;
}

if (isMain(import.meta.url)) await runMain("check-release-claims", () => main(process.argv.slice(2)));
