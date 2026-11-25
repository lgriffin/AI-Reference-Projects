/**
 * Conventional Commits in, the next SemVer version and a Keep a Changelog section out. Pure: no files,
 * no git; scripts/release-version.ts reads those and calls this.
 *
 * Upstream derives the changelog draft the same way (scripts/release-changelog.ts: `feat` is a Feature,
 * `fix` and `perf` a Fix, `!` or "BREAKING CHANGE" a Breaking Change) and leaves the version bump to the
 * release author (guides/Release-Strategy.md, "Release Cut": "Review merged PRs since the last release.
 * Apply semver rules."). This rung writes that rule down so a test can hold it.
 *
 *   https://www.conventionalcommits.org/en/v1.0.0/   https://semver.org/   https://keepachangelog.com/en/1.1.0/
 */

export type Bump = "major" | "minor" | "patch" | "none";

export type Commit = {
  /** The short hash, when the input had one. */
  hash?: string;
  type: string;
  scope?: string;
  breaking: boolean;
  description: string;
};

/** A message that is not a Conventional Commit: it is reported, and it cannot move the version. */
export type Unconventional = { hash?: string; subject: string };

export type Parsed = { commits: Commit[]; unconventional: Unconventional[] };

/** `type(scope)!: description`, with `type` lower case. */
const HEADER = /^(?<type>[a-z]+)(?:\((?<scope>[^()\r\n]+)\))?(?<bang>!)?: (?<description>\S.*)$/;
/** A footer that marks a breaking change. The spec allows either spelling. */
const BREAKING_FOOTER = /^BREAKING[ -]CHANGE: /m;
/** `commit <hash>` on a line of its own starts a message in the input, as `git log` writes it. */
const HASH_LINE = /^commit ([0-9a-f]{7,40})$/;

/** The separator between messages in a commits file: a line holding only `---`. */
export const SEPARATOR = /^---\s*$/m;

/** One commit message (subject, blank line, body, footers). */
export function parseMessage(message: string, hash?: string): Commit | Unconventional {
  const lines = message.replace(/\r\n/g, "\n").trim().split("\n");
  let first = lines[0] ?? "";
  const hashed = HASH_LINE.exec(first);
  if (hashed) {
    hash = hashed[1]!.slice(0, 7);
    lines.shift();
    while (lines[0]?.trim() === "") lines.shift();
    first = lines[0] ?? "";
  }
  const subject = first.trim();
  const match = HEADER.exec(subject);
  if (!match?.groups) return { ...(hash ? { hash } : {}), subject };
  const { type, scope, bang, description } = match.groups;
  return {
    ...(hash ? { hash } : {}),
    type: type!,
    ...(scope ? { scope } : {}),
    breaking: bang === "!" || BREAKING_FOOTER.test(lines.slice(1).join("\n")),
    description: description!.trim(),
  };
}

/** A commits file: messages separated by `---` lines. Empty blocks are skipped. */
export function parseCommits(text: string): Parsed {
  const parsed: Parsed = { commits: [], unconventional: [] };
  for (const block of text.split(SEPARATOR)) {
    if (block.trim() === "") continue;
    const result = parseMessage(block);
    if ("type" in result) parsed.commits.push(result);
    else parsed.unconventional.push(result);
  }
  return parsed;
}

/** What one commit asks of the version. */
export function bumpOf(commit: Commit): Bump {
  if (commit.breaking) return "major";
  if (commit.type === "feat") return "minor";
  if (commit.type === "fix" || commit.type === "perf") return "patch";
  return "none";
}

const RANK: Record<Bump, number> = { none: 0, patch: 1, minor: 2, major: 3 };

/** The largest bump any commit asks for. */
export function bumpFor(commits: Commit[]): Bump {
  return commits.map(bumpOf).reduce<Bump>((a, b) => (RANK[b] > RANK[a] ? b : a), "none");
}

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

/**
 * The version a release tag names: "v1.4.2" or "1.4.2" is "1.4.2"; a branch or a commit id names none.
 * `--from v1.4.2` counts commits since that release, so the next version is counted from it too, whatever
 * package.json says now. That is what stops the same commits being released twice.
 */
export function versionOfRef(ref: string): string | undefined {
  const version = ref.startsWith("v") ? ref.slice(1) : ref;
  return SEMVER.test(version) ? version : undefined;
}

