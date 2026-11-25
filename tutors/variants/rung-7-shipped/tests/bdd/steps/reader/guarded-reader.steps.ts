import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { AnonymousSession, FakeSession, githubActor } from "@ladder/identity";
import type { SessionPort } from "@ladder/identity";
import type { Course } from "@ladder/model";
import { ANNOUNCER_STYLE_HASH, READER_CSP } from "../../../../apps/reader/csp.ts";
import { requestLo } from "../../../../apps/reader/src/lib/course/course-service.ts";
import type { PageRequest } from "../../../../apps/reader/src/lib/course/course-service.ts";
import { cardRoute, decorateCourseTree } from "../../../../apps/reader/src/lib/course/lo-tree.ts";
import type { CourseTree } from "../../../../apps/reader/src/lib/course/lo-tree.ts";
import { ROOT } from "../../../support/paths.ts";
import { list } from "../../support/course.ts";
import { host, servingOracle } from "../../support/reader.ts";
import type { Host } from "../../support/reader.ts";

const feature = await loadFeature("tests/bdd/features/reader/guarded-reader.feature");

/** The tutors.json the command writes for tests/fixtures/private-course, with the whitelist a scenario names. */
const privateCourse = (whitelist: string[]): Course => ({
  type: "course", id: "private-course", title: "Private course", summary: "", contentMd: "# Private course\n", route: "/",
  properties: { auth: 1 },
  enrollment: { educators: ["ada"], whitelist },
  los: [{ type: "topic", id: "topic-01-enrolled", title: "Enrolled only", summary: "", contentMd: "# Enrolled only\n", route: "/topic/{{COURSEURL}}/topic-01-enrolled", los: [] }],
});

