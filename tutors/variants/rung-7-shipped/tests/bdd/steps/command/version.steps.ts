import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect, vi } from "vitest";
import { buildIdentity } from "@ladder/lite";
import type { BuildIdentity } from "@ladder/lite";
import { run } from "../../../../apps/cli/src/run.ts";
import { SAMPLE_COURSE } from "../../../support/paths.ts";
import { list } from "../../support/course.ts";

const feature = await loadFeature("tests/bdd/features/command/version.feature");

describeFeature(feature, ({ Rule }) => {
  let identity: BuildIdentity;
  let folder: string;
  let status: number;
  let printed: string;

  const aBuild = (_ctx: unknown, version: string, commit: string) => {
    identity = buildIdentity("tutors-ladder", version, commit);
  };
  /** Runs the command quietly and keeps what it printed, on either stream. */
  const quietly = async (args: string[]) => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    try {
      status = await run(args, identity);
      printed = [...stdout.mock.calls, ...stderr.mock.calls].map(([chunk]) => String(chunk)).join("");
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
    }
  };
  const runIn = async (_ctx: unknown, args: string) => {
    folder = mkdtempSync(join(tmpdir(), "rung-7-version-"));
    await quietly(list(args).map((arg) => (arg.startsWith("--") ? arg : join(folder, arg))));
  };
  const builds = async (_ctx: unknown, flag?: string) => {
    folder = mkdtempSync(join(tmpdir(), "rung-7-identity-"));
    await quietly([...(flag ? [flag] : []), SAMPLE_COURSE, folder]);
  };
  const exits = (_ctx: unknown, expected: number) => {
    expect(status, printed).toBe(expected);
  };
  const stillEmpty = () => {
    expect(readdirSync(folder)).toEqual([]);
  };
  const files = () => readdirSync(folder, { recursive: true, encoding: "utf8" }).filter((file) => /\.\w+$/.test(file));

  Rule("When the command is given --version alone, the command shall print the release version and the commit it was built from, and write no file.", ({ RuleScenario }) => {
    RuleScenario("--version on its own", ({ Given, When, Then, And }) => {
      Given("a build of version {string} from commit {string}", aBuild);
      When("the command is run with {string} in an empty folder", runIn);
      Then("it exits with status {int}", exits);
      And("it printed {string}", (_ctx, text: string) => {
        expect(printed).toBe(`${text}\n`);
      });
      And("the folder is still empty", stillEmpty);
    });

    RuleScenario("--version beside a course folder is a usage error", ({ Given, When, Then, And }) => {
      Given("a build of version {string} from commit {string}", aBuild);
      When("the command is run with {string} in an empty folder", runIn);
      Then("it exits with status {int}", exits);
      And("the folder is still empty", stillEmpty);
    });
  });

  Rule("The command shall write the build identity of a site into its version.json and into no other file.", ({ RuleScenario }) => {
    RuleScenario("A site names its release in one file", ({ Given, When, Then, And }) => {
      Given("a build of version {string} from commit {string}", aBuild);
      When("the command builds the shared fixture", builds);
      Then("version.json holds the version {string} and the revision {string}", (_ctx, version: string, revision: string) => {
        expect(JSON.parse(readFileSync(join(folder, "version.json"), "utf8"))).toEqual({ app: "tutors-ladder", version, revision, built: "unknown" });
      });
      And("no other file it wrote holds {string} or {string}", (_ctx, version: string, commit: string) => {
        const leaks = files().filter((file) => file !== "version.json").filter((file) => [version, commit].some((text) => readFileSync(join(folder, file), "utf8").includes(text)));
        expect(leaks).toEqual([]);
      });
    });

    RuleScenario("The reader's contract carries no identity", ({ Given, When, Then }) => {
      Given("a build of version {string} from commit {string}", aBuild);
      When("the command builds the shared fixture with {string}", builds);
      Then("it wrote tutors.json alone", () => {
        expect(status).toBe(0);
        expect(readdirSync(folder)).toEqual(["tutors.json"]);
      });
    });
  });
});
