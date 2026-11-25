/** Helpers every release script shares. */
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** True when the module at `url` is the script node was started with (import.meta.main, before Node 22.18 had it everywhere). */
export function isMain(url: string): boolean {
  const started = process.argv[1];
  if (!started) return false;
  try {
    return realpathSync(fileURLToPath(url)) === realpathSync(started);
  } catch {
    return false;
  }
}

/** Run a script's main, turning a thrown Error into one line on stderr and exit code 2 (could not judge). */
export async function runMain(name: string, main: () => number | Promise<number>): Promise<void> {
  try {
    process.exitCode = await main();
  } catch (error) {
    process.stderr.write(`${name}: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
  }
}
