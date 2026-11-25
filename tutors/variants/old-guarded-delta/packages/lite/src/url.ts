/**
 * Sanitising URLs by allow-list. Escaping (html.ts) keeps course text from becoming markup, but an escaped
 * `javascript:alert(1)` is still a working link: the browser runs it when a reader clicks. So every URL that
 * comes from a course passes through safeUrl before it reaches an href or a src.
 *
 * The rule is an allow-list, never a block-list: a URL is kept only if it is relative or its scheme is one
 * this use allows. Upstream does the same job with DOMPurify, whose default allows http(s), mailto and a
 * few more (packages/svelte/ui-primitives/src/utils/sanitize.ts), and course-rules V016 warns about
 * `javascript:` links in slides (packages/jsr/course-rules/src/rich.ts, STRIPPED).
 */

/** Where a URL is used. A link may open mail; an image may only load over the web or from the site. */
export type UrlUse = "link" | "image";

const ALLOWED: Record<UrlUse, ReadonlySet<string>> = {
  link: new Set(["http", "https", "mailto"]),
  image: new Set(["http", "https"]),
};

/**
 * The URL if it is safe for `use`, otherwise null. Browsers ignore tabs, newlines and other control
 * characters inside a scheme ("java\tscript:") and are case-blind ("JaVaScRiPt:"), so the scheme is read
 * the way a browser reads it. A colon before the first "/", "?" or "#" that does not make an allowed
 * scheme (an entity such as "&#106;avascript:", a zero-width space) is refused: when unsure, refuse.
 */
export function safeUrl(url: string, use: UrlUse): string | null {
  const read = url.replace(/[\u0000- \u007f-\u009f]/g, "").toLowerCase();
  const scheme = read.match(/^([a-z][a-z0-9+.-]*):/)?.[1];
  if (scheme !== undefined) return ALLOWED[use].has(scheme) ? url : null;
  const colon = read.indexOf(":");
  const pathStart = read.search(/[/?#]/);
  if (colon !== -1 && (pathStart === -1 || colon < pathStart)) return null;
  return url;
}
