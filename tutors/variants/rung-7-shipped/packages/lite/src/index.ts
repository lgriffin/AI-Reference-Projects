/** @ladder/lite: a Course becomes the pages of a static website, returned as data. */
export { buildSite, pagesFor, relativeHref } from "./site-builder.ts";
export type { SiteOptions, SitePage } from "./site-builder.ts";
export { CSP, escapeHtml, html, page, SafeHtml, STYLE, STYLE_HASH } from "./html.ts";
export type { Access } from "./html.ts";
export { renderInline, renderMarkdown } from "./markdown.ts";
export { safeUrl } from "./url.ts";
export type { UrlUse } from "./url.ts";
export { buildIdentity, describeIdentity, versionFile } from "./version.ts";
export type { BuildIdentity } from "./version.ts";
