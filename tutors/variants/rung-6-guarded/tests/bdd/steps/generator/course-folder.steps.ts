import { readFileSync } from "node:fs";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { buildCourse } from "@ladder/gen";
import type { FileSystemPort } from "@ladder/gen";
import type { Course } from "@ladder/model";
import { NodeFileSystem } from "../../../../apps/cli/src/node-file-system.ts";
import { ORACLE, SAMPLE_COURSE } from "../../../support/paths.ts";
import { project } from "../../../support/tutors-json.ts";
import { byId, courseFiles, files, folders, list, memory, unescape } from "../../support/course.ts";

const feature = await loadFeature("tests/bdd/features/generator/course-folder.feature");

describeFeature(feature, ({ BeforeEachScenario, Rule }) => {
  let fs: FileSystemPort;
  let courseId: string;
  let course: Course;
  let failure: Error | undefined;
  let warnings: string[];

  BeforeEachScenario(() => {
    courseId = "c";
    failure = undefined;
    warnings = [];
  });

  /** The When every Rule shares: build the course, keeping a failure for the Then to check. */
  const build = async () => {
    try {
      course = await buildCourse(fs, courseId, { warn: (message) => warnings.push(message) });
    } catch (error) {
      failure = error as Error;
    }
  };
  const built = async () => course;

  const topic = async (id: string) => {
    const course = await built();
    const lo = byId(course, id);
    if (lo.type !== "topic") throw new Error(`${id} is a ${lo.type}, not a topic`);
    return lo;
  };

  const lab = async (id: string) => {
    const lo = byId(await built(), id);
    if (lo.type !== "lab") throw new Error(`${id} is a ${lo.type}, not a lab`);
    return lo;
  };

  const givenTopic = (_ctx: unknown, id: string, names: string) => {
    fs = memory({ ...courseFiles(id), ...folders(id, list(names)) });
  };

  Rule("The generator shall give each folder the learning-object kind named by the longest known prefix of its name.", ({ RuleScenario }) => {
    for (const title of ["A note, a talk and a lab are recognised by their prefixes", "A notebook is not a note", "A folder that names no kind is not content"]) {
      RuleScenario(title, ({ Given, When, Then }) => {
        Given("a course with a topic {string} holding the folders {string}", givenTopic);
        When("the course is built", build);
        Then("the topic {string} holds the kinds {string}", async (_ctx, id: string, kinds: string) => {
          expect((await topic(id)).los.map((lo) => lo.type)).toEqual(list(kinds));
        });
      });
    }
  });

  Rule("If a course folder has no course.md, then the generator shall refuse to build it and say that course.md is missing.", ({ RuleScenario }) => {
    RuleScenario("A folder of topics without course.md", ({ Given, When, Then }) => {
      Given("a folder holding only {string}", (_ctx, path: string) => {
        fs = memory({ [path]: "# T\n" });
      });
      When("the course is built", build);
      Then("the build fails with {string}", async (_ctx, message: string) => {
        expect(failure?.message).toContain(message);
      });
    });
  });

  Rule("The generator shall order the learning objects inside a topic, unit or side by kind, in upstream's preOrder, and then by folder name.", ({ RuleScenario }) => {
    RuleScenario("Kinds first, then names", ({ Given, When, Then }) => {
      Given("a course with a topic {string} holding the folders {string}", givenTopic);
      When("the course is built", build);
      Then("the topic {string} holds the ids {string}", async (_ctx, id: string, ids: string) => {
        expect((await topic(id)).los.map((lo) => lo.id)).toEqual(list(ids));
      });
    });
  });

  Rule(
    "When a lab folder holds markdown files, the generator shall write one step per file, in file-name order, whose id is the file name between its first and last dot.",
    ({ RuleScenario }) => {
      const givenLab = (_ctx: unknown, path: string, names: string) => {
        fs = memory({ ...courseFiles(path.split("/")[0]), ...files(path, list(names)) });
      };

      RuleScenario("The steps of a lab", ({ Given, When, Then, And }) => {
        Given("a course with a lab {string} holding the files {string}", givenLab);
        When("the course is built", build);
        Then("the lab {string} has the steps {string}", async (_ctx, id: string, steps: string) => {
          const { los } = await lab(id);
          expect(los.map((step) => step.id)).toEqual(list(steps));
          expect(los.map((step) => step.shortTitle)).toEqual(list(steps));
        });
        And("each step of the lab {string} has the lab's route followed by its id", async (_ctx, id: string) => {
          const { route, los } = await lab(id);
          expect(route).toBe("/lab/{{COURSEURL}}/topic-1/book-1");
          for (const step of los) expect(step.route).toBe(`${route}/${step.id}`);
        });
      });

      RuleScenario("A lab with img/main.png takes its first step's id as its title", ({ Given, When, Then }) => {
        Given("a course with a lab {string} holding the files {string}", givenLab);
        When("the course is built", build);
        Then("the lab {string} has the title {string}", async (_ctx, id: string, title: string) => {
          expect((await lab(id)).title).toBe(title);
        });
      });
    },
  );

  Rule(
    "If a folder names a kind that this rung does not build, then the generator shall leave it out and report its path through the warn option.",
    ({ RuleScenario }) => {
      RuleScenario("A notebook and a podcast are reported and left out", ({ Given, When, Then, And }) => {
        Given("a course with a topic {string} holding the folders {string}", givenTopic);
        When("the course is built", build);
        Then("the topic {string} holds the ids {string}", async (_ctx, id: string, ids: string) => {
          expect((await topic(id)).los.map((lo) => lo.id)).toEqual(list(ids));
        });
        And("the build warned {string}", async (_ctx, expected: string) => {
          expect(warnings).toEqual(list(expected));
        });
      });
    },
  );

  Rule(
    "The generator shall take a learning object's title and summary from the first two lines of its markdown after removing front matter.",
    ({ RuleScenario }) => {
      for (const title of ["Front matter is not the title", "A heading's marks are not part of the title"]) {
        RuleScenario(title, ({ Given, When, Then }) => {
          Given("a course with a note {string} whose markdown is {string}", (_ctx, path: string, markdown: string) => {
            fs = memory({ ...courseFiles(path.split("/")[0]), [`${path}/note.md`]: unescape(markdown) });
          });
          When("the course is built", build);
          Then("the learning object {string} has the title {string} and the summary {string}", async (_ctx, id: string, title: string, summary: string) => {
            const lo = byId(await built(), id);
            expect([lo.title, lo.summary]).toEqual([title, summary]);
            expect(lo.contentMd).not.toMatch(/^---/);
          });
        });
      }
    },
  );

  Rule("The generator shall write the same value as upstream's tutors.json for every field this rung builds.", ({ RuleScenario }) => {
    RuleScenario("The shared fixture matches upstream's oracle", ({ Given, When, Then }) => {
      Given("the shared fixture course read from the disk", () => {
        fs = new NodeFileSystem(SAMPLE_COURSE);
        courseId = "ladder-sample-course";
      });
      When("the course is built", build);
      Then("every field this rung builds equals the field in upstream's tutors.json", async () => {
        expect(project(await built())).toEqual(project(JSON.parse(readFileSync(ORACLE, "utf8"))));
      });
    });
  });
});
