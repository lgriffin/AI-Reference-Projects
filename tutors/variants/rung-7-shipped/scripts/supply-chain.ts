/**
 * The supply-chain check: what this workspace installs, and from where.
 *
 *   pnpm audit:supply-chain    offline: a lockfile exists, every dependency comes from the registry with an
 *                              integrity hash, and every allowance is well formed and in date
 *   pnpm audit:online          also runs `pnpm audit --json` and fails on any advisory not allowed
 *
 * The offline half needs no network, so it runs in the Single Gate (tests/unit/scripts/supply-chain.test.ts and
 * the scenarios for R-035 and R-036). The online
 * half mirrors upstream scripts/checks/dependency-audit.ts and auditFindings in scripts/checks/security.ts,
 * with allowances in security/audit-allowlist.json as upstream keeps them in tests/security/audit-allowlist.json.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(import.meta.dirname, "..");

/** The workspace's package.json files. tests/unit/scripts/supply-chain.test.ts checks that every package is listed here. */
export const MANIFESTS = ["package.json", "packages/model/package.json", "packages/identity/package.json", "packages/rbac/package.json", "packages/gen/package.json", "packages/lite/package.json", "apps/cli/package.json", "apps/reader/package.json"];

const SECTIONS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

/** A version range the npm registry answers: 1.2.3, ^1.2.3, ~1.2, 1.2.3-beta.1. Nothing else names a registry package. */
const REGISTRY_RANGE = /^[\^~]?\d+(\.\d+){0,2}(-[0-9A-Za-z.-]+)?$/;

/** Rule 1: every dependency is the workspace's own (workspace:*) or a registry version range. */
export function manifestFindings(file: string, manifest: Record<string, unknown>): string[] {
  const findings: string[] = [];
  for (const section of SECTIONS) {
    for (const [name, spec] of Object.entries((manifest[section] ?? {}) as Record<string, string>)) {
      if (name.startsWith("@ladder/") ? spec === "workspace:*" : REGISTRY_RANGE.test(spec)) continue;
      findings.push(
        `non-registry-source: ${file} asks for "${name}" at "${spec}". Every dependency comes from the npm registry by version range ` +
          '(or is "@ladder/...": "workspace:*"), so the lockfile can pin it with an integrity hash and an audit can see it. ' +
          "A git URL, tarball, file: or link: path, or npm: alias bypasses both. Use a registry version, or ask a person (AGENTS.md).",
      );
    }
  }
  return findings;
}

/** Rule 2: the lockfile pins every package from the registry, with an integrity hash, and links only to the workspace. */
export function lockfileFindings(lockfile: string): string[] {
  const findings: string[] = [];
  if (!/^lockfileVersion: '9\.0'$/m.test(lockfile)) findings.push("lockfile-version: pnpm-lock.yaml is not lockfileVersion '9.0'. Run pnpm install with the pnpm that package.json pins.");
  let section = "";
  let specifier = "";
  for (const line of lockfile.split("\n")) {
    const top = line.match(/^(\w+):/);
    if (top) section = top[1]!;
    const spec = line.match(/^\s+specifier: (.+)$/);
    if (spec) specifier = spec[1]!;
    const version = line.match(/^\s+version: (.+)$/);
    if (section === "importers" && version && version[1]!.startsWith("link:") && specifier !== "workspace:*") {
      findings.push(`non-registry-source: pnpm-lock.yaml links "${version[1]}" for "${specifier}". Only workspace:* packages may be links.`);
    }
    const resolution = line.match(/^\s+resolution: \{(.*)\}$/);
    if (section === "packages" && resolution) {
      const fields = resolution[1]!;
      if (!/\bintegrity: sha512-/.test(fields) || /\b(tarball|repo|commit|directory|type):/.test(fields)) {
        findings.push(
          `non-registry-source: pnpm-lock.yaml resolves a package with {${fields}}. A registry package has an integrity: sha512-... hash and nothing else; ` +
            "a tarball, git repo or directory can change under the same name.",
        );
      }
    }
    if (/http:\/\//.test(line)) findings.push(`plain-http: pnpm-lock.yaml fetches over http: "${line.trim()}". Use https.`);
  }
  return findings;
}

export type Allowance = { id: string; package: string; reason: string; expires: string };
export type Advisory = { id: string; module: string; severity: string; title: string };

/** Rule 3: every allowance has a reason and an expiry, and has not expired. Mirrors upstream auditFindings' allowance checks. */
export function allowanceFindings(allowances: Allowance[], today: Date): string[] {
  const findings: string[] = [];
  for (const entry of allowances) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.expires ?? "") || (entry.reason ?? "").trim() === "") {
      findings.push(`malformed-allowance: ${entry.id} needs a reason and an expires date (YYYY-MM-DD)`);
    } else if (new Date(`${entry.expires}T23:59:59Z`) < today) {
      findings.push(`expired-allowance: ${entry.id} (${entry.package}) expired ${entry.expires}. Upgrade the package, or a person renews the allowance with a new reason.`);
    }
  }
  return findings;
}

