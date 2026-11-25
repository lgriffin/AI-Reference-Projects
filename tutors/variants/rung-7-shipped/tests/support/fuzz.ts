/**
 * Shared fast-check parameters, as upstream tests/support/arbitraries/course-tree.ts's fuzzParameters.
 * A failure prints its seed and path; replay it with FUZZ_SEED=<seed> FUZZ_PATH=<path> pnpm test:fuzz.
 * FUZZ_RUNS raises the number of runs (pnpm test:fuzz uses 1000).
 */
import type { Parameters } from "fast-check";

export function fuzzParameters<T>(runs = 100): Parameters<T> {
  const env = process.env;
  return {
    numRuns: env.FUZZ_RUNS ? Number(env.FUZZ_RUNS) : runs,
    ...(env.FUZZ_SEED ? { seed: Number(env.FUZZ_SEED) } : {}),
    ...(env.FUZZ_PATH ? { path: env.FUZZ_PATH } : {}),
  };
}
