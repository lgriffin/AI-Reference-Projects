/**
 * The RBAC policy as a table: every role against every kind of course, written out, so a change to the
 * policy changes a line a person can read. Mirrors guides/RBAC.md upstream ("Auth Levels",
 * "Whitelist Enforcement", "Permissions"). R-030 and R-031 state the policy; the scenarios in
 * tests/bdd/features/policy prove them, and this table is what Stryker runs.
 */
import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { githubActor } from "@ladder/identity";
import type { Actor } from "@ladder/identity";
import { accessOf, canView, isPublic, permissionsFor, roleHasPermission, roleOf } from "@ladder/rbac";
import type { CourseAccess, Permission, Role } from "@ladder/rbac";

const ada = githubActor("ada", 1); // an educator
const bob = githubActor("bob", 2); // on the whitelist
const eve = githubActor("eve", 3); // signed in, not enrolled

const PUBLIC: CourseAccess = { authLevel: 0, educators: ["ada"], whitelist: [] };
const PRIVATE_OPEN: CourseAccess = { authLevel: 1, educators: ["ada"], whitelist: [] };
const PRIVATE_LISTED: CourseAccess = { authLevel: 1, educators: ["ada"], whitelist: ["bob"] };

type Row = [who: string, actor: Actor | null, course: string, access: CourseAccess, expected: string];
const TABLE: Row[] = [
  ["anonymous", null, "public", PUBLIC, "allowed as anonymous"],
  ["eve", eve, "public", PUBLIC, "allowed as student"],
  ["ada", ada, "public", PUBLIC, "allowed as educator"],
  ["anonymous", null, "private, no whitelist", PRIVATE_OPEN, "refused (sign-in-required)"],
  ["eve", eve, "private, no whitelist", PRIVATE_OPEN, "allowed as student"],
  ["ada", ada, "private, no whitelist", PRIVATE_OPEN, "allowed as educator"],
  ["anonymous", null, "private, whitelist", PRIVATE_LISTED, "refused (sign-in-required)"],
  ["bob", bob, "private, whitelist", PRIVATE_LISTED, "allowed as student"],
  ["eve", eve, "private, whitelist", PRIVATE_LISTED, "refused (not-enrolled)"],
  ["ada", ada, "private, whitelist", PRIVATE_LISTED, "allowed as educator"],
];

describe("canView", () => {
  for (const [who, actor, course, access, expected] of TABLE) {
    test(`${who} on a ${course} course: ${expected}`, () => {
      const decision = canView(actor, access);
      const actual = decision.allowed ? `allowed as ${decision.role}` : `refused (${decision.reason})`;
      assert.equal(actual, expected);
    });
  }
});

test("roles: no actor is anonymous; an educator is listed by login; everyone else signed in is a student", () => {
  assert.equal(roleOf(null, PRIVATE_LISTED), "anonymous");
  assert.equal(roleOf(ada, PRIVATE_LISTED), "educator");
  assert.equal(roleOf(bob, PRIVATE_LISTED), "student");
  assert.equal(roleOf({ ...eve, login: "ADA" }, PRIVATE_LISTED), "student", "logins are compared exactly");
});

test("permissions: as upstream's ROLE_PERMISSIONS, and nobody but an educator has any", () => {
  const all: Permission[] = ["broadcast", "quiz:manage", "analytics:view", "content:lock"];
  const roles: Role[] = ["anonymous", "student", "educator"];
  for (const role of roles) for (const permission of all) assert.equal(roleHasPermission(role, permission), role === "educator", `${role} ${permission}`);
  assert.deepEqual(permissionsFor("educator"), all);
  assert.deepEqual(permissionsFor("student"), []);
  assert.deepEqual(permissionsFor("anonymous"), []);
});

describe("accessOf reads properties.yaml's auth and fails closed", () => {
  const CASES: [label: string, auth: string | number | boolean | undefined, level: number][] = [
    ["no auth", undefined, 0],
    ["auth: 0", 0, 0],
    ["auth: 1", 1, 1],
    ["auth: 2 (removed upstream; still private)", 2, 2],
    ['auth: "1" (quoted)', "1", 1],
    ["auth: yes (a typo)", "yes", 1],
    ["auth: true", true, 1],
    ["auth: -1", -1, 1],
    ["auth: 0.5", 0.5, 1],
  ];
  for (const [label, auth, level] of CASES) {
    test(label, () => {
      const access = accessOf({ properties: auth === undefined ? {} : { auth } });
      assert.equal(access.authLevel, level);
      assert.equal(isPublic(access), level === 0);
    });
  }

  test("enrollment lists default to empty", () => {
    assert.deepEqual(accessOf({}), { authLevel: 0, educators: [], whitelist: [] });
    assert.deepEqual(accessOf({ enrollment: { educators: ["ada"] } }).educators, ["ada"]);
  });
});
