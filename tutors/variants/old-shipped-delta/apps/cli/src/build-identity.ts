/**
 * Where the build identity comes from, at the edge. The version is this app's package.json (kept in
 * lockstep with the workspace's, see release/README.md). The commit is `GIT_SHA` when it is set, as in the
 * container build (upstream Dockerfile: `--build-arg GIT_SHA=$(git rev-parse HEAD)`), otherwise the HEAD of
 * the git checkout around this file, read as files: no git binary and no child process. The build date is
 * `BUILD_DATE` or unknown. Mirrors upstream packages/svelte/utils/runtime/src/version.ts.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { buildIdentity } from "@ladder/lite";
import type { BuildIdentity } from "@ladder/lite";

export const APP = "tutors-ladder";

export function readBuildIdentity(env: Record<string, string | undefined> = process.env, from: string = import.meta.dirname): BuildIdentity {
  const pkg = JSON.parse(readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8")) as { version: string };
  return buildIdentity(APP, pkg.version, env.GIT_SHA || gitHead(from), env.BUILD_DATE);
}

/** The commit HEAD names in the nearest git checkout above `from`, or undefined. */
export function gitHead(from: string): string | undefined {
  const gitDir = findGitDir(resolve(from));
  if (!gitDir) return undefined;
  const head = read(join(gitDir, "HEAD"));
  if (!head) return undefined;
  const ref = /^ref: (.+)$/m.exec(head)?.[1];
  if (!ref) return /^[0-9a-f]{40}$/.test(head) ? head : undefined;
  // A worktree keeps its refs in the common directory.
  const common = read(join(gitDir, "commondir"));
  const dirs = [gitDir, ...(common ? [resolve(gitDir, common)] : [])];
  for (const dir of dirs) {
    const loose = read(join(dir, ref));
    if (loose) return loose;
    const packed = read(join(dir, "packed-refs"))?.split("\n").find((line) => line.endsWith(` ${ref}`));
    if (packed) return packed.split(" ")[0];
  }
  return undefined;
}

function findGitDir(dir: string): string | undefined {
  for (let current = dir; ; current = dirname(current)) {
    const candidate = join(current, ".git");
    if (existsSync(candidate)) {
      if (statSync(candidate).isDirectory()) return candidate;
      const pointer = /^gitdir: (.+)$/m.exec(read(candidate) ?? "")?.[1];
      return pointer ? resolve(current, pointer) : undefined;
    }
    if (dirname(current) === current) return undefined;
  }
}

function read(file: string): string | undefined {
  try {
    return readFileSync(file, "utf8").trim();
  } catch {
    return undefined;
  }
}
