import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect, vi } from "vitest";
import { main as checkClaimsMain } from "../../../../scripts/check-release-claims.ts";
import { gaps, renderA3, verdict } from "../../../../scripts/lib/a3.ts";
import type { Readiness } from "../../../../scripts/lib/a3.ts";
import { bumpFor, nextVersion, parseCommits } from "../../../../scripts/lib/conventional.ts";
import { evaluate, exitStatus } from "../../../../scripts/lib/slo.ts";
import type { Objective, Result } from "../../../../scripts/lib/slo.ts";
import { imageProblems } from "../../../../scripts/lib/smoke.ts";
import { renderValueStream, runSteps, summarise } from "../../../../scripts/lib/value-stream.ts";
import type { PlannedStep, Step } from "../../../../scripts/lib/value-stream.ts";

const feature = await loadFeature("tests/bdd/features/release/release.feature");

/** "fix: a; feat: b" as two commit messages. A message may hold a comma, so the list is split on "; ". */
const messagesIn = (text: string) => text.split("; ");

describeFeature(feature, ({ Rule }) => {
  let status: number;
  let reported: string;

  const exits = (_ctx: unknown, expected: number) => {
    expect(status, reported).toBe(expected);
  };
  const itReported = (_ctx: unknown, text: string) => {
    expect(reported).toContain(text);
  };

  Rule(
    "The release shall take its next version from the largest change its Conventional Commits name: major for a breaking change, minor for a feat, patch for a fix or a perf.",
    ({ RuleScenario }) => {
      let messages: string[];
      let next: string;
      for (const title of ["A feature among fixes is a minor release", "Only fixes and a perf make a patch release", "One breaking change outranks everything", "Chores release nothing"]) {
        RuleScenario(title, ({ Given, When, Then }) => {
          Given("the commits {string}", (_ctx, list: string) => {
            messages = messagesIn(list);
          });
          When("the release derives the version after {string}", (_ctx, current: string) => {
            next = nextVersion(current, bumpFor(parseCommits(messages.join("\n---\n")).commits));
          });
          Then("the next version is {string}", (_ctx, expected: string) => {
            expect(next).toBe(expected);
          });
        });
      }
    },
  );

  Rule(
    "If a release claim names no evidence, or names evidence that is not a test or a scenario that exists and runs, then the release shall report the claim and exit with status 1.",
    ({ RuleScenario }) => {
      let file: string;
      /** Runs the command's own main quietly: its exit status is the rule. */
      const check = (path?: string) => {
        const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
        const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
        try {
          status = checkClaimsMain(path ? [path] : []);
          reported = stderr.mock.calls.map(([chunk]) => String(chunk)).join("");
        } finally {
          stdout.mockRestore();
          stderr.mockRestore();
        }
      };
      const aClaimsFile = (_ctx: unknown, id: string, evidence: string) => {
        file = join(mkdtempSync(join(tmpdir(), "rung-7-claims-")), "claims.yaml");
        writeFileSync(file, `claims:\n  - id: ${id}\n    promise: Every page loads at once.\n    evidence: ${evidence === "" ? "[]" : `\n      - ${JSON.stringify(evidence)}`}\n`);
      };
      const checksThatFile = () => check(file);

      RuleScenario("The claims of this release all have evidence", ({ When, Then }) => {
        When("the release checks its own claims", () => check());
        Then("it exits with status {int}", exits);
      });
      for (const title of ["A promise with no evidence", "Evidence that names a test nobody wrote", "A grading test is never evidence"]) {
        RuleScenario(title, ({ Given, When, Then, And }) => {
          Given("a claims file whose claim {string} has the evidence {string}", aClaimsFile);
          When("the release checks that file", checksThatFile);
          Then("it exits with status {int}", exits);
          And("it reported {string}", itReported);
        });
      }
      RuleScenario("A scenario is evidence too", ({ Given, When, Then }) => {
        Given("a claims file whose claim {string} has the evidence {string}", aClaimsFile);
        When("the release checks that file", checksThatFile);
        Then("it exits with status {int}", exits);
      });
    },
  );

  Rule("If a measure of the build is over the budget of its objective, or was not measured, then the release shall report the objective and exit with status 1.", ({ RuleScenario }) => {
    let objective: Objective;
    let siteBytes: number;
    let results: Result[];
    const anObjective = (_ctx: unknown, id: string, budget: number, measure: string) => {
      objective = { id, measure, budget };
    };
    const aBuild = (_ctx: unknown, bytes: number) => {
      siteBytes = bytes;
    };
    const judges = () => {
      results = evaluate([objective], { buildMs: 100, files: [{ path: "index.html", bytes: siteBytes }] });
      status = exitStatus(results);
      reported = results.map((r) => r.message).join("\n");
    };

    RuleScenario("A site within its budget", ({ Given, And, When, Then }) => {
      Given("the objective {string} with a budget of {int} for {string}", anObjective);
      And("a build whose site is {int} bytes", aBuild);
      When("the release judges the build", judges);
      Then("it exits with status {int}", exits);
    });
    RuleScenario("A site over its budget", ({ Given, And, When, Then }) => {
      Given("the objective {string} with a budget of {int} for {string}", anObjective);
      And("a build whose site is {int} bytes", aBuild);
      When("the release judges the build", judges);
      Then("it exits with status {int}", exits);
      And("it reported {string}", itReported);
      And("it also reported {string}", itReported);
    });
    RuleScenario("A reader nobody built", ({ Given, And, When, Then }) => {
      Given("the objective {string} with a budget of {int} for {string}", anObjective);
      And("a build whose site is {int} bytes", aBuild);
      When("the release judges the build", judges);
      Then("it exits with status {int}", exits);
      And("it reported {string}", itReported);
    });
  });

  Rule("The release shall write a readiness page whose verdict is HOLD when a check has a gap, and READY only when no check has one.", ({ RuleScenario }) => {
    let release: Readiness;
    let page: string;
    const clean = () => {
      release = {
        app: "tutors-ladder",
        version: "1.1.0",
        commit: "1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d",
        date: "2026-11-25",
        changelog: "### Added\n\n- **cli:** --version",
        dirty: false,
        claims: { count: 14, problems: [] },
        slo: [{ id: "site-size", measure: "site-bytes", unit: "bytes", value: 18000, budget: 25000, ok: true, message: "ok" }],
        supplyChain: { findings: [] },
        mutation: { status: "passed", reason: "every file holds its floor", score: 94.2 },
        container: { status: "passed", reason: "every check passed" },
      };
    };
    const writes = () => {
      page = renderA3(release);
    };
    const theVerdict = (_ctx: unknown, expected: string) => {
      expect(verdict(release)).toBe(expected);
      expect(page).toContain(`**${expected}.**`);
    };

    RuleScenario("Every check is clean", ({ Given, When, Then }) => {
      Given("a release whose every check passed", clean);
      When("the release writes its readiness page", writes);
      Then("the verdict is {string}", theVerdict);
    });
    RuleScenario("One claim has lost its evidence", ({ Given, But, When, Then, And }) => {
      Given("a release whose every check passed", clean);
      But("one claim has a problem", () => {
        release.claims.problems.push('Claim "no-inline-script" cites a test that is skipped.');
      });
      When("the release writes its readiness page", writes);
      Then("the verdict is {string}", theVerdict);
      And("the page lists the gap under {string}", (_ctx, area: string) => {
        expect(gaps(release).map((g) => g.area)).toEqual([area]);
        expect(page).toContain(`1. **${area}.**`);
      });
    });
    RuleScenario("A check that did not run is not a pass", ({ Given, But, When, Then }) => {
      Given("a release whose every check passed", clean);
      But("the container smoke check was skipped", () => {
        release.container = { status: "skipped", reason: "no Docker daemon" };
      });
      When("the release writes its readiness page", writes);
      Then("the verdict is {string}", theVerdict);
    });
  });

  Rule("If the image runs as root, or its revision is not the commit it was built from, then the release shall fail the container smoke check and say which.", ({ RuleScenario }) => {
    let image: { user: string; revision: string };
    let problems: string[];
    const anImage = (_ctx: unknown, user: string, revision: string) => {
      image = { user, revision };
    };
    const inspects = (_ctx: unknown, commit: string) => {
      problems = imageProblems(image, commit);
    };
    for (const title of ["An image that runs as root", "An image with no user at all", "An image built from another commit"]) {
      RuleScenario(title, ({ Given, When, Then }) => {
        Given("an image whose user is {string} and whose revision is {string}", anImage);
        When("the release inspects it for the commit {string}", inspects);
        Then("the smoke check fails with {string}", (_ctx, text: string) => {
          expect(problems).toHaveLength(1);
          expect(problems[0]).toContain(text);
        });
      });
    }
    RuleScenario("The image this rung builds", ({ Given, When, Then }) => {
      Given("an image whose user is {string} and whose revision is {string}", anImage);
      When("the release inspects it for the commit {string}", inspects);
      Then("the smoke check passes", () => {
        expect(problems).toEqual([]);
      });
    });
  });

  Rule("When the release measures its value stream, the release shall report the process time of each step and the lead time, and run no step after one that failed.", ({ RuleScenario }) => {
    let plan: (PlannedStep & { seconds: number })[];
    let waits: Record<string, number>;
    let failing: string | undefined;
    let steps: Step[];
    const theSteps = (_ctx: unknown, first: string, firstSeconds: number, second: string, secondSeconds: number) => {
      plan = [
        { id: first, sop: 4, what: first, command: `pnpm ${first}`, seconds: firstSeconds },
        { id: second, sop: 6, what: second, command: `pnpm ${second}`, seconds: secondSeconds },
      ];
      waits = {};
      failing = undefined;
    };
    const measures = () => {
      steps = runSteps(plan, { skip: [], with: [], waits }, (step) => ({ seconds: plan.find((p) => p.id === step.id)!.seconds, ok: step.id !== failing }));
    };

    RuleScenario("Process time, waiting and lead time", ({ Given, And, When, Then }) => {
      Given("the steps {string} taking {int} seconds and {string} taking {int} seconds", theSteps);
      And("the release waited {int} seconds before {string}", (_ctx, seconds: number, id: string) => {
        waits[id] = seconds;
      });
      When("the release measures its value stream", measures);
      Then("the process time is {int} seconds and the lead time is {int} seconds", (_ctx, process: number, lead: number) => {
        expect(summarise(steps)).toMatchObject({ processSeconds: process, leadSeconds: lead });
      });
      And("the flow efficiency is {int} percent", (_ctx, percent: number) => {
        expect(summarise(steps).flowEfficiency * 100).toBe(percent);
      });
      And("the map has a row for {string} and a row for {string}", (_ctx, first: string, second: string) => {
        const map = renderValueStream(steps, { version: "1.0.0", commit: "abc1234", date: "2026-11-25" });
        expect(map).toContain(`| 1 | ${first} | 4 | \`pnpm ${first}\` | - | 20.0 s | 67% | passed |`);
        expect(map).toContain(`| 2 | ${second} | 6 | \`pnpm ${second}\` | 30.0 s | 10.0 s | 33% | passed |`);
        expect(map).toContain("- **Lead time:** 1 min 00 s");
      });
    });
    RuleScenario("A failed step stops the line", ({ Given, And, When, Then }) => {
      Given("the steps {string} taking {int} seconds and {string} taking {int} seconds", theSteps);
      And("the step {string} fails", (_ctx, id: string) => {
        failing = id;
      });
      When("the release measures its value stream", measures);
      Then("the step {string} is {string}", (_ctx, id: string, expected: string) => {
        expect(steps.find((s) => s.id === id)?.status).toBe(expected);
      });
      And("the lead time is {int} seconds", (_ctx, lead: number) => {
        expect(summarise(steps).leadSeconds).toBe(lead);
        expect(summarise(steps).stopped).toBe("gate");
      });
    });
  });
});