/** Advisories from `pnpm audit --json`, keyed by GHSA id where there is one, as upstream parseAudit. */
export function parseAudit(json: string): Advisory[] {
  const report = JSON.parse(json) as { advisories?: Record<string, Record<string, unknown>> };
  return Object.values(report.advisories ?? {}).map((a) => ({
    id: String(a["github_advisory_id"] ?? a["id"]),
    module: String(a["module_name"]),
    severity: String(a["severity"]),
    title: String(a["title"]),
  }));
}

/** Rule 4 (online): every advisory is allowed. */
export function advisoryFindings(advisories: Advisory[], allowances: Allowance[]): string[] {
  const allowed = new Set(allowances.map((entry) => entry.id));
  return advisories.filter((a) => !allowed.has(a.id)).map((a) => `advisory: ${a.id} ${a.module} (${a.severity}): ${a.title}`);
}

/** Every offline finding for the workspace at `root`. A missing lockfile is the first finding, not a crash. */
export function offlineFindings(root: string, today: Date): string[] {
  const lockfile = join(root, "pnpm-lock.yaml");
  if (!existsSync(lockfile)) return ["lockfile-missing: pnpm-lock.yaml is required. Run pnpm install and commit the lockfile, so every install gets the same, hashed packages."];
  const manifests = MANIFESTS.flatMap((file) => manifestFindings(file, JSON.parse(readFileSync(join(root, file), "utf8"))));
  const allowances: Allowance[] = JSON.parse(readFileSync(join(root, "security/audit-allowlist.json"), "utf8")).allowances;
  return [...manifests, ...lockfileFindings(readFileSync(lockfile, "utf8")), ...allowanceFindings(allowances, today)];
}

function main(args: string[]): number {
  const findings = offlineFindings(ROOT, new Date());
  if (args.includes("--online")) {
    // pnpm audit exits non-zero whenever it finds anything; the JSON is still complete. A fixed command, never course input.
    const result = spawnSync("pnpm audit --json", { cwd: ROOT, encoding: "utf8", shell: true, maxBuffer: 64 * 1024 * 1024 });
    let advisories: Advisory[];
    try {
      advisories = parseAudit(result.stdout);
    } catch {
      process.stderr.write(`pnpm audit did not answer with JSON (offline, or the registry is unreachable). The offline checks ran:\n${findings.join("\n") || "ok"}\n`);
      return 2;
    }
    const allowances: Allowance[] = JSON.parse(readFileSync(join(ROOT, "security/audit-allowlist.json"), "utf8")).allowances;
    findings.push(...advisoryFindings(advisories, allowances));
    process.stdout.write(`${advisories.length} advisory(ies) reported by pnpm audit.\n`);
  }
  for (const finding of findings) process.stderr.write(`${finding}\n`);
  if (findings.length === 0) process.stdout.write(`supply chain ok: lockfile present, registry sources only, allowances in date${args.includes("--online") ? ", no advisory unallowed" : " (offline)"}\n`);
  return findings.length === 0 ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
