import { readFileSync } from "node:fs";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { buildSite } from "@ladder/lite";
import type { SitePage } from "@ladder/lite";
import type { Course, Lab, Talk } from "@ladder/model";
import { ORACLE } from "../../../support/paths.ts";
import { list, unescape } from "../../support/course.ts";

const feature = await loadFeature("tests/bdd/features/site/static-site.feature");

/** A course with one topic holding the given learning objects. */
function courseOf(...los: Course["los"]): Course {
  return {
    type: "course", id: "c", title: "Course", summary: "", contentMd: "# Course\n", route: "/",
    los: [{ type: "topic", id: "topic-1", title: "Topic", summary: "", contentMd: "# Topic\n", route: "/topic/{{COURSEURL}}/topic-1", los }],
  };
}

const lo = (id: string, text = id) => ({ id, title: text, summary: text, contentMd: text, route: `/x/${id}` });

describeFeature(feature, ({ Rule }) => {
  let course: Course;
  let site: SitePage[];

  const page = (path: string) => {
    const found = site.find((p) => p.path.endsWith(path));
    if (!found) throw new Error(`no page ${path}; the site has ${site.map((p) => p.path).join(", ")}`);
    return found.html;
  };

  const built = () => {
    site = buildSite(course, { access: "public" });
  };

  const fromOracle = () => {
    course = JSON.parse(readFileSync(ORACLE, "utf8"));
  };

  Rule("The site shall escape every piece of course text that it writes into a page.", ({ RuleScenario }) => {
    RuleScenario("A script in every field of every kind stays text", ({ Given, When, Then }) => {
      Given("a course whose every title, summary, body and link is {string}", (_ctx, evil: string) => {
        const course0 = courseOf(
          { ...lo("talk-1", evil), type: "talk", contentMd: `${evil}\n---\n${evil}` },
          { ...lo("note-1", evil), type: "note" },
          { ...lo("web-1", evil), type: "web", route: evil },
          { ...lo("archive-1", evil), type: "archive", archiveFile: evil },
          { ...lo("book-1", evil), type: "lab", los: [{ type: "step", id: "s", shortTitle: "s", title: evil, contentMd: evil, route: "" }] },
          { ...lo("unit-1", evil), type: "unit", los: [{ ...lo("note-2", evil), type: "note" }] },
        );
        course = { ...course0, title: evil, summary: evil, contentMd: `# ${evil}\n\n${evil}` };
      });
      When("the site is built", built);
      Then("no page holds {string}", (_ctx, text: string) => {
        for (const { path, html } of site) expect(html, path).not.toContain(text);
      });
    });

    RuleScenario("A quote cannot leave an attribute", ({ Given, When, Then }) => {
      Given("a course with a web link whose URL ends with a quote and an onclick attribute", () => {
        course = courseOf({ ...lo("web-1"), type: "web", route: 'https://a.dev/" onclick="alert(1)' });
      });
      When("the site is built", built);
      Then('no page holds a quote followed by {string}', (_ctx, text: string) => {
        for (const { path, html } of site) expect(html, path).not.toContain(`"${text}`);
      });
    });
  });

  Rule(
    "The site shall write one page for the course, each topic, each talk, each note and each lab step, at the paths upstream's tutors-lite uses.",
    ({ RuleScenario }) => {
      RuleScenario("The pages of the shared fixture", ({ Given, When, Then }) => {
        Given("upstream's tutors.json for the shared fixture", fromOracle);
        When("the site is built", built);
        Then("the site has the pages {string}", (_ctx, paths: string) => {
          expect(site.map((p) => p.path).sort()).toEqual(list(paths).sort());
        });
      });

      RuleScenario("Every page links home and up", ({ Given, When, Then }) => {
        Given("upstream's tutors.json for the shared fixture", fromOracle);
        When("the site is built", built);
        Then("the page {string} links home to {string} and up to {string}", (_ctx, path: string, home: string, up: string) => {
          expect(page(path)).toContain(`<nav><a href="${home}">Home</a><a href="${up}">Up</a></nav>`);
        });
      });
    },
  );

  Rule("When a lab has more than one step, the site shall link each step page to the step before it and the step after it.", ({ RuleScenario }) => {
    RuleScenario("The middle step links both ways", ({ Given, When, Then, And }) => {
      Given("a course with a lab whose steps are {string}", (_ctx, names: string) => {
        const steps: Lab["los"] = list(names).map((name) => ({ type: "step", id: name, shortTitle: name, title: name, contentMd: `# ${name}`, route: "" }));
        course = courseOf({ ...lo("book-1"), type: "lab", los: steps });
      });
      When("the site is built", built);
      Then("the step page {string} links to the previous page {string} and the next page {string}", (_ctx, path: string, previous: string, next: string) => {
        expect(page(`book-1/${path}`)).toContain(`<p><a href="${previous}">Previous</a> <a href="${next}">Next</a></p>`);
      });
      And("the step page {string} has no previous link", (_ctx, path: string) => {
        expect(page(`book-1/${path}`)).not.toContain("Previous");
        expect(page(`book-1/${path}`)).toContain("Next</a>");
      });
      And("the step page {string} has no next link", (_ctx, path: string) => {
        expect(page(`book-1/${path}`)).not.toContain("Next");
        expect(page(`book-1/${path}`)).toContain("Previous</a>");
      });
    });
  });

  Rule("When a talk holds a Marp deck, the site shall show each slide of the deck as its own section.", ({ RuleScenario }) => {
    RuleScenario("Three slides, three sections", ({ Given, When, Then }) => {
      Given("a course with a talk whose deck is {string}", (_ctx, deck: string) => {
        const talk: Talk = { ...lo("talk-1"), type: "talk", contentMd: unescape(deck) };
        course = courseOf(talk);
      });
      When("the site is built", built);
      Then("the talk's page has {int} slide sections, the second starting with {string}", (_ctx, count: number, start: string) => {
        const sections = page("talk-1/index.html").split('<section class="slide">').slice(1);
        expect(sections).toHaveLength(count);
        expect(sections[1]!.startsWith(start)).toBe(true);
      });
    });
  });
});
