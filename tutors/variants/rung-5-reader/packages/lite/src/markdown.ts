/**
 * A small Markdown renderer: headings, paragraphs, lists, code fences, links, images, bold and emphasis.
 * Everything else is shown as text. Every character of input is escaped before any tag is added, so
 * the output is SafeHtml. A full Markdown library arrives in rung 5 (Reader); sanitising links such as
 * `javascript:` is rung 6 (Guarded).
 */
import { escapeHtml, SafeHtml } from "./html.ts";

/** Code spans, images and links: rendered whole, so emphasis never reaches inside a URL. */
const TOKEN = /(`[^`]*`|!\[[^\]]*\]\([^)\s]*\)|\[[^\]]+\]\([^)\s]*\))/;

function emphasis(escaped: string): string {
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/(^|\W)_([^_]+)_(?=\W|$)/g, "$1<em>$2</em>");
}

/** One line of inline Markdown as HTML. */
export function renderInline(text: string): string {
  return text
    .split(TOKEN)
    .map((part, i) => {
      if (i % 2 === 0) return emphasis(escapeHtml(part));
      if (part.startsWith("`")) return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
      const [, bang, label, url] = part.match(/^(!?)\[([^\]]*)\]\(([^)\s]*)\)$/)!;
      return bang
        ? `<img src="${escapeHtml(url!)}" alt="${escapeHtml(label!)}">`
        : `<a href="${escapeHtml(url!)}">${emphasis(escapeHtml(label!))}</a>`;
    })
    .join("");
}

const FENCE = /^(```|~~~)\s*([\w+-]*)/;
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const startsBlock = (line: string) => FENCE.test(line) || HEADING.test(line) || BULLET.test(line) || NUMBERED.test(line);

/** A Markdown document as HTML. */
export function renderMarkdown(markdown: string): SafeHtml {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const fence = line.match(FENCE);
    const heading = line.match(HEADING);
    if (line.trim() === "") {
      i++;
    } else if (fence) {
      const code: string[] = [];
      for (i++; i < lines.length && !lines[i]!.startsWith(fence[1]!); i++) code.push(lines[i]!);
      i++; // the closing fence
      const language = fence[2] ? ` class="language-${escapeHtml(fence[2])}"` : "";
      out.push(`<pre><code${language}>${escapeHtml(code.join("\n"))}</code></pre>`);
    } else if (heading) {
      const level = heading[1]!.length;
      out.push(`<h${level}>${renderInline(heading[2]!)}</h${level}>`);
      i++;
    } else if (BULLET.test(line) || NUMBERED.test(line)) {
      const pattern = BULLET.test(line) ? BULLET : NUMBERED;
      const items: string[] = [];
      for (; i < lines.length && pattern.test(lines[i]!); i++) items.push(`<li>${renderInline(lines[i]!.match(pattern)![1]!)}</li>`);
      const tag = pattern === BULLET ? "ul" : "ol";
      out.push(`<${tag}>${items.join("")}</${tag}>`);
    } else {
      const paragraph: string[] = [];
      for (; i < lines.length && lines[i]!.trim() !== "" && (paragraph.length === 0 || !startsBlock(lines[i]!)); i++) paragraph.push(lines[i]!.trim());
      out.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
    }
  }
  return new SafeHtml(out.join("\n"));
}
