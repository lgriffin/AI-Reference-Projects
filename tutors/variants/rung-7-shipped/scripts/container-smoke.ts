/**
 * Container smoke check: build the image, run it the strict way, and ask it who it is.
 *
 *   node scripts/container-smoke.ts             # build, run, check, stop
 *   node scripts/container-smoke.ts --dry-run   # print the docker commands, run none
 *   LADDER_REGISTRY=mirror.gcr.io/library node scripts/container-smoke.ts   # when Docker Hub rate-limits
 *
 * The container runs read-only, with every capability dropped and no new privileges, as upstream's
 * scripts/checks/container-smoke.ts runs its images (OpenShift's restricted profile). It checks:
 *   - the image's user is not root, and its revision label is the commit it was built from;
 *   - /version.json answers the version in package.json and that commit (upstream: GET /version);
 *   - /index.html is served and carries the site's Content Security Policy, and /tutors.json parses.
 * The judgements are pure functions in scripts/lib/smoke.ts (R-043); this file runs docker.
 * With no Docker daemon it skips, says why, and exits 0: a check that cannot run is reported as not run,
 * never as passed. The result is written to out/container-smoke.json for the readiness A3.
 *
 * The one script allowed to use the network, and only to reach the container on 127.0.0.1 (Rung Fence).
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isMain, runMain } from "./lib/cli.ts";
import { buildFailure, dockerCommands, identityProblems, imageProblems } from "./lib/smoke.ts";

const ROOT = join(import.meta.dirname, "..");
const RESULT = join(ROOT, "out", "container-smoke.json");

export type SmokeResult = { status: "passed" | "failed" | "skipped"; reason: string; image?: string; revision?: string; checks?: string[] };

function record(result: SmokeResult): SmokeResult {
  mkdirSync(join(ROOT, "out"), { recursive: true });
  writeFileSync(RESULT, `${JSON.stringify({ ...result, at: new Date().toISOString() }, null, 2)}\n`);
  return result;
}

const docker = (args: string[]) => execFileSync("docker", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

function dockerAvailable(): string | undefined {
  const info = spawnSync("docker", ["info", "--format", "{{.ServerVersion}}"], { encoding: "utf8" });
  if (info.error) return "the docker command is not installed";
  if (info.status !== 0) return `docker is installed but no daemon answers (${info.stderr.trim().split("\n").pop()})`;
  return undefined;
}

function commit(): string {
  const git = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" });
  return git.status === 0 ? git.stdout.trim() : "unknown";
}

async function get(url: string, attempts = 20): Promise<Response> {
  for (let i = 1; ; i++) {
    try {
      return await fetch(url);
    } catch (error) {
      if (i >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}

export async function smoke(dryRun: boolean): Promise<SmokeResult> {
  const version = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version as string;
  const sha = commit();
  const { image, build, run } = dockerCommands(version, sha, process.env.LADDER_REGISTRY);
  if (dryRun) {
    process.stdout.write(`docker ${build.join(" ")}\ndocker ${run.join(" ")}\n`);
    return { status: "skipped", reason: "dry run: commands printed, none run", image };
  }
  const missing = dockerAvailable();
  if (missing) return record({ status: "skipped", reason: `${missing}. The image was not built or checked; run this where Docker runs (CI does), or use --dry-run to see the commands.`, image, revision: sha });

  const checks: string[] = [];
  const fail = (reason: string) => record({ status: "failed", reason, image, revision: sha, checks });
  try {
    docker(build);
  } catch (error) {
    return fail(buildFailure(String((error as { stderr?: unknown }).stderr ?? error)));
  }
  const [user = "", revision = ""] = docker(["image", "inspect", image, "--format", '{{.Config.User}}|{{index .Config.Labels "org.opencontainers.image.revision"}}']).split("|");
  const [imageProblem] = imageProblems({ user, revision }, sha);
  if (imageProblem) return fail(imageProblem);
  checks.push(`user is ${user}, not root`, `revision label is ${sha.slice(0, 7)}`);

  const id = docker(run);
  try {
    const port = docker(["port", id, "8080"]).split("\n")[0]!.split(":").pop();
    const base = `http://127.0.0.1:${port}`;
    const identity = (await (await get(`${base}/version.json`)).json()) as { version?: string; revision?: string };
    const [identityProblem] = identityProblems(identity, version, sha);
    if (identityProblem) return fail(identityProblem);
    checks.push(`/version.json answers ${version} at ${sha.slice(0, 7)}`);
    const index = await get(`${base}/index.html`);
    const home = await index.text();
    if (!index.ok || !home.includes("<h1>")) return fail(`/index.html answered ${index.status}; the site is not being served from /site.`);
    if (!home.includes("Content-Security-Policy")) return fail("/index.html carries no Content-Security-Policy. Every page of the site carries one (R-023); the image is serving something else.");
    checks.push("/index.html is served, with its Content Security Policy");
    const tutors = await get(`${base}/tutors.json`);
    JSON.parse(await tutors.text());
    checks.push("/tutors.json is served and parses");
  } finally {
    spawnSync("docker", ["stop", id], { stdio: "ignore" });
  }
  return record({ status: "passed", reason: "every check passed", image, revision: sha, checks });
}

export async function main(argv: string[]): Promise<number> {
  const result = await smoke(argv.includes("--dry-run"));
  const lines = [`container smoke: ${result.status.toUpperCase()}: ${result.reason}`, ...(result.checks ?? []).map((c) => `  ok ${c}`)];
  (result.status === "failed" ? process.stderr : process.stdout).write(`${lines.join("\n")}\n`);
  return result.status === "failed" ? 1 : 0;
}

if (isMain(import.meta.url)) await runMain("container-smoke", () => main(process.argv.slice(2)));
