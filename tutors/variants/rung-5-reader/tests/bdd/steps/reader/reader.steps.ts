import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import type { Lab } from "@ladder/model";
import { readCourse } from "../../../../apps/reader/src/lib/course/course-service.ts";
import type { PageRequest } from "../../../../apps/reader/src/lib/course/course-service.ts";
import { liveLab } from "../../../../apps/reader/src/lib/course/live-lab.ts";
import type { LiveLab } from "../../../../apps/reader/src/lib/course/live-lab.ts";
import { breadCrumbs, decorateCourseTree, findLo } from "../../../../apps/reader/src/lib/course/lo-tree.ts";
import type { CourseTree } from "../../../../apps/reader/src/lib/course/lo-tree.ts";
import { list } from "../../support/course.ts";
import { host, oracle, openPage, servingOracle } from "../../support/reader.ts";
import type { Host } from "../../support/reader.ts";

const feature = await loadFeature("tests/bdd/features/reader/reader.feature");

describeFeature(feature, ({ Rule }) => {
  let site: Host;
  let pages: PageRequest<unknown>[];
  let course: CourseTree | undefined;
  let raw: ReturnType<typeof oracle>;
  let lab: Lab;
  let live: LiveLab | undefined;

  const opens = async (paths: string) => {
    pages = [];
    for (const path of list(paths)) pages.push(await openPage(path, site.fetch));
  };
  const serving = (_ctx: unknown, courseId: string) => {
    site = servingOracle(courseId);
  };
  const readsCourse = async (_ctx: unknown, courseId: string) => {
    course = await readCourse(courseId, site.fetch);
  };
  const decorated = (_ctx: unknown, courseId: string) => {
    raw = oracle();
    course = decorateCourseTree(raw, courseId);
  };
  const shown = (): LiveLab => {
    const page = pages.at(-1)!;
    if ("notFound" in page) throw new Error(page.notFound);
    return page.found as LiveLab;
  };

  Rule("The reader shall fetch a course's tutors.json at most once, from /courses/ followed by the course id, and reuse it for every page of that course.", ({ RuleScenario }) => {
    RuleScenario("Three pages of one course, one request", ({ Given, When, Then, And }) => {
      Given("a host that serves upstream's tutors.json for the shared fixture as the course {string}", serving);
      When("a learner opens {string}", (_ctx, paths: string) => opens(paths));
      Then("every page is found", () => {
        expect(pages.filter((page) => "notFound" in page)).toEqual([]);
        expect(pages).toHaveLength(3);
      });
      And("the host was asked only for {string}", (_ctx, url: string) => {
        expect(site.asked).toEqual([url]);
      });
    });
  });

  Rule(
    "If a course id holds a character other than a letter, a digit, an underscore or a hyphen, then the reader shall treat the course as not found without asking the host for anything.",
    ({ RuleScenario }) => {
      for (const title of ["A course id that climbs out of the courses folder", "A course id that names another host"]) {
        RuleScenario(title, ({ Given, When, Then, And }) => {
          Given("a host that serves upstream's tutors.json for the shared fixture as the course {string}", serving);
          When("the reader reads the course {string}", readsCourse);
          Then("the course is not found", () => {
            expect(course).toBeUndefined();
          });
          And("the host was asked for nothing", () => {
            expect(site.asked).toEqual([]);
          });
        });
      }
    },
  );

  Rule("If the host answers a course's address with anything but a course, then the reader shall treat the course as not found.", ({ RuleScenario }) => {
    const notFound = () => expect(course).toBeUndefined();

    RuleScenario("A static host answers a missing file with its fallback page", ({ Given, When, Then }) => {
      Given("a host that answers every address with its HTML fallback page", () => {
        site = host(() => ({ ok: true, json: () => Promise.reject(new SyntaxError("Unexpected token '<', \"<!doctype \"... is not valid JSON")) }));
      });
      When("the reader reads the course {string}", readsCourse);
      Then("the course is not found", notFound);
    });

    RuleScenario("The file is JSON, but not a course", ({ Given, When, Then }) => {
      Given("a host that answers every address with a topic's JSON", () => {
        site = host(() => ({ ok: true, json: async () => oracle().los[0] }));
      });
      When("the reader reads the course {string}", readsCourse);
      Then("the course is not found", notFound);
    });

    RuleScenario("The host has no such file", ({ Given, When, Then }) => {
      Given("a host that answers every address with status 404", () => {
        site = host(() => ({ ok: false, json: async () => oracle() }));
      });
      When("the reader reads the course {string}", readsCourse);
      Then("the course is not found", notFound);
    });
  });

  Rule(
    "The reader shall give the course, each topic, each talk, each note and each lab a page whose route holds the course id where tutors.json holds the COURSEURL placeholder.",
    ({ RuleScenario }) => {
      RuleScenario("The pages of the shared fixture, in reading order", ({ Given, Then }) => {
        Given("upstream's tutors.json for the shared fixture, read as the course {string}", decorated);
        Then("the reader has the pages {string}", (_ctx, routes: string) => {
          expect([...course!.loIndex.keys()]).toEqual(list(routes));
        });
      });

      RuleScenario("The fetched file is left as it came", ({ Given, Then }) => {
        Given("upstream's tutors.json for the shared fixture, read as the course {string}", decorated);
        Then("the first topic's route in the fetched file still holds {string}", (_ctx, placeholder: string) => {
          expect(raw.los[0].route).toContain(placeholder);
        });
      });
    },
  );

  Rule("When a lab is opened without a step in its URL, the reader shall show the lab's first step.", ({ RuleScenario }) => {
    for (const title of ["The lab's own route", "A route that names a step opens that step"]) {
      RuleScenario(title, ({ Given, When, Then }) => {
        Given("a host that serves upstream's tutors.json for the shared fixture as the course {string}", serving);
        When("a learner opens {string}", (_ctx, paths: string) => opens(paths));
        Then("the reader shows step {int} of {int}, {string}", (_ctx, number: number, of: number, title: string) => {
          const { step, index, lab } = shown();
          expect([index + 1, lab.los.length, step.title]).toEqual([number, of, title]);
        });
      });
    }
  });

  Rule("When a lab step is shown, the reader shall link to the step before it and the step after it, leaving out a link that the lab has no step for.", ({ RuleScenario }) => {
    const titles = ["A step in the middle links both ways", "The first step has no step before it", "The last step has no step after it", "A step id arrives URL-encoded"];
    for (const title of titles) {
      RuleScenario(title, ({ Given, When, Then }) => {
        Given("a lab with the steps {string}", (_ctx, ids: string) => {
          const steps = list(ids).map((id) => ({ type: "step" as const, id, shortTitle: id, title: id, contentMd: `# ${id}`, route: `/lab/c/book-1/${id}` }));
          lab = { type: "lab", id: "book-1", title: "Lab", summary: "", contentMd: "", route: "/lab/c/book-1", los: steps };
        });
        When("the step {string} is shown", (_ctx, stepId: string) => {
          live = liveLab(lab, stepId);
        });
        Then("it links back to {string} and on to {string}", (_ctx, previous: string, next: string) => {
          expect(live, "the step should open").toBeDefined();
          expect([live!.previous?.title ?? "", live!.next?.title ?? ""]).toEqual([previous, next]);
        });
      });
    }
  });

  Rule(
    "If a URL names a course, a page or a lab step that the course does not hold, then the reader shall answer 404 with a message that names what is missing.",
    ({ RuleScenario }) => {
      for (const title of ["An unknown course", "An unknown lab step", "A talk the course does not hold"]) {
        RuleScenario(title, ({ Given, When, Then }) => {
          Given("a host that serves upstream's tutors.json for the shared fixture as the course {string}", serving);
          When("a learner opens {string}", (_ctx, paths: string) => opens(paths));
          Then("the reader answers not found with {string}", (_ctx, message: string) => {
            expect(pages.at(-1)).toEqual({ notFound: message });
          });
        });
      }
    },
  );

  Rule("The reader shall show breadcrumbs from the course down to the page on screen, leaving out units and sides.", ({ RuleScenario }) => {
    for (const title of ["A note inside a unit", "The course page is its own only crumb"]) {
      RuleScenario(title, ({ Given, Then }) => {
        Given("upstream's tutors.json for the shared fixture, read as the course {string}", decorated);
        Then("the breadcrumbs of {string} are {string}", (_ctx, path: string, titles: string) => {
          const lo = findLo(course!, path);
          expect(lo, `no page at ${path}`).toBeDefined();
          expect(breadCrumbs(course!, lo!).map((crumb) => crumb.title)).toEqual(list(titles));
        });
      });
    }
  });
});