/**
 * The next version. A pre-release (`1.2.0-rc.1`) is finished as `1.2.0` by any bump. Before 1.0.0 the
 * public API is not stable (SemVer item 4), so a breaking change moves the minor number, as most tools do.
 */
export function nextVersion(current: string, bump: Bump): string {
  const match = SEMVER.exec(current);
  if (!match) throw new Error(`"${current}" is not a SemVer version (MAJOR.MINOR.PATCH, https://semver.org/). Fix "version" in package.json first.`);
  const [major, minor, patch] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const pre = current.includes("-");
  if (bump === "none") return current;
  if (pre) return `${major}.${minor}.${patch}`;
  if (bump === "major") return major === 0 ? `0.${minor + 1}.0` : `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

/**
 * Keep a Changelog's headings, in its order, and which commits go under each. As upstream, `fix` and `perf`
 * are fixes; a breaking change of any type is listed under Changed and marked. Other types (docs, test, ci,
 * build, chore, refactor, style) change nothing a user gets, so they stay out: a changelog is for people,
 * not a commit log. Deprecated and Removed are written by hand when the author curates the draft.
 */
export const SECTIONS: { heading: string; takes: (c: Commit) => boolean }[] = [
  { heading: "Added", takes: (c) => !c.breaking && c.type === "feat" },
  { heading: "Changed", takes: (c) => c.breaking },
  { heading: "Fixed", takes: (c) => !c.breaking && (c.type === "perf" || (c.type === "fix" && c.scope !== "security")) },
  { heading: "Security", takes: (c) => !c.breaking && c.type === "fix" && c.scope === "security" },
];

function entry(commit: Commit): string {
  const scope = commit.scope && commit.scope !== "security" ? `**${commit.scope}:** ` : "";
  const breaking = commit.breaking ? "**Breaking:** " : "";
  const hash = commit.hash ? ` (${commit.hash})` : "";
  return `- ${breaking}${scope}${commit.description}${hash}`;
}

/** `## [1.1.0] - 2026-11-25` and its sections. A section with no entry is left out. */
export function changelogSection(version: string, date: string, commits: Commit[]): string {
  const parts = [`## [${version}] - ${date}`];
  for (const { heading, takes } of SECTIONS) {
    const entries = commits.filter(takes).map(entry);
    if (entries.length > 0) parts.push(`### ${heading}\n\n${entries.join("\n")}`);
  }
  if (parts.length === 1) parts.push("No user-facing changes.");
  return `${parts.join("\n\n")}\n`;
}

/**
 * CHANGELOG.md with a release added: the new section goes right under `## [Unreleased]`, which is
 * emptied, because what was unreleased is now released.
 */
export function addRelease(changelog: string, section: string): string {
  const unreleased = /^## \[Unreleased\][^\n]*\n/m.exec(changelog);
  if (!unreleased) throw new Error('CHANGELOG.md has no "## [Unreleased]" heading. Keep a Changelog keeps one at the top, so there is always a place for the next change.');
  const start = unreleased.index + unreleased[0].length;
  const nextHeading = changelog.slice(start).search(/^## \[/m);
  const end = nextHeading === -1 ? changelog.length : start + nextHeading;
  const version = /^## \[([^\]]+)\]/.exec(section)?.[1];
  if (version && new RegExp(`^## \\[${version.replace(/[.+]/g, "\\$&")}\\]`, "m").test(changelog)) {
    throw new Error(`CHANGELOG.md already has a section for ${version}. A version is released once; cut the next one instead (guides/Release-Strategy.md: tags are immutable).`);
  }
  return `${changelog.slice(0, start)}\n${section}\n${changelog.slice(end)}`;
}

/** A one-line reason for the bump, for a person. */
export function explainBump(commits: Commit[]): string {
  const bump = bumpFor(commits);
  const count = (b: Bump) => commits.filter((c) => bumpOf(c) === b).length;
  const why = [
    count("major") && `${count("major")} breaking`,
    count("minor") && `${count("minor")} feat`,
    count("patch") && `${count("patch")} fix or perf`,
  ].filter(Boolean);
  return why.length === 0 ? `${bump}: no commit changes what a user gets` : `${bump}: ${why.join(", ")}`;
}
