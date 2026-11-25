import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { buildCourse, MemoryFileSystem, PathEscapeError } from "@ladder/gen";
import type { Course } from "@ladder/model";
import { courseFiles, list } from "../../support/course.ts";

const feature = await loadFeature("tests/bdd/features/generator/containment.feature");

describeFeature(feature, ({ Rule }) => {
  let fs: MemoryFileSystem;
  let course: Course | undefined;
  let warnings: string[];
  let outcomes: unknown[];
  let failure: unknown;

  const inMemory = () => {
    fs = new MemoryFileSystem(courseFiles());
  };
  const withLink = (_ctx: unknown, path: string, target: string) => {
    const files = courseFiles();
    delete files[path];
    fs = new MemoryFileSystem(files, { [path]: target });
  };
  const askedFor = async (_ctx: unknown, paths: string) => {
    outcomes = await Promise.all(list(paths).map((path) => fs.readText(path).catch((error: unknown) => error)));
  };
  const builds = async () => {
    warnings = [];
    failure = undefined;
    course = await buildCourse(fs, "c", { warn: (message) => warnings.push(message) }).catch((error: unknown) => ((failure = error), undefined));
  };
  const noteLinksTo = (_ctx: unknown, target: string) => {
    fs = new MemoryFileSystem({
      ...courseFiles(),
      "topic-1/unit-1/unit.md": "# Unit\n",
      "topic-1/unit-1/note-1/note.md": `# Note\n\n![a picture](${target}) [the web](https://tutors.dev)\n\n\`[in code](../../not-a-link.md)\`\n`,
    });
  };

  Rule(
    'If a path is absolute, climbs out with "..", or passes through a link that leads outside the course folder, then the generator shall refuse to read it with a PathEscapeError.',
    ({ RuleScenario }) => {
      RuleScenario("Paths that climb out or start at the root", ({ Given, When, Then }) => {
        Given("a course folder in memory", inMemory);
        When("the generator's file system is asked for {string}", askedFor);
        Then("every one of them is refused with a PathEscapeError", () => {
          expect(outcomes).toHaveLength(5);
          for (const outcome of outcomes) expect(outcome).toBeInstanceOf(PathEscapeError);
        });
      });

      RuleScenario("A course.md that is a link to a file outside the course", ({ Given, When, Then }) => {
        Given("a course folder in memory whose {string} is a link to {string}", withLink);
        When("the generator builds the course", builds);
        Then("the build is refused with a PathEscapeError that names {string}", (_ctx, path: string) => {
          expect(failure).toBeInstanceOf(PathEscapeError);
          expect((failure as PathEscapeError).path).toBe(path);
        });
      });

      RuleScenario("A link that stays inside the course is followed", ({ Given, When, Then }) => {
        Given("a course folder in memory whose {string} is a link to {string}", withLink);
        When("the generator's file system is asked for {string}", askedFor);
        Then("it reads {string}", (_ctx, text: string) => {
          expect(String(outcomes[0])).toContain(text);
        });
      });
    },
  );

  Rule(
    "When a page of a topic, a talk, a note or a lab uses a file outside its own folder, the generator shall report warning V021, naming the page and the file, through the warn option.",
    ({ RuleScenario }) => {
      RuleScenario("A note that shows a picture from a private folder", ({ Given, When, Then }) => {
        Given("a course whose note links to {string}", noteLinksTo);
        When("the generator builds the course", builds);
        Then("it warns {string}", (_ctx, start: string) => {
          expect(warnings).toHaveLength(1);
          expect(warnings[0]).toContain(start);
        });
      });

      RuleScenario("A link inside the folder, a web address and a link in code are not reported", ({ Given, When, Then }) => {
        Given("a course whose note links to {string}", noteLinksTo);
        When("the generator builds the course", builds);
        Then("it warns nothing", () => {
          expect(warnings).toEqual([]);
        });
      });
    },
  );

  Rule(
    "When a course folder holds properties.yaml or enrollment.yaml, the generator shall write the settings of properties.yaml as the course's properties and the educators and whitelist of enrollment.yaml as its enrollment.",
    ({ RuleScenario }) => {
      RuleScenario("A private course with an educator and a whitelist", ({ Given, When, Then, And }) => {
        Given("a course folder with the properties {string} and the enrollment {string}", (_ctx, properties: string, enrollment: string) => {
          // "educators: ada; whitelist: bob, eve" becomes two YAML lists.
          const yaml = enrollment.split(";").map((part) => part.trim().split(":")).map(([key, names]) => `${key}:\n${list(names!).map((name) => `  - ${name}\n`).join("")}`).join("");
          fs = new MemoryFileSystem({ ...courseFiles(), "properties.yaml": `${properties}\n`, "enrollment.yaml": yaml });
        });
        When("the generator builds the course", builds);
        Then("the course's auth property is {int}", (_ctx, auth: number) => {
          expect(course?.properties).toEqual({ auth });
        });
        And("the course's educators are {string} and its whitelist is {string}", (_ctx, educators: string, whitelist: string) => {
          expect(course?.enrollment).toEqual({ educators: list(educators), whitelist: list(whitelist) });
        });
      });

      RuleScenario("A course with neither file has neither field", ({ Given, When, Then }) => {
        Given("a course folder in memory", inMemory);
        When("the generator builds the course", builds);
        Then("the course has no properties and no enrollment", () => {
          expect(course).toBeDefined();
          expect(course).not.toHaveProperty("properties");
          expect(course).not.toHaveProperty("enrollment");
        });
      });
    },
  );
});
