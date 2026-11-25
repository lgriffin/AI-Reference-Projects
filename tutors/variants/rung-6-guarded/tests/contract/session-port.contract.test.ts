/**
 * Honest Double for identity: one contract for SessionPort, run against every adapter in this workspace.
 * FakeSession stands in for a real verified session in tests, so it must not be able to claim what a real
 * adapter never would. tests/architecture checks that every SessionPort adapter is listed here.
 * A real adapter (upstream: Better Auth, behind packages/jsr/identity's SessionPort) joins ADAPTERS at the Summit.
 */
import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { AnonymousSession, FakeSession, githubActor, isSubject } from "@ladder/identity";
import type { Actor, SessionPort } from "@ladder/identity";

const ada = githubActor("ada", 1815);

const ADAPTERS: [name: string, make: (actor: Actor | null) => SessionPort | undefined][] = [
  ["AnonymousSession", (actor) => (actor === null ? new AnonymousSession() : undefined)],
  ["FakeSession", (actor) => new FakeSession(actor)],
];

for (const [name, make] of ADAPTERS) {
  describe(`SessionPort contract: ${name}`, () => {
    test("getActor resolves to null or to a verified actor: subject provider:id, a login, nullable profile fields", async () => {
      for (const given of [null, ada]) {
        const session = make(given);
        if (session === undefined) continue; // this adapter cannot hold that actor
        const actor = await session.getActor();
        if (actor === null) continue;
        assert.ok(isSubject(actor.subject), `${name} answered with subject "${actor.subject}"`);
        assert.notEqual(actor.login, "");
        for (const field of ["name", "email", "image"] as const) assert.ok(actor[field] === null || typeof actor[field] === "string");
      }
    });

    test("getActor answers the same each time, and the answer cannot be changed by the caller", async () => {
      const session = make(ada) ?? make(null)!;
      const first = await session.getActor();
      assert.deepEqual(await session.getActor(), first);
      if (first !== null) assert.throws(() => ((first as { login: string }).login = "mallory"), TypeError);
    });
  });
}

test("FakeSession refuses an actor no real adapter could verify", () => {
  assert.throws(() => new FakeSession({ ...ada, subject: "ada" }), /not a verified actor/);
  assert.throws(() => new FakeSession({ ...ada, login: "" }), /not a verified actor/);
  assert.equal(isSubject("github:12345"), true);
  assert.equal(isSubject("github: 12345"), false);
});
