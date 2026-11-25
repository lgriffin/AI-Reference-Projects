/**
 * Random course folders, as the files a lecturer would write: topics holding units, talks, notes, labs
 * with steps, web links and folders the generator must skip. Mirrors upstream
 * tests/support/arbitraries/course-tree.ts, the shared arbitrary its fuzz, differential and release
 * suites reuse. Each value comes with what a correct build must contain, so properties can check it.
 */
import fc from "fast-check";

/** Text a lecturer might write, attack strings included. */
export const courseText = fc.oneof(
  fc.constantFrom("Title", "Ünïcödé", "<script>alert(1)</script>", '" onclick="x', "a & b", "**bold**"),
  fc.string({ maxLength: 12 }).filter((text) => !text.includes("\n") && !text.includes("\r")),
);

const suffix = fc.stringMatching(/^[a-z0-9]{1,6}$/);
const md = (title: string, summary: string) => `# ${title}\n${summary}\n\nBody of ${title}.\n`;

export type CourseTree = {
  files: Record<string, string>;
  /** Pages the site must write: course, topics, talks, notes, and one per lab step. */
  pages: number;
  /** Lab folder path to its step file names in file-name order. */
  labs: Record<string, string[]>;
};

const leaf = fc.record({
  kind: fc.constantFrom("talk", "note", "web", "book", "notebook", "drafts"),
  id: suffix,
  title: courseText,
  summary: courseText,
  steps: fc.uniqueArray(fc.stringMatching(/^[A-Za-z][A-Za-z0-9-]{0,7}$/), { minLength: 1, maxLength: 4, selector: (s) => s.toLowerCase() }),
});

const topic = fc.record({ id: suffix, title: courseText, leaves: fc.uniqueArray(leaf, { maxLength: 5, selector: (l) => `${l.kind}-${l.id}` }), inUnit: fc.boolean() });

export const courseTree: fc.Arbitrary<CourseTree> = fc
  .record({ title: courseText, topics: fc.uniqueArray(topic, { minLength: 1, maxLength: 3, selector: (t) => t.id }) })
  .map(({ title, topics }) => {
    const files: Record<string, string> = { "course.md": md(title, "A course.") };
    const labs: Record<string, string[]> = {};
    let pages = 1;
    for (const t of topics) {
      const dir = `topic-${t.id}`;
      files[`${dir}/topic.md`] = md(t.title, "A topic.");
      pages++;
      const parent = t.inUnit ? `${dir}/unit-1` : dir;
      if (t.inUnit) files[`${parent}/unit.md`] = md("Unit", "A unit.");
      for (const l of t.leaves) {
        const folder = `${parent}/${l.kind}-${l.id}`;
        if (l.kind === "book") {
          l.steps.forEach((step, i) => (files[`${folder}/${String(i).padStart(2, "0")}.${step}.md`] = md(l.title, l.summary)));
          labs[folder] = l.steps;
          pages += l.steps.length;
        } else {
          files[`${folder}/${l.kind}.md`] = md(l.title, l.summary);
          if (l.kind === "web") files[`${folder}/weburl`] = "https://tutors.dev\n";
          if (l.kind === "talk" || l.kind === "note") pages++;
        }
      }
    }
    return { files, pages, labs };
  });
