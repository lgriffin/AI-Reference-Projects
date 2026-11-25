/**
 * What the container smoke check judges, without Docker (scripts/lib/smoke.ts). The image itself is built
 * and run by `pnpm container:smoke` where a Docker daemon answers.
 */
import { test } from "vitest";
import assert from "node:assert/strict";
import { buildFailure, dockerCommands, identityProblems, imageProblems, isRoot } from "../../../scripts/lib/smoke.ts";

const SHA = "1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d";

test("R-043: root by name, by number, with a group, or by default is root; a numeric user is not", () => {
  for (const user of ["", " ", "0", "root", "0:0", "root:root", "0:10001", " root "]) assert.equal(isRoot(user), true, `"${user}"`);
  for (const user of ["10001:10001", "10001", "node", "rooty", "00", "1000:0"]) assert.equal(isRoot(user), false, `"${user}"`);
});

test("R-043: an image that runs as root, or was built from another commit, may not ship, and each reason says what to change", () => {
  assert.deepEqual(imageProblems({ user: "10001:10001", revision: SHA }, SHA), []);
  const [root, ...none] = imageProblems({ user: "", revision: SHA }, SHA);
  assert.match(root!, /^the image runs as "root"\. A server runs as a user that is not root \(USER 10001:10001 in the Dockerfile\)/);
  assert.deepEqual(none, []);
  assert.match(imageProblems({ user: " 0:0 ", revision: SHA }, SHA)[0]!, /^the image runs as "0:0"/);
  const [revision] = imageProblems({ user: "10001:10001", revision: "unknown" }, SHA);
  assert.match(revision!, new RegExp(`^the image's revision label is "unknown", not the commit ${SHA}\\. Pass --build-arg GIT_SHA`));
  assert.equal(imageProblems({ user: "root", revision: "" }, SHA).length, 2, "both reasons are given");
});

test("the container must answer the version and commit of this checkout", () => {
  assert.deepEqual(identityProblems({ version: "1.0.0", revision: SHA }, "1.0.0", SHA), []);
  assert.match(identityProblems({ version: "0.9.0", revision: SHA }, "1.0.0", SHA)[0]!, /^\/version\.json says \{"version":"0\.9\.0","revision":"1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d"\}, expected version 1\.0\.0 and revision 1a2b/);
  assert.equal(identityProblems({ version: "1.0.0", revision: "unknown" }, "1.0.0", SHA).length, 1);
  assert.equal(identityProblems({}, "1.0.0", SHA).length, 1);
});

test("the image is built from the parent folder and run read-only, with no capabilities and no new privileges", () => {
  const { image, build, run } = dockerCommands("1.2.0", SHA);
  assert.equal(image, "tutors-ladder:1.2.0");
  assert.deepEqual(build, ["build", "-q", "-f", "Dockerfile", "-t", "tutors-ladder:1.2.0", "--build-arg", "VERSION=1.2.0", "--build-arg", `GIT_SHA=${SHA}`, ".."]);
  assert.deepEqual(run, ["run", "-d", "--rm", "--read-only", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "-p", "127.0.0.1::8080", "tutors-ladder:1.2.0"]);
  assert.deepEqual(dockerCommands("1.2.0", SHA, "mirror.gcr.io/library").build.slice(-3), ["--build-arg", "REGISTRY=mirror.gcr.io/library", ".."]);
});

test("a rate-limited pull names the mirror; any other failure shows the end of what docker said", () => {
  assert.match(buildFailure("ERROR: toomanyrequests: You have reached your pull rate limit"), /^Docker Hub refused the pull \(rate limit\)\. Pull the same digests from a mirror: LADDER_REGISTRY=mirror\.gcr\.io\/library pnpm container:smoke$/);
  assert.match(buildFailure("429 Too Many Requests"), /rate limit/);
  assert.equal(buildFailure("a\nb\nc\nd\n"), "the image did not build: b c d");
});
