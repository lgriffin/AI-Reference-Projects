/**
 * Package API contract: the names each package exports. A removed or renamed export breaks every caller,
 * so it is a decision, made here, in the same commit. Mirrors upstream tests/contract/gen-lib-api.test.ts
 * and model-lib-api.test.ts, which snapshot the export names of the JSR packages.
 */
import { expect, test } from "vitest";
import * as gen from "@ladder/gen";
import * as identity from "@ladder/identity";
import * as lite from "@ladder/lite";
import * as rbac from "@ladder/rbac";

test("@ladder/gen exports exactly these names", () => {
  expect(Object.keys(gen).sort()).toEqual(["MemoryFileSystem", "PathEscapeError", "assertNever", "buildCourse", "buildLo", "containedPath", "folderKind", "folderKinds", "joinPath", "outsideWarning", "pageSources", "parseMarkdown", "parseSimpleYaml", "preOrder", "reachesOutside", "readEnrollment", "readProperties", "resolveSource", "stripFrontMatter"]);
});

test("@ladder/lite exports exactly these names", () => {
  expect(Object.keys(lite).sort()).toEqual(["CSP", "STYLE", "STYLE_HASH", "SafeHtml", "buildSite", "escapeHtml", "html", "page", "pagesFor", "relativeHref", "renderInline", "renderMarkdown", "safeUrl"]);
});

test("@ladder/identity exports exactly these names", () => {
  expect(Object.keys(identity).sort()).toEqual(["AnonymousSession", "FakeSession", "githubActor", "isSubject"]);
});

test("@ladder/rbac exports exactly these names", () => {
  expect(Object.keys(rbac).sort()).toEqual(["accessOf", "canView", "isPublic", "permissionsFor", "roleHasPermission", "roleOf"]);
});
