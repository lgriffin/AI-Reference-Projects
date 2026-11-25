/**
 * Escaping by default (the Auto-escaping Template pattern). `html` escapes every value it interpolates
 * unless the value is already SafeHtml. SafeHtml is made only here and in markdown.ts, which escapes
 * its input first; tests/html.test.ts checks that no other file makes it.
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

const STYLE = `body{font-family:system-ui,sans-serif;max-width:52rem;margin:0 auto;padding:1rem;line-height:1.5}
nav{display:flex;gap:1rem;border-bottom:1px solid #ccc;padding-bottom:.5rem}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(14rem,1fr));gap:1rem;padding:0;list-style:none}
.card{border:1px solid #ccc;border-radius:.5rem;padding:.75rem}.kind{font-size:.75rem;text-transform:uppercase;color:#555}
.slide{border:1px solid #ccc;border-radius:.5rem;padding:1rem;margin:1rem 0}pre{background:#f4f4f4;padding:.75rem;overflow-x:auto}`;

/** A whole page. `home` and `up` are links relative to this page. */
export function page(title: string, home: string, up: string, body: SafeHtml): string {
  return html`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title><style>${new SafeHtml(STYLE)}</style></head>
<body>
<nav><a href="${home}">Home</a><a href="${up}">Up</a></nav>
<main>
${body}
</main>
</body>
</html>
`.value;
}
