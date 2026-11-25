/**
 * What Stryker runs against each mutant (stryker.config.json): the tiers whose tests are self-contained,
 * one test doing its own arrange, act and assert. Mirrors upstream vitest.config.mutation.ts, which also
 * holds unit and fuzz suites and no BDD steps.
 *
 * Why no BDD steps: vitest-cucumber makes every Given, When and Then its own vitest test, and Stryker's
 * vitest runner reruns, for each mutant, only the tests that executed the mutated code. A mutant reached by
 * a When step is retried with the When alone, so no Then checks it (a false survivor); a mutant reached
 * by a Then is retried without its Given (a false kill, from a crash). tests/TESTING.md has the numbers.
 *
 * Why no architecture, fence or suite-health tests: they read source text, which Stryker has instrumented.
 */
import { defineConfig } from "vitest/config";
import { workspaceAliases } from "./vitest.aliases.ts";

export default defineConfig({
  test: {
    include: ["tests/unit/gen/**/*.test.ts", "tests/unit/lite/**/*.test.ts", "tests/unit/rbac/**/*.test.ts", "tests/unit/reader/**/*.test.ts", "tests/contract/**/*.test.ts", "tests/conformance/**/*.test.ts", "tests/fuzz/**/*.test.ts"],
    exclude: ["**/node_modules/**"],
    pool: "threads",
    testTimeout: 30_000,
  },
  resolve: { alias: workspaceAliases },
});
