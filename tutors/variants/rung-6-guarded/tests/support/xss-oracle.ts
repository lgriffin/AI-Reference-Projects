/**
 * The oracle for the XSS corpus and its properties: what could run script in a piece of HTML that lite
 * wrote. It is the browser's own algorithm, not lite's: Node's WHATWG URL parser decides what scheme an
 * href really has, after HTML entities are decoded as a browser decodes an attribute. An oracle that
 * shared code with safeUrl would agree with its mistakes.
 */
import assert from "node:assert/strict";

/** The tags and attributes lite may write. Anything else in its output is markup that came from a course. */
const TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "p", "ul", "ol", "li", "pre", "code", "a", "img", "strong", "em", "span", "section", "article", "main", "nav", "html", "head", "body", "meta", "title", "style", "!doctype"]);
const ATTRIBUTES = new Set(["href", "src", "alt", "class", "title", "lang", "charset", "name", "content", "http-equiv", "role", "html"]);
export const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

/** An attribute value as the browser reads it: one pass of entity decoding. */
function decodeAttribute(value: string): string {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", colon: ":", tab: "\t", newline: "\n" };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi, (whole, entity: string) => {
    if (entity[0] === "#") return String.fromCodePoint(entity[1]!.toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10));
    return named[entity.toLowerCase()] ?? whole;
  });
}

/** The scheme a browser would open `url` with, or null when it cannot parse it at all (and so opens nothing). */
export function browserProtocol(url: string): string | null {
  try {
    return new URL(url, "https://course.invalid/page/").protocol;
  } catch {
    return null;
  }
}

/** Every reason this HTML could run script: unknown tags, unknown or on* attributes, and URLs whose real scheme is not allowed. */
export function dangers(html: string): string[] {
  const found: string[] = [];
  const withoutStyle = html.replace(/<style>[\s\S]*?<\/style>/, "<style></style>");
  for (const [, name, attrs] of withoutStyle.matchAll(/<\/?([!a-z0-9-]+)([^>]*)>/gi)) {
    if (!TAGS.has(name!.toLowerCase())) found.push(`tag <${name}>`);
    for (const [, attr, value = ""] of attrs!.matchAll(/([^\s="']+)(?:="([^"]*)")?/g)) {
      const key = attr!.toLowerCase();
      if (!ATTRIBUTES.has(key)) found.push(`attribute ${attr} on <${name}>`);
      if (key === "href" || key === "src") {
        const protocol = browserProtocol(decodeAttribute(value));
        if (protocol !== null && (!SAFE_PROTOCOLS.has(protocol) || (key === "src" && protocol === "mailto:"))) found.push(`${key}="${value}" opens as ${protocol}`);
      }
    }
  }
  return found;
}

export function assertSafe(html: string, payload: string, why: string) {
  const found = dangers(html);
  assert.deepEqual(
    found,
    [],
    `XSS corpus: ${JSON.stringify(payload)} (${why}) reached the page as ${found.join(", ")}.\n${html}\n` +
      "Course text must be escaped (html`` in packages/lite/src/html.ts) and every course URL must pass safeUrl (packages/lite/src/url.ts) before it reaches an href or src.",
  );
}

