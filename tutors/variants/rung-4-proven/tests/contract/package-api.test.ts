/**
 * Package API contract: the names each package exports. A removed or renamed export breaks every caller,
 * so it is a decision, made here, in the same commit. Mirrors upstream tests/contract/gen-lib-api.test.ts
 * and model-lib-api.test.ts, which snapshot the export names of the JSR packages.
 */
import { expect, test } from "vitest";
import * as gen from "@ladder/gen";
import * as lite from "@ladder/lite";

test("@ladder/gen exports exactly these names", () => {
  expect(Object.keys(gen).sort()).toEqual(["MemoryFileSystem", "assertNever", "buildCourse", "buildLo", "folderKind", "folderKinds", "joinPath", "parseMarkdown", "preOrder", "stripFrontMatter"]);
});

test("@ladder/lite exports exactly these names", () => {
  expect(Object.keys(lite).sort()).toEqual(["SafeHtml", "buildSite", "escapeHtml", "html", "page", "pagesFor", "relativeHref", "renderInline", "renderMarkdown"]);
});
