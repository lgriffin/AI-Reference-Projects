/**
 * Escaping by default (the Auto-escaping Template pattern). `html` escapes every value it interpolates
 * unless the value is already SafeHtml. SafeHtml is made only here and in markdown.ts, which escapes
 * its input first; tests/architecture/trusted-html.test.ts checks that no other file makes it.
 */

/** HTML that is safe to write into a page as it is. */
export class SafeHtml {
  readonly value: string;
  constructor(value: string) {
    this.value = value;
  }
}

const ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Text as HTML: safe in element content and in quoted attribute values. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ENTITIES[char]!);
}

type Value = string | number | SafeHtml | null | undefined | false | readonly Value[];

function render(value: Value): string {
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(render).join("");
  if (value === null || value === undefined || value === false) return "";
  return escapeHtml(String(value));
}

/** A tagged template: html`<h1>${title}</h1>` escapes `title` unless it is SafeHtml. */
export function html(strings: TemplateStringsArray, ...values: Value[]): SafeHtml {
  return new SafeHtml(strings.reduce((out, string, i) => out + render(values[i - 1]) + string));
}

/** The site's only style sheet, inline in every page. */
export const STYLE = `body{font-family:system-ui,sans-serif;max-width:52rem;margin:0 auto;padding:1rem;line-height:1.5}
nav{display:flex;gap:1rem;border-bottom:1px solid #ccc;padding-bottom:.5rem}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(14rem,1fr));gap:1rem;padding:0;list-style:none}
.card{border:1px solid #ccc;border-radius:.5rem;padding:.75rem}.kind{font-size:.75rem;text-transform:uppercase;color:#555}
.slide{border:1px solid #ccc;border-radius:.5rem;padding:1rem;margin:1rem 0}pre{background:#f4f4f4;padding:.75rem;overflow-x:auto}
.blocked{text-decoration:line-through}.private{border:2px solid #b00;padding:.5rem;color:#b00}`;

/**
 * The SHA-256 of STYLE, base64: the one inline style the policy allows. Change STYLE and the CSP test
 * fails with the new hash to paste here (tests/unit/lite/csp.test.ts). lite cannot hash it itself,
 * because hashing needs the platform and only apps/cli touches the platform.
 */
export const STYLE_HASH = "sha256-uFXDLpKCWUzpfGMl1+wqTfnwqAJAOXhmjbj/FXjCahQ=";

/**
 * Content Security Policy, the second wall behind escaping and safeUrl. Nothing may load or run unless
 * named: no script at all (default-src 'none' and no script-src), images from this site or https, the one
 * inline style by its hash, no <base> and no forms. A meta tag cannot set frame-ancestors; that needs a
 * response header (upstream tests/security/header-contract.json).
 */
export const CSP = `default-src 'none'; img-src 'self' https:; style-src '${STYLE_HASH}'; base-uri 'none'; form-action 'none'`;

/** Who a page is for. A private course (`auth: 1`) is built only on purpose, and every page says so. */
export type Access = "public" | "private";

const PRIVATE_NOTICE = "Private course: its properties.yaml says auth: 1, so the Tutors reader shows it only to signed-in, enrolled readers. This static copy has no sign-in. Publish it only behind access control.";

/** A whole page. `home` and `up` are links relative to this page. */
export function page(title: string, home: string, up: string, body: SafeHtml, access: Access): string {
  const isPrivate = access === "private";
  return html`<!doctype html>
<html lang="en">
<head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="referrer" content="strict-origin-when-cross-origin">
${isPrivate && html`<meta name="robots" content="noindex, nofollow"><meta name="tutors-access" content="private">
`}<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title><style>${new SafeHtml(STYLE)}</style></head>
<body>
${isPrivate && html`<p class="private" role="note">${PRIVATE_NOTICE}</p>
`}<nav><a href="${home}">Home</a><a href="${up}">Up</a></nav>
<main>
${body}
</main>
</body>
</html>
`.value;
}
