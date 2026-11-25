/**
 * The next version and its changelog section, from Conventional Commit messages.
 *
 *   node scripts/release-version.ts --commits <file>          # messages separated by "---" lines
 *   node scripts/release-version.ts --from v1.0.0 [--to HEAD]   # git log of this folder between two refs
 *   ... [--current 1.0.0] [--date 2026-11-25] [--write]
 *
 * Prints the bump, the next version and the section. With --write it also sets "version" in the root and
 * every app's package.json (one version for what ships, as upstream's root and apps/* share 17.1.0) and adds
 * the section to CHANGELOG.md under "## [Unreleased]". It never tags: a tag is a person's act (release/SOP.md).
 * Mirrors upstream scripts/release-changelog.ts, which drafts; the person curates.
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isMain, runMain } from "./lib/cli.ts";
import { addRelease, bumpFor, changelogSection, explainBump, nextVersion, parseCommits } from "./lib/conventional.ts";

export const ROOT = join(import.meta.dirname, "..");

/** The package.json files that carry the release version: the root and every app. */
export function versionedPackages(root = ROOT): string[] {
  const apps = readdirSync(join(root, "apps"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => `apps/${d.name}/package.json`);
  return ["package.json", ...apps];
}

type Options = { commits?: string; from?: string; to: string; current?: string; date: string; write: boolean };

function parseArgs(argv: string[]): Options {
  const options: Options = { to: "HEAD", date: new Date().toISOString().slice(0, 10), write: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]!;
    const value = () => {
      const v = argv[++i];
      if (!v || v.startsWith("--")) throw new Error(`${flag} needs a value`);
      return v;
    };
    if (flag === "--commits") options.commits = value();
    else if (flag === "--from") options.from = value();
    else if (flag === "--to") options.to = value();
    else if (flag === "--current") options.current = value();
    else if (flag === "--date") options.date = value();
    else if (flag === "--write") options.write = true;
    else throw new Error(`unknown argument ${flag}`);
  }
  if (!options.commits === !options.from) throw new Error("give exactly one of --commits <file> or --from <git ref>");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) throw new Error(`--date ${options.date} is not YYYY-MM-DD`);
  return options;
}

/** The messages of the commits that touched this folder, in the commits-file format. */
function gitLog(from: string, to: string): string {
  const log = execFileSync("git", ["log", "--format=commit %H%n%B%x1e", `${from}..${to}`, "--", "."], { cwd: ROOT, encoding: "utf8" });
  return log.split("\x1e").join("\n---\n");
}

export function main(argv: string[]): number {
  const options = parseArgs(argv);
  const text = options.commits ? readFileSync(options.commits, "utf8") : gitLog(options.from!, options.to);
  const { commits, unconventional } = parseCommits(text);
  const current = options.current ?? JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version;
  const bump = bumpFor(commits);
  const next = nextVersion(current, bump);

  for (const { hash, subject } of unconventional) {
    process.stderr.write(
      `warning: "${subject}"${hash ? ` (${hash})` : ""} is not a Conventional Commit ("type(scope): description"), so it cannot move the version or reach the changelog. ` +
        "If it changed what a user gets, say so in the changelog by hand.\n",
    );
  }
  process.stdout.write(`current version: ${current}\nbump: ${explainBump(commits)}\nnext version: ${next}\n\n`);
  if (bump === "none") {
    process.stdout.write("Nothing to release: no feat, fix, perf or breaking change since the last release.\n");
    return 0;
  }
  const section = changelogSection(next, options.date, commits);
  process.stdout.write(section);
  if (options.write) {
    for (const file of versionedPackages()) {
      const path = join(ROOT, file);
      const pkg = JSON.parse(readFileSync(path, "utf8"));
      pkg.version = next;
      writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
    }
    const changelog = join(ROOT, "CHANGELOG.md");
    writeFileSync(changelog, addRelease(readFileSync(changelog, "utf8"), section));
    process.stdout.write(`\nwrote version ${next} to ${versionedPackages().join(", ")} and its section to CHANGELOG.md. Curate the section, then commit.\n`);
  }
  return 0;
}

if (isMain(import.meta.url)) await runMain("release-version", () => main(process.argv.slice(2)));
