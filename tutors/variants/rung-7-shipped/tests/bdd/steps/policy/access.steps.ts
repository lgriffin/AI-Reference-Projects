import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { FakeSession, githubActor } from "@ladder/identity";
import type { Actor } from "@ladder/identity";
import { accessOf, canView, isPublic } from "@ladder/rbac";
import type { CourseAccess, Decision } from "@ladder/rbac";
import { list } from "../../support/course.ts";

const feature = await loadFeature("tests/bdd/features/policy/access.feature");

/** A setting as properties.yaml would hold it: "absent" is no setting; numbers and booleans are read as YAML reads them. */
const setting = (text: string): { auth?: string | number | boolean } => {
  if (text === "absent") return {};
  if (/^-?\d+(\.\d+)?$/.test(text)) return { auth: Number(text) };
  return { auth: text === "true" ? true : text };
};

describeFeature(feature, ({ Rule }) => {
  let accesses: CourseAccess[];
  let access: CourseAccess;
  let decision: Decision;

  const settings = (_ctx: unknown, values: string) => {
    accesses = list(values).map((value) => accessOf({ properties: setting(value) }));
  };
  const privateCourse = (_ctx: unknown, educators: string, whitelist: string) => {
    access = accessOf({ properties: { auth: 1 }, enrollment: { educators: list(educators), whitelist: list(whitelist) } });
  };
  /** The actor comes through a session, as it does in the command and the reader. */
  const signedIn = async (actor: Actor | null) => {
    decision = canView(await new FakeSession(actor).getActor(), access);
  };
  const someone = (_ctx: unknown, login: string) => signedIn(githubActor(login, login.length));
  const refuses = (_ctx: unknown, reason: string) => {
    expect(decision).toMatchObject({ allowed: false, reason });
  };
  const allows = (_ctx: unknown, role: string) => {
    expect(decision).toEqual({ allowed: true, role });
  };

  Rule("The policy shall treat a course as private unless its auth setting is absent or the whole number 0.", ({ RuleScenario }) => {
    RuleScenario("No auth setting, and auth 0, are public", ({ Given, Then }) => {
      Given("courses whose auth settings are {string}", settings);
      Then("the policy treats every one of them as public", () => {
        expect(accesses.map(isPublic)).toEqual([true, true]);
      });
    });

    RuleScenario("A typo fails closed", ({ Given, Then }) => {
      Given("courses whose auth settings are {string}", settings);
      Then("the policy treats every one of them as private", () => {
        expect(accesses.map(isPublic)).toEqual([false, false, false, false, false, false]);
      });
    });
  });

  Rule(
    "The policy shall let a reader view a private course only when the reader is signed in and, where the course has a whitelist, is on it or is one of its educators.",
    ({ RuleScenario }) => {
      RuleScenario("Nobody signed in", ({ Given, When, Then }) => {
        Given("a private course whose educators are {string} and whose whitelist is {string}", privateCourse);
        When("nobody is signed in", () => signedIn(null));
        Then("the policy refuses with {string}", refuses);
      });

      RuleScenario("A signed-in reader who is not on the whitelist", ({ Given, When, Then }) => {
        Given("a private course whose educators are {string} and whose whitelist is {string}", privateCourse);
        When("{string} is signed in", someone);
        Then("the policy refuses with {string}", refuses);
      });

      for (const title of ["A reader on the whitelist", "An educator is not on the whitelist and still gets in", "A private course with no whitelist admits anyone signed in"]) {
        RuleScenario(title, ({ Given, When, Then }) => {
          Given("a private course whose educators are {string} and whose whitelist is {string}", privateCourse);
          When("{string} is signed in", someone);
          Then("the policy allows the reader as {string}", allows);
        });
      }
    },
  );
});
