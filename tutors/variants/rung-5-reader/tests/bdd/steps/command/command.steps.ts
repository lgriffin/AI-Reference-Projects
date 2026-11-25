import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect, vi } from "vitest";
import { run } from "../../../../apps/cli/src/run.ts";
import { SAMPLE_COURSE } from "../../../support/paths.ts";
import { list } from "../../support/course.ts";

const feature = await loadFeature("tests/bdd/features/command/command.feature");

describeFeature(feature, ({ Rule }) => {
  let status: number;
  let printed: string;
  let out: string;

  /** Runs the command quietly, into a new output folder that does not exist yet. */
  const runInto = async (args: (out: string) => string[]) => {
    out = join(mkdtempSync(join(tmpdir(), "rung-5-json-only-")), "courses", "ladder-sample-course");
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      status = await run(args(out));
    } finally {
      stdout.mockRestore();
    }
  };

  Rule(
    "If the command is not given both a course folder and an output folder, then the command shall print its usage and exit with status 2.",
    ({ RuleScenario }) => {
      for (const title of ["No arguments at all", "A course folder but no output folder"]) {
        RuleScenario(title, ({ When, Then, And }) => {
          When("the command is run with {string}", async (_ctx, args: string) => {
            const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
            try {
              status = await run(list(args));
              printed = stderr.mock.calls.map(([chunk]) => String(chunk)).join("");
            } finally {
              stderr.mockRestore();
            }
          });
          Then("it exits with status {int}", (_ctx, expected: number) => {
            expect(status).toBe(expected);
          });
          And("it printed {string}", (_ctx, text: string) => {
            expect(printed).toContain(text);
          });
        });
      }
    },
  );

  Rule("When the command is given --json-only, the command shall write tutors.json and no pages.", ({ RuleScenario }) => {
    RuleScenario("The reader's course is the contract alone", ({ When, Then, And }) => {
      When("the command is run with --json-only on the shared fixture", () => runInto((dir) => ["--json-only", SAMPLE_COURSE, dir]));
      Then("it exits with status {int}", (_ctx, expected: number) => {
        expect(status).toBe(expected);
      });
      And("the output folder holds only {string}", (_ctx, name: string) => {
        expect(readdirSync(out)).toEqual([name]);
      });
      And("the tutors.json it wrote is the course {string}", (_ctx, id: string) => {
        expect(JSON.parse(readFileSync(join(out, "tutors.json"), "utf8"))).toMatchObject({ type: "course", id });
      });
    });

    RuleScenario("The flag may come after the folders", ({ When, Then, And }) => {
      When("the command is run on the shared fixture with --json-only last", () => runInto((dir) => [SAMPLE_COURSE, dir, "--json-only"]));
      Then("it exits with status {int}", (_ctx, expected: number) => {
        expect(status).toBe(expected);
      });
      And("the output folder holds only {string}", (_ctx, name: string) => {
        expect(readdirSync(out)).toEqual([name]);
      });
    });
  });
});
