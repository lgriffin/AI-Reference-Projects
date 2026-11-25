/**
 * Architecture inside the reader: the layers of apps/reader/src (README.md, "The reader"), executable.
 * They mirror upstream's UI packages, where ui-components -> ui-navigators -> ui-primitives and primitives
 * import no data package (tests/architecture/dependency-rules.test.ts, rules layer-ui-* and
 * ui-primitives-no-data-features). If a rule fails, fix the code, not the test.
 */
import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");
const SRC = "apps/reader/src";

/** Each folder of the reader, the folders it may import, whether it may use SvelteKit, and why. */
const READER_LAYERS: Record<string, { may: string[]; kit: boolean; job: string }> = {
  "lib/course": { may: [], kit: false, job: "course turns tutors.json into a tree and finds pages in it; it is plain TypeScript, so Vitest runs it without a browser and Stryker can mutate it" },
  "lib/runes": { may: ["lib/course"], kit: false, job: "runes hold shared state; they know the course's types and nothing of how it is shown" },
  "lib/ui-primitives": { may: [], kit: false, job: "primitives (Icon, Markdown) are the smallest pieces; like upstream's ui-primitives they import no data, so any layer above can use them" },
  "lib/ui-navigators": { may: ["lib/ui-primitives", "lib/runes", "lib/course"], kit: true, job: "navigators (the shell, the breadcrumbs) frame a page; they sit below the components, as upstream's ui-navigators" },
  "lib/ui-components": { may: ["lib/ui-navigators", "lib/ui-primitives", "lib/runes", "lib/course"], kit: true, job: "components (Card, Composite, Lab) show learning objects" },
  routes: { may: ["lib/ui-components", "lib/ui-navigators", "lib/ui-primitives", "lib/runes", "lib/course"], kit: true, job: "routes load a page's data and hand it to one component" },
};

/** Source without comments, so a comment may name what the code must not do. */
const stripComments = (text: string) => text.replace(/<!--[\s\S]*?-->|\/\*[\s\S]*?\*\/|(?<![:"'])\/\/.*$/gm, "");

type File = { file: string; layer: string | undefined; source: string };

const layerOf = (path: string) => Object.keys(READER_LAYERS).find((layer) => path === `${SRC}/${layer}` || path.startsWith(`${SRC}/${layer}/`));

const files: File[] = readdirSync(join(ROOT, SRC), { recursive: true, encoding: "utf8" })
  .map((file) => `${SRC}/${file.replaceAll("\\", "/")}`)
  .filter((file) => /\.(ts|svelte)$/.test(file))
  .map((file) => ({ file, layer: layerOf(file), source: stripComments(readFileSync(join(ROOT, file), "utf8")) }));

const specifiers = (source: string) => [...source.matchAll(/(?:from|import)\s*\(?\s*"([^"]+)"/g)].map((match) => match[1]!);

/** Where an import inside the reader lands, as a path from the variant root; undefined for a package. */
function target(file: string, specifier: string): string | undefined {
  if (specifier.startsWith("#lib/")) return `${SRC}/lib/${specifier.slice(5)}`;
  if (specifier.startsWith(".")) return relative(ROOT, resolve(ROOT, dirname(file), specifier)).replaceAll("\\", "/");
  return undefined;
}

function none(found: string[], rule: string) {
  if (found.length > 0) assert.fail(`${rule}\n  ${found.join("\n  ")}`);
}

test("every reader file sits in a known layer", () => {
  const root = ["app.d.ts"].map((name) => `${SRC}/${name}`);
  none(
    files.filter(({ file, layer }) => layer === undefined && !root.includes(file)).map(({ file }) => file),
    `Reader layering rule: each file in ${SRC} lives in one of [${Object.keys(READER_LAYERS).join(", ")}], so the rules below can place it. ` +
      "Move the file into the layer that matches its job, or ask a person to add a layer to READER_LAYERS.",
  );
});

for (const { file, layer, source } of files.filter((f) => f.layer !== undefined)) {
  const { may, kit, job } = READER_LAYERS[layer!]!;
  describe(file, () => {
    test("imports only the reader layers beneath it", () => {
      const illegal = specifiers(source)
        .map((specifier) => ({ specifier, to: layerOf(target(file, specifier) ?? "") }))
        .filter(({ to }) => to !== undefined && to !== layer && !may.includes(to));
      none(
        illegal.map(({ specifier, to }) => `${file} imports "${specifier}" (${to})`),
        `Reader layering rule: ${layer} may import only [${may.join(", ") || "nothing else in the reader"}], because ${job}. ` +
          "Pass what you need down as a prop, or move the code to the layer that may import it (README.md, The reader).",
      );
    });

    if (!kit) {
      test("leaves SvelteKit to the routes and the UI above it", () => {
        const found = specifiers(source).filter((s) => s.startsWith("$app/") || s.startsWith("@sveltejs/kit"));
        none(
          found.map((s) => `${file} imports "${s}"`),
          `Framework rule: ${layer} does not use SvelteKit, because ${job}. Take what SvelteKit gives (fetch, params, navigation) as an argument from a route.`,
        );
      });
    }
  });
}

test("lib/course is plain TypeScript", () => {
  none(
    files.filter(({ layer, file, source }) => layer === "lib/course" && (file.endsWith(".svelte") || /\.svelte\.ts$/.test(file) || /from "svelte/.test(source))).map(({ file }) => file),
    "Plain logic rule: lib/course holds no components and no runes, so Vitest, the BDD scenarios and Stryker run it as they run gen and lite. Put components in a ui-* layer and shared state in lib/runes.",
  );
});

test("only the course service fetches", () => {
  none(
    files.filter(({ file, source }) => /\bfetch\s*\(|XMLHttpRequest|WebSocket/.test(source) && file !== `${SRC}/lib/course/course-service.ts`).map(({ file }) => file),
    "Loader rule: the reader reaches the network in one place, lib/course/course-service.ts, which fetches tutors.json with the fetch a load function hands it and keeps the course. " +
      "Upstream's courseService does the same. Call readCourse, readLo or readLab from the route's +page.ts.",
  );
});

test("only the Markdown primitive writes raw HTML", () => {
  none(
    files.filter(({ file, source }) => source.includes("{@html") && file !== `${SRC}/lib/ui-primitives/Markdown.svelte`).map(({ file }) => file),
    "Raw HTML rule: {@html} bypasses Svelte's escaping, so the reader uses it in one place, lib/ui-primitives/Markdown.svelte, on what renderMarkdown from @ladder/lite returns (it escapes first). " +
      "Show course text with {text}, which Svelte escapes, or as <Markdown markdown={...} />. renderMarkdown passes every address through safeUrl (R-022); sanitising raw author HTML with DOMPurify is the Summit's.",
  );
});

test("only the course tree turns a route from tutors.json into a link", () => {
  none(
    files
      .filter(({ file }) => file.endsWith(".svelte"))
      .filter(({ source }) => /href=\{[^}]*\b(contentMd|summary|title|archiveFile|videoid|img)\b[^}]*\}/.test(source))
      .map(({ file }) => file),
    "Route rule: Svelte escapes an href's text but cannot know that javascript:alert(1) is an address that runs. The only course field a component may put in an href is `route`, " +
      "and every route passed safeUrl in decorateCourseTree (lib/course/lo-tree.ts) as tutors.json entered the reader (R-033). Link to a learning object's route, or show the text without a link.",
  );
});
