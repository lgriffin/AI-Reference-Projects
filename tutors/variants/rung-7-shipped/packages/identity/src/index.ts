/**
 * @ladder/identity: verified identity only. Mirrors upstream packages/jsr/identity/src/index.ts, whose
 * first line says the same: course roles, sharing and sentiment belong to their own services (here,
 * @ladder/rbac). It imports nothing: no framework, no database, no auth provider, no other package
 * (upstream .dependency-cruiser.cjs, rule identity-contracts-self-contained). Whoever verifies a session
 * (Better Auth upstream) lives in an adapter at the edge and implements SessionPort.
 */

/** A person whose identity an adapter has verified. */
export interface Actor {
  /** Provider namespace and its stable account id, for example github:12345. */
  readonly subject: string;
  /** The provider's login, which enrollment.yaml lists (upstream: the GitHub username). */
  readonly login: string;
  readonly name: string | null;
  readonly email: string | null;
  readonly image: string | null;
}

/** Created for one request; resolves only the session verified by the active adapter. null: nobody is signed in. */
export interface SessionPort {
  getActor(): Promise<Actor | null>;
}

/** True for a subject of the form provider:id, such as github:12345. An adapter never hands out anything else. */
export function isSubject(subject: string): boolean {
  return /^[a-z][a-z0-9-]*:[^\s:]+$/.test(subject);
}

/**
 * The session of a static site: nobody is ever signed in. apps/cli builds pages that anyone holding the
 * link can open, so for the policy every reader of them is anonymous.
 */
export class AnonymousSession implements SessionPort {
  getActor(): Promise<Actor | null> {
    return Promise.resolve(null);
  }
}

/**
 * A session for tests: it answers with the actor it was given. The same contract test runs against it
 * and against AnonymousSession (Honest Double), so it cannot claim more than a real adapter would:
 * its actor must have a well-formed subject and a login.
 */
export class FakeSession implements SessionPort {
  private readonly actor: Actor | null;

  constructor(actor: Actor | null) {
    if (actor !== null && (!isSubject(actor.subject) || actor.login === "")) {
      throw new Error(`FakeSession: "${actor.subject}" is not a verified actor; a subject is provider:id and a login is never empty`);
    }
    this.actor = actor === null ? null : Object.freeze({ ...actor });
  }

  getActor(): Promise<Actor | null> {
    return Promise.resolve(this.actor);
  }
}

/** A verified GitHub actor, for tests and fixtures: only the login and the numeric id vary. */
export function githubActor(login: string, id: number): Actor {
  return { subject: `github:${id}`, login, name: null, email: null, image: null };
}
