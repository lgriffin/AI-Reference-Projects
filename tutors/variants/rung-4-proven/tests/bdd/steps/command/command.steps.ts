import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect, vi } from "vitest";
import { run } from "../../../../apps/cli/src/run.ts";
import { list } from "../../support/course.ts";

const feature = await loadFeature("tests/bdd/features/command/command.feature");

describeFeature(feature, ({ Rule }) => {
  let status: number;
  let printed: string;

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
});
