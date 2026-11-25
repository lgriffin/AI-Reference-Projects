/**
 * Workspace packages resolved to their source, as upstream's vitest.aliases.ts does. Without this,
 * `@ladder/gen` resolves through node_modules to the original folder, so Stryker, which mutates a copy
 * of the workspace in .stryker-tmp, would test the unmutated code and report every mutant as surviving.
 */
import { fileURLToPath } from "node:url";

const source = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export const workspaceAliases = {
  "@ladder/model": source("./packages/model/src/index.ts"),
  "@ladder/gen": source("./packages/gen/src/index.ts"),
  "@ladder/lite": source("./packages/lite/src/index.ts"),
};
