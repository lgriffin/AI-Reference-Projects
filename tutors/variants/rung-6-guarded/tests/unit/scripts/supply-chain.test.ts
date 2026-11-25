/**
 * Supply chain, offline: the rules of scripts/supply-chain.ts, run on this workspace (it must be clean) and
 * on seeded bad inputs (each must be caught, with a message that names the rule and the fix).
 * The online half (`pnpm audit:online`) needs the registry, so it stays out of the Single Gate.
 * R-035 and R-036 state the rules; tests/bdd/features/audit proves them with scenarios.
 */
import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { advisoryFindings, allowanceFindings, lockfileFindings, manifestFindings, MANIFESTS, offlineFindings, parseAudit, ROOT } from "../../../scripts/supply-chain.ts";

const TODAY = new Date("2026-11-25T12:00:00Z");

test("this workspace passes every offline supply-chain rule", () => {
  assert.deepEqual(offlineFindings(ROOT, new Date()), [], "Run `pnpm audit:supply-chain` for the same report.");
});

test("every package.json in the workspace is checked", () => {
  const found = ["package.json", ...["packages", "apps"].flatMap((dir) => readdirSync(join(ROOT, dir)).map((name) => `${dir}/${name}/package.json`))].sort();
  assert.deepEqual([...MANIFESTS].sort(), found, "Supply-chain rule: add the new package's package.json to MANIFESTS in scripts/supply-chain.ts.");
});

test("a workspace without a lockfile fails first, and says why a lockfile matters", () => {
  const copy = mkdtempSync(join(tmpdir(), "rung-6-supply-"));
  for (const file of [...MANIFESTS, "security/audit-allowlist.json"]) cpSync(join(ROOT, file), join(copy, file));
  assert.deepEqual(offlineFindings(copy, TODAY).map((f) => f.split(":")[0]), ["lockfile-missing"]);
  rmSync(copy, { recursive: true });
});

describe("rule 1: dependencies come from the registry or the workspace", () => {
  const CASES: [spec: string, ok: boolean][] = [
    ["^6.0.3", true],
    ["6.0.3", true],
    ["~1.2", true],
    ["1.0.0-beta.2", true],
    ["github:evil/typescript", false],
    ["git+https://github.com/evil/typescript.git", false],
    ["https://evil.example/typescript-6.0.3.tgz", false],
    ["file:../typescript", false],
    ["link:../typescript", false],
    ["npm:typescript-but-not@6.0.3", false],
    ["evil/typescript", false],
    ["*", false],
    ["latest", false],
  ];
  for (const [spec, ok] of CASES) {
    test(`"typescript": "${spec}" is ${ok ? "allowed" : "refused"}`, () => {
      const findings = manifestFindings("package.json", { devDependencies: { typescript: spec } });
      assert.equal(findings.length, ok ? 0 : 1);
      if (!ok) assert.match(findings[0]!, /^non-registry-source: package.json asks for "typescript" at/);
    });
  }

  test("workspace packages must say workspace:*, and nothing else may", () => {
    assert.deepEqual(manifestFindings("p", { dependencies: { "@ladder/model": "workspace:*" } }), []);
    assert.equal(manifestFindings("p", { dependencies: { "@ladder/model": "^1.0.0" } }).length, 1);
    assert.equal(manifestFindings("p", { dependencies: { leftpad: "workspace:*" } }).length, 1);
  });
});

describe("rule 2: the lockfile pins registry packages by integrity hash", () => {
  const LOCK = (resolution: string, importer = "specifier: workspace:*\n        version: link:../model") =>
    `lockfileVersion: '9.0'\n\nimporters:\n\n  packages/gen:\n    dependencies:\n      '@ladder/model':\n        ${importer}\n\npackages:\n\n  leftpad@1.0.0:\n    resolution: {${resolution}}\n`;

  test("a registry package with an integrity hash, and a workspace link, pass", () => {
    assert.deepEqual(lockfileFindings(LOCK("integrity: sha512-abc==")), []);
  });

  const BAD: [label: string, lock: string, rule: string][] = [
    ["a tarball", LOCK("tarball: https://evil.example/leftpad.tgz"), "non-registry-source"],
    ["a git repository", LOCK("commit: 0123abc, repo: https://github.com/evil/leftpad, type: git"), "non-registry-source"],
    ["a local directory", LOCK("directory: ../leftpad, type: directory"), "non-registry-source"],
    ["no integrity hash", LOCK("integrity: sha1-abc"), "non-registry-source"],
    ["a link that is not workspace:*", LOCK("integrity: sha512-abc==", "specifier: link:../model\n        version: link:../model"), "non-registry-source"],
    ["plain http", LOCK("integrity: sha512-abc==, tarball: http://registry.example/leftpad.tgz"), "plain-http"],
    ["an old lockfile format", LOCK("integrity: sha512-abc==").replace("'9.0'", "'6.0'"), "lockfile-version"],
  ];
  for (const [label, lock, rule] of BAD) {
    test(`${label} is caught as ${rule}`, () => {
      const findings = lockfileFindings(lock);
      assert.ok(findings.some((finding) => finding.startsWith(`${rule}:`)), findings.join("\n") || "no finding");
    });
  }
});

describe("rule 3 and 4: allowances and advisories, as upstream's auditFindings", () => {
  const allowance = { id: "GHSA-aaaa-bbbb-cccc", package: "leftpad", reason: "not reachable: dev-only, used at build time", expires: "2026-12-31" };

  test("an allowance needs a reason and an expiry, and expires at the end of its day", () => {
    assert.deepEqual(allowanceFindings([allowance], TODAY), []);
    assert.match(allowanceFindings([{ ...allowance, reason: " " }], TODAY)[0]!, /^malformed-allowance/);
    assert.match(allowanceFindings([{ ...allowance, expires: "31/12/2026" }], TODAY)[0]!, /^malformed-allowance/);
    assert.match(allowanceFindings([{ ...allowance, expires: "2026-11-24" }], TODAY)[0]!, /^expired-allowance/);
    assert.deepEqual(allowanceFindings([{ ...allowance, expires: "2026-11-25" }], TODAY), []);
  });

  test("pnpm audit's JSON is read, and only advisories without an allowance fail", () => {
    const json = JSON.stringify({
      advisories: {
        "1": { id: 1, github_advisory_id: "GHSA-aaaa-bbbb-cccc", module_name: "leftpad", severity: "high", title: "Prototype pollution" },
        "2": { id: 2, github_advisory_id: "GHSA-dddd-eeee-ffff", module_name: "rightpad", severity: "moderate", title: "ReDoS" },
      },
    });
    assert.deepEqual(advisoryFindings(parseAudit(json), [allowance]), ["advisory: GHSA-dddd-eeee-ffff rightpad (moderate): ReDoS"]);
    assert.deepEqual(parseAudit("{}"), []);
  });
});
