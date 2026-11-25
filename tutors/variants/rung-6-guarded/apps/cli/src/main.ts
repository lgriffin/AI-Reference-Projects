/**
 * The command line: node apps/cli/src/main.ts [--json-only] [--private] <courseFolder> <outDir>
 * Mirrors upstream packages/jsr/tutors-lite/main.ts. exitCode, not exit(): let output drain first.
 */
import { run } from "./run.ts";

process.exitCode = await run(process.argv.slice(2));
