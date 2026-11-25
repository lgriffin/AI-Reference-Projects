/**
 * The browser tier: the built reader on a plain file server, read in Chromium by the playwright library.
 * `pnpm test:e2e` builds first, then runs tests/e2e; `pnpm test:assignment` runs tests/assignment/*.e2e.ts
 * the same way. Kept out of `pnpm test` because it needs a browser. Mirrors upstream
 * apps/reader/playwright.static.config.ts, which serves the static build with a 200.html fallback.
 */
import { defineConfig } from "vitest/config";
import { workspaceAliases } from "./vitest.aliases.ts";

export default defineConfig({
  test: {
    include: ["tests/e2e/**/*.e2e.ts", "tests/assignment/**/*.e2e.ts"],
    exclude: ["**/node_modules/**"],
    // One browser, one server, one file at a time.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
  resolve: { alias: workspaceAliases },
});
