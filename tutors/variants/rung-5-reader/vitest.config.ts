/**
 * The Single Gate's test runner. Collects every tier under tests/ (see tests/TESTING.md): unit, BDD steps,
 * contract, conformance, fuzz, architecture, suite health, mutation floors and the Rung Fence. The browser
 * tier, tests/e2e, needs a build and Chromium, so it has its own config (vitest.config.e2e.ts).
 * Upstream keeps fuzz out of `pnpm test` (vitest.config.fuzz.ts); here the properties are fast enough to
 * stay in the gate, and `pnpm test:fuzz` runs them harder.
 */
import { defineConfig } from "vitest/config";
import { workspaceAliases } from "./vitest.aliases.ts";

export default defineConfig({
  test: {
    // A vitest-cucumber step is its own test, so state set in a When step must survive into its Then step.
    clearMocks: false,
    include: ["tests/**/*.test.ts", "tests/bdd/steps/**/*.steps.ts"],
    exclude: ["**/node_modules/**", ".stryker-tmp/**", "tests/suite-health/fixtures/**"],
    pool: "threads",
    testTimeout: 30_000,
  },
  resolve: { alias: workspaceAliases },
});
