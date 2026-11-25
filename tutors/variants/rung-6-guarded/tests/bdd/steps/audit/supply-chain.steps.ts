import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { allowanceFindings, lockfileFindings, manifestFindings, MANIFESTS, offlineFindings } from "../../../../scripts/supply-chain.ts";
import type { Allowance } from "../../../../scripts/supply-chain.ts";
import { ROOT } from "../../../support/paths.ts";

const feature = await loadFeature("tests/bdd/features/audit/supply-chain.feature");

describeFeature(feature, ({ Rule }) => {
  let read: () => string[];
  let root: string;
  let allowance: Allowance;
  let findings: string[];

  /** The audit exits with status 1 exactly when it has a finding (main in scripts/supply-chain.ts), so the findings are the outcome. */
  const reads = () => {
    findings = read();
  };
  const reports = (_ctx: unknown, rule: string) => {
    expect(findings.map((finding) => finding.split(":")[0])).toEqual([rule]);
  };
  const reportsNothing = () => {
    expect(findings).toEqual([]);
  };
  const asksFor = (_ctx: unknown, name: string, spec: string) => {
    read = () => manifestFindings("package.json", { dependencies: { [name]: spec } });
  };

  Rule(
    "If a dependency is neither a workspace package nor a registry version that the lockfile pins with an integrity hash, then the audit shall report it and exit with status 1.",
    ({ RuleScenario }) => {
      RuleScenario("This workspace is clean", ({ When, Then }) => {
        When("the audit is run on this workspace", () => {
          findings = offlineFindings(ROOT, new Date());
        });
        Then("it reports nothing", reportsNothing);
      });

      RuleScenario("A dependency from a git URL", ({ Given, When, Then }) => {
        Given("a package.json that asks for {string} at {string}", asksFor);
        When("the audit reads it", reads);
        Then("it reports {string}", reports);
      });

      RuleScenario("A workspace package and a registry range pass", ({ Given, When, Then }) => {
        Given("a package.json that asks for {string} at {string}", asksFor);
        When("the audit reads it", reads);
        Then("it reports nothing", reportsNothing);
      });

      RuleScenario("A lockfile entry resolved from a tarball", ({ Given, When, Then }) => {
        Given("a lockfile that resolves a package with {string}", (_ctx, resolution: string) => {
          read = () => lockfileFindings(`lockfileVersion: '9.0'\n\npackages:\n\n  leftpad@1.0.0:\n    resolution: {${resolution}}\n`);
        });
        When("the audit reads it", reads);
        Then("it reports {string}", reports);
      });

      RuleScenario("A workspace with no lockfile", ({ Given, When, Then }) => {
        Given("a copy of this workspace without its pnpm-lock.yaml", () => {
          root = mkdtempSync(join(tmpdir(), "rung-6-supply-"));
          for (const file of [...MANIFESTS, "security/audit-allowlist.json"]) cpSync(join(ROOT, file), join(root, file));
        });
        When("the audit is run on the copy", () => {
          findings = offlineFindings(root, new Date());
        });
        Then("it reports {string}", reports);
      });
    },
  );

  Rule("If an audit allowance has no reason, no expiry date or an expiry date in the past, then the audit shall report it and exit with status 1.", ({ RuleScenario }) => {
    const anAllowance = (_ctx: unknown, reason: string, expires: string) => {
      allowance = { id: "GHSA-aaaa-bbbb-cccc", package: "leftpad", reason, expires };
    };
    const readsOn = (_ctx: unknown, day: string) => {
      findings = allowanceFindings([allowance], new Date(`${day}T12:00:00Z`));
    };

    RuleScenario("An allowance that has expired", ({ Given, When, Then }) => {
      Given("an allowance with the reason {string} that expires {string}", anAllowance);
      When("the audit reads it on {string}", readsOn);
      Then("it reports {string}", reports);
    });

    RuleScenario("An allowance with no reason", ({ Given, When, Then }) => {
      Given("an allowance with the reason {string} that expires {string}", anAllowance);
      When("the audit reads it on {string}", readsOn);
      Then("it reports {string}", reports);
    });

    RuleScenario("An allowance in date, with a reason, passes on its last day", ({ Given, When, Then }) => {
      Given("an allowance with the reason {string} that expires {string}", anAllowance);
      When("the audit reads it on {string}", readsOn);
      Then("it reports nothing", reportsNothing);
    });
  });
});
