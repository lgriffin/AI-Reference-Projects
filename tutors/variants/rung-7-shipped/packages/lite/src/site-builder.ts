/**
 * Course in, pages out: the static website. Mirrors upstream packages/jsr/gen/src/services/course-emitter.ts,
 * which tutors-lite runs: a page for the course, each topic, each talk and note, and each lab step,
 * at the same paths upstream uses. Returns the pages as data; apps/cli writes them.
 *
 * Both switches below are exhaustive over `Lo["type"]`: add a kind to @ladder/model and this file stops
 * compiling until the site can show it (Unrepresentable Mistake).
 *
 * Rung 6: a web link's address passes safeUrl like any other, and every page carries the site's Access,
 * which the caller decides (apps/cli asks @ladder/rbac). There is no default: a private course is never
 * built as public by accident.
 */
import type { Composite, Course, Lab, Lo } from "@ladder/model";
import { html, page } from "./html.ts";
import type { Access, SafeHtml } from "./html.ts";
import { renderMarkdown } from "./markdown.ts";
import { safeUrl } from "./url.ts";

/** One file of the website: a path relative to the output folder, and its HTML. */
export type SitePage = { path: string; html: string };

/** A link from the page at `from` to the page at `to`, both relative to the site root. */
export function relativeHref(from: string, to: string): string {
  return "../".repeat(from.split("/").length - 1) + to;
}

/** How a learning object appears inside its parent's page. `dir` is its folder, relative to that page. */
function card(lo: Lo, dir: string): SafeHtml {
  const kind = html`<span class="kind">${lo.type}</span>`;
  switch (lo.type) {
    case "course":
    case "topic":
    case "talk":
    case "note":
    case "lab":
      return html`<li class="card">${kind}<h3><a href="${dir}index.html">${lo.title}</a></h3><p>${lo.summary}</p></li>`;
    case "web": {
      const url = safeUrl(lo.route, "link");
      const title = url === null ? html`<span class="blocked" title="unsafe address removed">${lo.title}</span>` : html`<a href="${url}">${lo.title}</a>`;
      return html`<li class="card">${kind}<h3>${title}</h3><p>${lo.summary}</p></li>`;
    }
    case "archive": // the archive file is not copied in this rung, so it is named, not linked
      return html`<li class="card">${kind}<h3>${lo.title}</h3><p>${lo.summary}</p><p><code>${lo.archiveFile}</code></p></li>`;
    case "unit":
    case "side":
      return html`<li class="card unit">${kind}<h3>${lo.title}</h3><ul class="cards">${lo.los.map((child) => card(child, `${dir}${child.id}/`))}</ul></li>`;
    default:
      return assertNever(lo);
  }
}

function compositePage(lo: Composite, path: string, up: string, access: Access): SitePage {
  const body = html`<h1>${lo.title}</h1>${renderMarkdown(lo.contentMd.split("\n").slice(1).join("\n"))}
<ul class="cards">${lo.los.map((child) => card(child, `${child.id}/`))}</ul>`;
  return { path, html: page(lo.title, relativeHref(path, "index.html"), relativeHref(path, up), body, access) };
}

/** A Marp deck is Markdown with `---` lines between slides; each slide becomes a section. */
function slides(markdown: string): SafeHtml[] {
  return markdown.split(/^---\s*$/m).map((slide) => html`<section class="slide">${renderMarkdown(slide)}</section>`);
}

function labPages(lab: Lab, dir: string, up: string, access: Access): SitePage[] {
  const fileOf = (index: number) => (index === 0 ? "index.html" : `${lab.los[index]!.shortTitle}.html`);
  return lab.los.map((step, index) => {
    const path = `${dir}${fileOf(index)}`;
    const steps = lab.los.map((s, i) => html`<li>${i === index ? html`<strong>${s.title}</strong>` : html`<a href="${fileOf(i)}">${s.title}</a>`}</li>`);
    const previous = index > 0 ? html`<a href="${fileOf(index - 1)}">Previous</a> ` : "";
    const next = index < lab.los.length - 1 ? html`<a href="${fileOf(index + 1)}">Next</a>` : "";
    const body = html`<p class="kind">${lab.title}</p><ol>${steps}</ol><article>${renderMarkdown(step.contentMd)}</article><p>${previous}${next}</p>`;
    return { path, html: page(`${lab.title}: ${step.title}`, relativeHref(path, "index.html"), relativeHref(path, up), body, access) };
  });
}

/**
 * Every page for one learning object and the objects inside it. `dir` is its folder in the site
 * ("" for the course); `up` is the page its own pages link back to; `access` marks every page.
 */
export function pagesFor(lo: Lo, dir: string, up: string, access: Access): SitePage[] {
  const path = `${dir}index.html`;
  const children = (parent: Composite, parentPage: string) => parent.los.flatMap((child) => pagesFor(child, `${dir}${child.id}/`, parentPage, access));
  const single = (body: SafeHtml): SitePage[] => [{ path, html: page(lo.title, relativeHref(path, "index.html"), relativeHref(path, up), body, access) }];
  switch (lo.type) {
    case "course":
    case "topic":
      return [compositePage(lo, path, up, access), ...children(lo, path)];
    case "unit":
    case "side": // shown inside the topic page; their children link back to it
      return children(lo, up);
    case "talk":
      return single(html`${slides(lo.contentMd)}`);
    case "note":
      return single(renderMarkdown(lo.contentMd));
    case "lab":
      return labPages(lo, dir, up, access);
    case "web":
    case "archive":
      return []; // a card in the parent page is all they need
    default:
      return assertNever(lo);
  }
}

/** How a site is built. `access` is required: whoever builds a site says who it is for. */
export type SiteOptions = { access: Access };

/** The whole website for a course. */
export function buildSite(course: Course, options: SiteOptions): SitePage[] {
  return pagesFor(course, "", "index.html", options.access);
}

/** Reached only if a kind slips past the type checker; the compiler rejects any call that can get here. */
function assertNever(value: never): never {
  throw new Error(`unhandled learning object kind: ${JSON.stringify(value)}`);
}
