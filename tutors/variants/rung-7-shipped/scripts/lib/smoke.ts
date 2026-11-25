/**
 * What the container smoke check judges, without Docker: the commands it runs, and what it makes of the
 * answers. Pure, so every judgement has a test and a mutant (tests/unit/release/smoke.test.ts, R-043);
 * scripts/container-smoke.ts runs docker and hands the answers in.
 *
 * Mirrors upstream scripts/checks/container-smoke.ts, which runs each image read-only with every
 * capability dropped (OpenShift's restricted profile) and asks GET /version who it is.
 */

/** What `docker image inspect` says about the image. */
export type ImageFacts = { user: string; revision: string };

/** What /version.json answered. */
export type ServedIdentity = { version?: unknown; revision?: unknown };

/** The docker commands, as argument lists. The build context is the parent folder, where the shared fixture lives. */
export function dockerCommands(version: string, sha: string, registry?: string): { image: string; build: string[]; run: string[] } {
  const image = `tutors-ladder:${version}`;
  return {
    image,
    build: ["build", "-q", "-f", "Dockerfile", "-t", image, "--build-arg", `VERSION=${version}`, "--build-arg", `GIT_SHA=${sha}`, ...(registry ? ["--build-arg", `REGISTRY=${registry}`] : []), ".."],
    run: ["run", "-d", "--rm", "--read-only", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "-p", "127.0.0.1::8080", image],
  };
}

/** True for root by name or by number, with or without a group, and for no user at all (Docker's default is root). */
export function isRoot(user: string): boolean {
  return user.trim() === "" || /^(0|root)(:|$)/.test(user.trim());
}

/** Every reason the image may not ship, each a sentence that says what to change. Empty means it may. */
export function imageProblems(facts: ImageFacts, sha: string): string[] {
  const problems: string[] = [];
  if (isRoot(facts.user)) {
    problems.push(`the image runs as "${facts.user.trim() || "root"}". A server runs as a user that is not root (USER 10001:10001 in the Dockerfile), so a flaw in it cannot own the container.`);
  }
  if (facts.revision !== sha) {
    problems.push(`the image's revision label is "${facts.revision}", not the commit ${sha}. Pass --build-arg GIT_SHA so an image can be traced to its source.`);
  }
  return problems;
}

/** Every way the served identity differs from this checkout. Empty means the container serves this build. */
export function identityProblems(served: ServedIdentity, version: string, sha: string): string[] {
  if (served.version === version && served.revision === sha) return [];
  return [`/version.json says ${JSON.stringify(served)}, expected version ${version} and revision ${sha}. The image is not the build of this checkout.`];
}

/** Why a failed build failed, in words that say what to do next. */
export function buildFailure(stderr: string): string {
  if (/429|toomanyrequests|Too Many Requests/i.test(stderr)) {
    return "Docker Hub refused the pull (rate limit). Pull the same digests from a mirror: LADDER_REGISTRY=mirror.gcr.io/library pnpm container:smoke";
  }
  return `the image did not build: ${stderr.trim().split("\n").slice(-3).join(" ")}`;
}
