/**
 * Build identity: which release, which commit, built when. Mirrors upstream
 * packages/svelte/utils/runtime/src/version.ts (`versionInfo`, `GET /version`): everything that differs
 * between two builds of the same source is confined to one file, version.json, so a release comparison
 * masks exactly one file and every page stays byte-for-byte the same.
 *
 * Pure: lite never reads the environment or git. apps/cli finds the values and hands them in.
 */
import type { SitePage } from "./site-builder.ts";

export type BuildIdentity = {
  /** The program's name, e.g. `tutors-ladder`. */
  app: string;
  /** The release version, from package.json (SemVer). */
  version: string;
  /** The git commit the build came from (`GIT_SHA`, or the checkout's HEAD), or `unknown`. */
  revision: string;
  /** When it was built (`BUILD_DATE`), or `unknown`. Unknown by default, so local builds repeat exactly. */
  built: string;
};

/** The values that may be missing become `unknown`, as upstream's versionInfo does. */
export function buildIdentity(app: string, version: string, revision?: string, built?: string): BuildIdentity {
  return { app, version, revision: revision?.trim() || "unknown", built: built?.trim() || "unknown" };
}

/** One line for a person: `tutors-ladder 1.2.0 (commit 3caae8d, built unknown)`. */
export function describeIdentity(identity: BuildIdentity): string {
  const commit = /^[0-9a-f]{40}$/.test(identity.revision) ? identity.revision.slice(0, 7) : identity.revision;
  return `${identity.app} ${identity.version} (commit ${commit}, built ${identity.built})`;
}

/** The site's `version.json`, the static twin of upstream's `GET /version`. `html` holds the file's text. */
export function versionFile(identity: BuildIdentity): SitePage {
  return { path: "version.json", html: `${JSON.stringify(identity, null, 2)}\n` };
}