describeFeature(feature, ({ Rule }) => {
  let site: Host;
  let pages: PageRequest<unknown>[];
  let raw: Course;
  let tree: CourseTree;

  const servingPrivate = (_ctx: unknown, courseId: string, whitelist: string) => {
    site = host((url) => (url === `/courses/${courseId}/tutors.json` ? { ok: true, json: async () => privateCourse(list(whitelist)) } : { ok: false, json: async () => undefined }));
  };
  /** Each route's +page.ts calls requestLo; a host with sign-in hands in its session, the static build has none. */
  const opens = async (paths: string, session: SessionPort) => {
    pages = [];
    for (const path of list(paths)) {
      const [, kind, courseId = ""] = path.split("/");
      pages.push(await requestLo(kind as "course" | "topic", courseId, path, site.fetch, session));
    }
  };
  const anonymous = (_ctx: unknown, paths: string) => opens(paths, new AnonymousSession());
  const signedIn = (_ctx: unknown, paths: string, login: string) => opens(paths, new FakeSession(githubActor(login, 7)));
  const refusedWith = (_ctx: unknown, notice: string) => {
    expect(pages.length).toBeGreaterThan(0);
    for (const page of pages) expect(page).toEqual({ refused: notice });
  };
  const everyFound = () => {
    expect(pages.length).toBeGreaterThan(0);
    for (const page of pages) expect(page).toHaveProperty("found");
  };

  Rule("If the policy refuses the reader in the session, then the reader shall answer 403 with a notice that the course is private and show none of its pages.", ({ RuleScenario }) => {
    RuleScenario("Nobody is signed in, as in every static build", ({ Given, When, Then }) => {
      Given("a host that serves a private course {string} whose whitelist is {string}", servingPrivate);
      When("a learner opens {string} with nobody signed in", anonymous);
      Then("every page is refused with {string}", refusedWith);
    });

    RuleScenario("A signed-in reader who is not enrolled", ({ Given, When, Then }) => {
      Given("a host that serves a private course {string} whose whitelist is {string}", servingPrivate);
      When("a learner opens {string} signed in as {string}", signedIn);
      Then("every page is refused with {string}", refusedWith);
    });

    RuleScenario("An enrolled reader sees the course", ({ Given, When, Then }) => {
      Given("a host that serves a private course {string} whose whitelist is {string}", servingPrivate);
      When("a learner opens {string} signed in as {string}", signedIn);
      Then("every page is found", everyFound);
    });

    RuleScenario("A public course needs no sign-in", ({ Given, When, Then }) => {
      Given("a host that serves upstream's tutors.json for the shared fixture as the course {string}", (_ctx, courseId: string) => {
        site = servingOracle(courseId);
      });
      When("a learner opens {string} with nobody signed in", anonymous);
      Then("every page is found", everyFound);
    });
  });

  Rule("If a route in tutors.json is an address the site would refuse to link to, then the reader shall show its learning object without a link.", ({ RuleScenario }) => {
    const withWeb = (_ctx: unknown, route: string) => {
      raw = { type: "course", id: "c", title: "Course", summary: "", contentMd: "# Course\n", route: "/", los: [{ type: "web", id: "web-1", title: "Resources", summary: "", contentMd: "", route }] };
    };
    const readAs = (_ctx: unknown, courseId: string) => {
      tree = decorateCourseTree(raw, courseId);
    };

    RuleScenario("A web link whose address is script", ({ Given, When, Then }) => {
      Given("a tutors.json whose web link has the route {string}", withWeb);
      When("the reader reads it as the course {string}", readAs);
      Then("the web link's card has no link", () => {
        expect(cardRoute(tree.course.los[0]!)).toBeUndefined();
        expect(JSON.stringify(tree.course)).not.toContain("javascript:");
      });
    });

    RuleScenario("A web link to the web keeps its link", ({ Given, When, Then }) => {
      Given("a tutors.json whose web link has the route {string}", withWeb);
      When("the reader reads it as the course {string}", readAs);
      Then("the web link's card links to {string}", (_ctx, route: string) => {
        expect(cardRoute(tree.course.los[0]!)).toBe(route);
      });
    });
  });

  Rule(
    "The reader shall carry a Content Security Policy that allows script and style only from its own origin, and inline only what SvelteKit itself writes, each named by its hash.",
    ({ RuleScenario }) => {
      RuleScenario("The policy the build is given", ({ Then, And }) => {
        Then("the reader's policy allows {string} from {string} alone", (_ctx, names: string, source: string) => {
          for (const name of list(names)) expect(READER_CSP[name as keyof typeof READER_CSP], name).toEqual([source]);
        });
        And("the reader's policy starts from {string} {string}", (_ctx, name: string, source: string) => {
          expect(READER_CSP[name as keyof typeof READER_CSP]).toEqual([source]);
        });
        And("the reader's build asks SvelteKit for a policy by {string}", (_ctx, mode: string) => {
          // The built page is checked in Chromium by tests/e2e/guarded.e2e.ts; here, that the build is asked for it.
          expect(readFileSync(join(ROOT, "apps", "reader", "vite.config.ts"), "utf8")).toContain(`csp: { mode: "${mode}", directives: readerCspDirectives() }`);
        });
        And("the only style attribute the policy allows is the one on SvelteKit's route announcer", () => {
          // A Closure Check between the policy and the framework: the hash is recomputed from SvelteKit's own source.
          const kit = createRequire(join(ROOT, "apps", "reader", "package.json")).resolve("@sveltejs/kit/package.json");
          const root = readFileSync(join(kit, "..", "src", "runtime", "components", "root.svelte"), "utf8");
          const style = root.match(/id="svelte-announcer"[^>]*?style="([^"]+)"/s)?.[1] ?? "";
          const actual = `sha256-${createHash("sha256").update(style).digest("base64")}`;
          expect(ANNOUNCER_STYLE_HASH, `CSP rule: SvelteKit's announcer style changed, so set ANNOUNCER_STYLE_HASH = "${actual}" in apps/reader/csp.ts. Never fix this with 'unsafe-inline'.`).toBe(actual);
          expect(READER_CSP["style-src-attr"]).toEqual(["unsafe-hashes", ANNOUNCER_STYLE_HASH]);
        });
      });
    },
  );
});
