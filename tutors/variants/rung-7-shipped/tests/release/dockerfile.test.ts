/**
 * The Dockerfile, read as text: the rules that make an image traceable and hard to misuse. The image
 * itself is checked by scripts/container-smoke.ts where Docker runs; these hold without Docker.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const dockerfile = readFileSync(join(ROOT, "Dockerfile"), "utf8");
const instructions = dockerfile
  .replace(/\\\n/g, " ")
  .split("\n")
  .filter((line) => /^[A-Z]+\s/.test(line));
const froms = instructions.filter((line) => line.startsWith("FROM "));

test("the image is built in stages, and the last stage has no build tools", () => {
  assert.ok(froms.length >= 2, "Stage rule: build in one stage and copy only the result into the runtime stage, so the image carries no compiler, package manager or source.");
  assert.doesNotMatch(froms.at(-1)!, /node:/, "Stage rule: the runtime stage serves static files; Node belongs to the build stage only.");
});

test("every FROM pins its base image by digest", () => {
  const unpinned = froms.filter((line) => !/@sha256:[0-9a-f]{64}(\s|$)/.test(line));
  assert.deepEqual(
    unpinned,
    [],
    "Digest rule: a tag (node:22-alpine) can move to other bytes under the same commit; a digest cannot. Write FROM <image>:<tag>@sha256:<digest>, " +
      "as upstream's Dockerfile does (its Rule 0667), and refresh it in its own pull request (docker buildx imagetools inspect <image>:<tag>).",
  );
});

test("the image runs as a numeric user that is not root", () => {
  const user = instructions.filter((line) => line.startsWith("USER ")).at(-1);
  assert.ok(user, "User rule: the Dockerfile sets no USER, so the server runs as root. Add USER 10001:10001 to the runtime stage.");
  const [uid] = user.slice(5).trim().split(":");
  assert.match(uid!, /^\d+$/, "User rule: use a numeric UID, so Kubernetes' runAsNonRoot can verify it without reading /etc/passwd.");
  assert.notEqual(Number(uid), 0, "User rule: UID 0 is root. A flaw in a server that runs as root owns the container.");
});

test("the image says which version and commit it is", () => {
  for (const label of ["org.opencontainers.image.version", "org.opencontainers.image.revision"]) {
    assert.ok(dockerfile.includes(label), `Label rule: the image needs the ${label} label (upstream's Dockerfile sets it from build arguments), so an image can be traced to a release and a commit.`);
  }
  assert.match(dockerfile, /ARG GIT_SHA/, "Label rule: GIT_SHA is a build argument, as upstream's is.");
});

test("the Node version of the build stage is the one in .nvmrc", () => {
  const nvmrc = readFileSync(join(ROOT, ".nvmrc"), "utf8").trim();
  const node = /node:(\d+\.\d+\.\d+)/.exec(dockerfile)?.[1];
  assert.equal(node, nvmrc, `Version rule: CI uses .nvmrc (${nvmrc}) and the image uses node:${node}. Build where you test: change both in one pull request.`);
});
