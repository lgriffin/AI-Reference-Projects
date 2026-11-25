import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { buildSite, CSP, STYLE } from "@ladder/lite";
import type { SitePage } from "@ladder/lite";
import type { Course } from "@ladder/model";
import { ORACLE } from "../../../support/paths.ts";

const feature = await loadFeature("tests/bdd/features/site/safe-content.feature");

/** A course with one topic holding the given learning objects. */
function courseOf(...los: Course["los"]): Course {
  return {
    type: "course", id: "c", title: "Course", summary: "", contentMd: "# Course\n", route: "/",
    los: [{ type: "topic", id: "topic-1", title: "Topic", summary: "", contentMd: "# Topic\n", route: "/topic/{{COURSEURL}}/topic-1", los }],
  };
}

const directives = (policy: string) => new Map(policy.split(";").map((part) => part.trim().split(/\s+/)).map(([name, ...values]) => [name!, values.join(" ")]));

describeFeature(feature, ({ Rule }) => {
  let course: Course;
  let site: SitePage[];

  const page = (path: string) => site.find((p) => p.path === path)!.html;
  const noteIs = (_ctx: unknown, markdown: string) => {
    course = courseOf({ type: "note", id: "note-1", title: "Note", summary: "", contentMd: markdown, route: "/note/{{COURSEURL}}/topic-1/note-1" });
  };
  const built = () => {
    site = buildSite(course, { access: "public" });
  };
  const noPageHolds = (_ctx: unknown, text: string) => {
    expect(site.filter((p) => p.html.includes(text)).map((p) => p.path)).toEqual([]);
  };
  const notePageHolds = (_ctx: unknown, text: string) => {
    expect(page("topic-1/note-1/index.html")).toContain(text);
  };
  const blocked = (_ctx: unknown, count: number) => {
    expect(page("topic-1/note-1/index.html").split('class="blocked"').length - 1).toBe(count);
  };

  Rule(
    "If a link, an image or a web link in a course has an address whose scheme is not http, https or, for a link, mailto, then the site shall show its text without the address.",
    ({ RuleScenario }) => {
      RuleScenario("A javascript link keeps its text and loses its address", ({ Given, When, Then, And }) => {
        Given("a note whose Markdown is {string}", noteIs);
        When("the site is built", built);
        Then("the note's page holds {string}", notePageHolds);
        And("no page holds {string}", noPageHolds);
      });

      RuleScenario("Disguised schemes are refused too", ({ Given, When, Then }) => {
        Given("a note whose Markdown is {string}", noteIs);
        When("the site is built", built);
        Then("the note's page holds {int} blocked addresses", blocked);
      });

      RuleScenario("A web link whose address is script is a card without a link", ({ Given, When, Then, And }) => {
        Given("a web link whose address is {string}", (_ctx, address: string) => {
          course = courseOf({ type: "web", id: "web-1", title: "web-1", summary: "", contentMd: "", route: address });
        });
        When("the site is built", built);
        Then("the topic's page holds {string}", (_ctx, text: string) => {
          expect(page("topic-1/index.html")).toContain(text);
        });
        And("no page holds {string}", noPageHolds);
      });

      RuleScenario("The addresses a course needs keep working", ({ Given, When, Then, And }) => {
        Given("a note whose Markdown is {string}", noteIs);
        When("the site is built", built);
        Then("the note's page holds {int} blocked addresses", blocked);
        And("the note's page holds {string}", notePageHolds);
      });
    },
  );

  Rule("The site shall carry in every page a Content Security Policy that allows no script and no style but the site's own style sheet.", ({ RuleScenario }) => {
    RuleScenario("Every page of the shared fixture carries the policy, first", ({ Given, When, Then, And }) => {
      Given("upstream's tutors.json for the shared fixture", () => {
        course = JSON.parse(readFileSync(ORACLE, "utf8"));
      });
      When("the site is built", built);
      Then("every page carries the policy straight after its charset", () => {
        expect(site.length).toBeGreaterThan(0);
        for (const { path, html } of site) {
          const metas = [...html.matchAll(/<meta ([^>]*)>/g)].map((m) => m[1]!.replaceAll("&#39;", "'"));
          expect(metas.slice(0, 2), path).toEqual(['charset="utf-8"', `http-equiv="Content-Security-Policy" content="${CSP}"`]);
        }
      });
      And("no page holds {string}", noPageHolds);
    });

    RuleScenario("The policy names nothing that could run", ({ Then, And }) => {
      Then("the policy's {string} is {string}", (_ctx, name: string, value: string) => {
        expect(directives(CSP).get(name)).toBe(value);
      });
      And("the policy has no {string}", (_ctx, name: string) => {
        expect(directives(CSP).has(name)).toBe(false);
      });
      And("the policy's {string} is the SHA-256 hash of the site's style sheet", (_ctx, name: string) => {
        expect(directives(CSP).get(name)).toBe(`'sha256-${createHash("sha256").update(STYLE).digest("base64")}'`);
      });
      And("the policy holds neither {string} nor {string}", (_ctx, one: string, other: string) => {
        expect(CSP).not.toContain(one);
        expect(CSP).not.toContain(other);
      });
    });
  });
});
