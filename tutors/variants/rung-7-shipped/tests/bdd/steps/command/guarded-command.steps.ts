import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect, vi } from "vitest";
import { run } from "../../../../apps/cli/src/run.ts";
import { ROOT } from "../../../support/paths.ts";

const feature = await loadFeature("tests/bdd/features/command/guarded-command.feature");

const HOSTILE = join(ROOT, "tests", "fixtures", "hostile-course");
const PRIVATE = join(ROOT, "tests", "fixtures", "private-course");

describeFeature(feature, ({ Rule }) => {
  let course: string;
  let out: string;
  let status: number;
  let printed: string;

  const theCourse = (folder: string) => () => {
    course = folder;
  };
  /** Runs the command quietly into an output folder that does not exist yet, keeping what it wrote to stderr. */
  const builds = async (_ctx: unknown, flag?: string) => {
    out = join(mkdtempSync(join(tmpdir(), "rung-6-guarded-")), "out");
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    try {
      status = await run([...(flag ? [flag] : []), course, out]);
      printed = stderr.mock.calls.map(([chunk]) => String(chunk)).join("");
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
    }
  };
  const exits = (_ctx: unknown, expected: number) => {
    expect(status, printed).toBe(expected);
  };
  const itPrinted = (_ctx: unknown, text: string) => {
    expect(printed).toContain(text);
  };
  const notMade = () => {
    expect(existsSync(out)).toBe(false);
  };
  const pages = () => readdirSync(out, { recursive: true, encoding: "utf8" }).filter((file) => file.endsWith(".html")).map((file) => readFileSync(join(out, file), "utf8"));

  Rule("If a path leaves the course folder while a course is built, then the command shall write nothing and exit with status 1.", ({ RuleScenario }) => {
    RuleScenario("A course.md that is a symbolic link to a file outside the course", ({ Given, When, Then, And }) => {
      Given("a copy of the hostile course whose course.md is a link to a file outside it", () => {
        const base = mkdtempSync(join(tmpdir(), "rung-6-link-"));
        course = join(base, "course");
        cpSync(HOSTILE, course, { recursive: true });
        mkdirSync(join(base, "home"));
        writeFileSync(join(base, "home", "secret.txt"), "# my private notes\n");
        rmSync(join(course, "course.md"));
        symlinkSync(join(base, "home", "secret.txt"), join(course, "course.md"));
      });
      When("the command builds it", builds);
      Then("it exits with status {int}", exits);
      And("it printed {string}", itPrinted);
      And("the output folder was not made", notMade);
    });
  });

  Rule(
    "If a course is private and the command is not given --private, then the command shall write nothing, say that the course is private and exit with status 1.",
    ({ RuleScenario }) => {
      RuleScenario("A course whose properties.yaml says auth: 1", ({ Given, When, Then, And }) => {
        Given("the private course", theCourse(PRIVATE));
        When("the command builds it", builds);
        Then("it exits with status {int}", exits);
        And("it printed {string}", itPrinted);
        And("the output folder was not made", notMade);
      });

      RuleScenario("--json-only is no way round the policy", ({ Given, When, Then, And }) => {
        Given("the private course", theCourse(PRIVATE));
        When("the command builds it with {string}", builds);
        Then("it exits with status {int}", exits);
        And("the output folder was not made", notMade);
      });
    },
  );

  Rule("When the command is given --private for a private course, the command shall write every page with a private notice and a noindex mark.", ({ RuleScenario }) => {
    RuleScenario("A private course built on purpose", ({ Given, When, Then, And }) => {
      Given("the private course", theCourse(PRIVATE));
      When("the command builds it with {string}", builds);
      Then("it exits with status {int}", exits);
      const everyPageHolds = (_ctx: unknown, text: string) => {
        expect(pages().length).toBeGreaterThan(0);
        for (const html of pages()) expect(html).toContain(text);
      };
      And("every page it wrote holds {string}", everyPageHolds);
      And("every page it wrote shows {string}", everyPageHolds);
    });

    RuleScenario("A public course built with --private is not marked", ({ Given, When, Then, And }) => {
      Given("the hostile course", theCourse(HOSTILE));
      When("the command builds it with {string}", builds);
      Then("it exits with status {int}", exits);
      And("no page it wrote holds {string}", (_ctx, text: string) => {
        expect(pages().length).toBeGreaterThan(0);
        for (const html of pages()) expect(html).not.toContain(text);
      });
    });
  });
});
