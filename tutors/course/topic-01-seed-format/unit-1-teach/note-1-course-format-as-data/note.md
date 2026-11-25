# The course format as data

Why Tutors treats a course as a folder with a grammar, how the generator turns that folder into one tree of
data, and who else reads the same grammar. Worked from rung 1 and from upstream at `2b96b69`.

## Why a format at all

A lecturer writes a course the way they write anything else: in files, in folders, in a Git repository.
Tutors does not ask them to fill in a database or click through an editor. It asks them to follow a small
grammar in the names of their folders. Everything else follows from that choice.

The grammar is the course format. It has three parts:

1. **A folder's name says what it holds.** `topic-01-basics` is a topic. `talk-1-welcome` is a talk.
   `book-1-first-lab` is a lab. `web-1-tutors` is a link.
2. **A folder's first Markdown file describes it.** Its first line is the title and its next non-blank line
   is the summary. The rest is the body.
3. **Some kinds need one more file.** A web link needs `weburl`. An archive needs a `.zip`. A lab needs steps
   named `00.Title.md`, `01.Title.md` and so on. A talk usually has a Marp deck.

A program that knows the grammar can read any course. Three programs do: the **generator**, which turns the
folder into `tutors.json`; the **validator**, which says where a folder breaks the grammar; and, indirectly,
the **reader**, which never sees the folder at all but renders the data the generator wrote. This note follows
the data through all three.

## The folder is the source of truth

Here is the shared fixture that every variant in this module is tested against,
`tutors/variants/fixtures/ladder-sample-course`:

~~~
course.md
properties.yaml
topic-01-basics/
  topic.md
  side-resources/        side.md
    archive-1-solutions/ archive.md  archive.zip
  unit-1-intro/          unit.md
    note-1-reading/      note.md
    talk-1-welcome/      talk.md  talk.marp
topic-02-practice/
  topic.md
  unit-1-lab/            unit.md
    book-1-first-lab/    00.Lab-01-First-Steps.md  01.Setup.md  02.Build.md  img/main.png
    web-1-tutors/        web.md  weburl
~~~

There is no index file and no manifest. The tree of folders is the tree of the course. If you move
`note-1-reading` into `topic-02-practice`, the note moves in the course. That is the whole idea, and it is why
the format can be edited by anyone who can rename a folder.

## The kind comes from the name

Rung 1 keeps the grammar's vocabulary in one table, in `src/model.ts`:

~~~ts
export const folderKinds: [prefix: string, kind: LoType | null][] = [
  ["topic", "topic"], ["unit", "unit"], ["side", "side"], ["talk", "talk"],
  ["book", "lab"], ["lab", "lab"], ["note", "note"], ["web", "web"], ["archive", "archive"],
  ["notebook", null], ["github", null], ["tutorial", null], ["podcast", null],
  ["whiteboard", null], ["panelnote", null], ["paneltalk", null], ["panelvideo", null], ["quiz", null],
];
~~~

and reads it in `src/course-builder.ts`:

~~~ts
const kindsLongestFirst = [...folderKinds].sort(([a], [b]) => b.length - a.length);

export function folderKind(name: string): LoType | null | undefined {
  return kindsLongestFirst.find(([prefix]) => name.startsWith(prefix))?.[1];
}
~~~

Two details carry most of the weight.

**Longest prefix first.** `notebook-a` starts with `note`. If the table were read in order, a notebook would
become a note. Sorting the prefixes by length means `notebook` is tried before `note`, so the longer, more
specific name wins. Upstream does exactly the same thing in `findLastMatchingString`
(`packages/jsr/gen/src/utils/file-utils.ts`):

~~~ts
const sortedTypes = [...loTypes].sort((a, b) => b.length - a.length);
~~~

**Three answers, not two.** `folderKind` returns a kind (`"note"`), `null` (a kind Tutors knows and rung 1
does not build yet, such as `github`), or `undefined` (no kind at all). The caller treats them differently:

~~~ts
const kind = folderKind(name);
if (kind === undefined) continue;                          // not content: leave it out, silently
if (kind === null) {                                       // known, but not on this rung: say so
  process.stderr.write(`skipped ${join(folder.rel, name)}: this rung does not build this kind\n`);
  continue;
}
~~~

Upstream reaches the same result in two steps. `getLoType` in `packages/jsr/gen/src/services/resource-builder.ts`
gives every folder a type (and turns `book` into `lab`, and an unmatched name into `"unknown"`), then
`pruneTree` drops every folder typed `"unknown"`:

~~~ts
export function pruneTree(lr: LearningResource): void {
  lr.lrs = lr.lrs.filter((resource) => resource.type !== "unknown");
  lr.lrs.forEach((resource) => pruneTree(resource));
}
~~~

Notice the word *silently*. A folder named `welcome` instead of `note-1-welcome` is not an error to either
generator. It simply vanishes, and with it everything inside. That silence is the single most important fact
about the course format, and the reason the validator exists.

## Title, summary and body

Every learning object carries the same five fields, typed in `src/model.ts`:

~~~ts
type LoBase = {
  id: string;        // the folder name, e.g. "talk-1-welcome"
  title: string;     // the first line of the markdown file, without the leading "#"
  summary: string;   // the first line after the title
  contentMd: string; // the markdown body, without front matter
  route: string;     // where the reader shows it
};
~~~

`readMarkdown` fills the first four from the folder's first `.md` file (folders are read in sorted order, so
"first" is alphabetical). It strips a leading `---` front matter block, takes the first line as the title,
and drops **one** `#`. That last detail is an upstream quirk. Upstream's `getHeaderFromBody`
(`packages/jsr/gen/src/utils/file-utils.ts`) removes the first character when it is `#`, then trims:

~~~ts
if (array[0][0] === "#") {
  header = array[0].substring(1);
}
~~~

So a title written `## Hello` arrives as `# Hello`, with one `#` still on it. Rung 1 does the same, because
rung 1 does what upstream does, not what seems tidy. The conformance test in week 2 is what holds it to that.

The `id` is the folder's name. The course's `id` is the name of the course folder itself, which is why the
same course copied to `/tmp/fx` gets the id `fx`.

## What each kind adds

The `switch` in `buildLo` (`src/course-builder.ts`) gives each kind one `case`. Read it as a table of what
the grammar asks of each folder:

| Kind | Extra file | What the builder does | Upstream |
| --- | --- | --- | --- |
| `talk` | `*.marp` | the deck's body replaces `contentMd` | `buildTalk` |
| `web` | `weburl` | `route` is its first line, trimmed | `buildWeb`, `getWebLink` |
| `archive` | `*.zip` | `archiveFile` is its name | `buildArchive` |
| `lab` | `NN.Title.md` files | one `step` per file; id and `shortTitle` from the file name | `buildLab` |
| `unit`, `side` | none | `route` points at the parent topic | `buildUnit`, `buildSide` |
| `course`, `topic` | none | children, sorted | `buildCompositeLo` |

The web case is two lines and shows the pattern:

~~~ts
case "web": {
  const url = folder.files.includes("weburl") ? readFileSync(join(folder.path, "weburl"), "utf8").split("\n")[0]!.trim() : "";
  return { ...base(folder, kind), type: kind, route: url } satisfies Web;
}
~~~

The lab case holds the one surprise. A lab whose folder has `img/main.png` takes the **short title of its
first step** as its own title. That is why the fixture's lab is called `Lab-01-First-Steps` (from
`00.Lab-01-First-Steps.md`) and not `Objectives` (the heading inside that file). It is also why every lab in
this module is named `00.Lab-NN-Title.md` and carries an `img/main.png`: we follow the format the generator
actually implements.

## Routes and order

Each object gets a route that the reader will use as a URL:

~~~
/topic/{{COURSEURL}}/topic-02-practice
/lab/{{COURSEURL}}/topic-02-practice/unit-1-lab/book-1-first-lab
/lab/{{COURSEURL}}/topic-02-practice/unit-1-lab/book-1-first-lab/Setup
https://tutors.dev
~~~

`{{COURSEURL}}` is a placeholder. The generator does not know where the course will be served; the reader
fills it in. A unit's route points at its topic, because a unit has no page of its own: it is a box of cards
on the topic's page.

Children are sorted by `preOrder` (course 0, unit 1, side 2, topic 3, talk 4, lab 7, note 8, web 9, archive 11),
and kept in folder-name order within a kind. So in `unit-1-intro` the talk comes before the note, even though
`note-1` sorts before `talk-1` by name. Upstream keeps the same numbers in a `Map` in
`packages/jsr/model/src/types/type-utils.ts`; rung 1 keeps them in a `Record<LoType, number>`, which week 2
shows is a stronger choice.

## The course as one tree

Here is what rung 1 writes for the tiny course you build in Lab 1 (a topic with one note and one link), as
the lab actually printed it:

~~~json
{
  "title": "My First Course",
  "summary": "A tiny course I wrote while setting up Tutors.",
  "contentMd": "# My First Course\n\nA tiny course I wrote while setting up Tutors.\n",
  "id": "my-course",
  "route": "/",
  "type": "course",
  "los": [
    { "title": "Hello", "summary": "A first topic, with one note and one link.", "id": "topic-01-hello",
      "route": "/topic/{{COURSEURL}}/topic-01-hello", "type": "topic",
      "los": [
        { "title": "Welcome", "id": "note-1-welcome", "route": "/note/{{COURSEURL}}/topic-01-hello/note-1-welcome", "type": "note", ... },
        { "title": "Tutors", "id": "web-1-tutors", "route": "https://tutors.dev", "type": "web", ... }
      ] }
  ]
}
~~~

That is the course as data. Every page the reader will ever show is in this one tree, with its Markdown
inlined. Upstream writes more fields on every object (`frontMatter`, `img`, `imgFile`, `video`, `videoids`,
`hide`, `authLevel`, and `properties` on the course); rung 1 writes the ones it needs and lists the rest in
`RUNG.md`, "Deliberately left out".

## Who reads the data

**The reader** (`apps/reader` upstream) fetches `tutors.json` over HTTP and never touches the folder. In
`packages/svelte/course/src/course/services/lo-tree.ts`, `determineCourseUrl` turns a course id into a host:
a bare id such as `reference-course` becomes `reference-course.netlify.app`, and `localhost:8080` stays a local
address. Then `decorateCourseTree`, in the same file, walks the tree once and adds what the interface needs:
routes with the course URL filled in, indexes, breadcrumbs, icons. This is why the format is worth getting
right: the data contract between generator and reader is the course format, written out. Rung 5 (Reader,
weeks 8 and 9) rebuilds this side.

**The validator** reads the folder, not the data. Upstream keeps its rules in `packages/jsr/course-rules`,
catalogued in `src/finding.ts` as V001 to V021. Some you will meet this week:

| Rule | Severity | Summary (from `finding.ts`) |
| --- | --- | --- |
| V001 | error | The course folder has a course.md |
| V002 | error | Every folder that holds course material has a name that starts with a learning-object kind |
| V003 | error | Every unit, side and topic has a descriptor .md |
| V005 | error | Web and GitHub links hold a URL or repository in their link file |
| V010 | warn | Topics side by side are numbered in sequence |
| V011 | warn | A netlify.toml publishes the generated json or html folder |
| V015 | error | A Marp deck starts with marp: true, so Tutors shows it as slides |

V002 is the answer to the silence above. When you rename `note-1-welcome` to `welcome` in Lab 1, the
generator says nothing, and `check-course.sh` says:

~~~
error V002 topic-01-hello/welcome: The folder "welcome" won't appear in your course, nor will anything inside
it, because its name doesn't start with a kind Tutors knows (topic, unit, talk, note, lab and so on). Rename it
so it starts with the kind of content it holds, like talk-, note- or lab-.
~~~

The rule, the offender and the fix, in one message. Hold that shape in mind; it has a name in the next note.

## A first CLI

The generator is a library function, `buildCourse(root)`, and a 23-line command around it, `src/main.ts`.
Keeping the two apart is the first design decision in the module, and every later rung keeps it:

- `buildCourse` takes a path and returns a `Course`. It never calls `process.exit`, never reads `argv`, and
  can be tested by calling it.
- `main.ts` owns the outside world: arguments, exit codes, writing the file. Exit 2 is a usage error, 1 is
  "this folder is not a course", 0 is success.

Upstream's `packages/jsr/tutors/main.ts` works in the current folder, prints "Cannot locate course.md" when
there is none, and exits 0 either way (try it in Lab 1). `packages/jsr/tutors-cli/main.ts` puts the generator,
`tutors-lite` and the validator behind one program: `tutors build`, `tutors website`, `tutors validate`.

## Which levels guard this week's rules

| Rule | Level | Where it is kept |
| --- | --- | --- |
| A content folder's name starts with its kind | L4 Explained | upstream V002, run by `tutors/scripts/check-course.sh`; the message names the folder and the fix |
| Every topic, unit and side has a descriptor `.md` | L4 Explained | upstream V003, same gate |
| A Marp deck starts with `marp: true` | L4 Explained | upstream V015, same gate |
| A folder's kind is its longest prefix | L3 Checked | "a folder's kind is the longest prefix of its name" in `variants/rung-1-seed/tests/course-builder.test.ts` |
| Topics are numbered in sequence | L3 Checked (a warning) | upstream V010 |
| What a course looks like | L1 Shown | the fixture, `tutors-sdk/tutors-reference-course`, and this module itself |
| Only `main.ts` touches `process` | L2 Told | `variants/rung-1-seed/AGENTS.md`, "Where things go" |
| No network, no HTML, no dependency on rung 1 | L4 Explained | `variants/rung-1-seed/tests/rung-fence.test.ts` |

The generator itself sits at L0 for the naming rule: it implies the rule by ignoring what breaks it. The
validator lifts the same rule to L4. Seeing one rule at two levels in two programs is a good first lesson in
the Assertion Ladder.

## Self-check

1. **(Remember)** Which file does a `web-` folder need, and which field of the learning object does it fill?
2. **(Remember)** What is the `type` of a folder named `book-2-deploy`?
3. **(Understand)** Why does `folderKind` sort the prefixes by length before matching? Give a folder name that
   would be misread without it.
4. **(Understand)** Explain the difference between `null` and `undefined` from `folderKind`, and what the
   caller does with each.
5. **(Understand)** Why does a unit's route point at its topic?
6. **(Apply)** Predict the `title` of a lab folder that has `00.Lab-04-Deploy.md` (whose first line is
   `# Objectives`) and `img/main.png`. Then predict it without `img/`.
7. **(Analyse)** The generator ignores a misnamed folder and the validator reports it. Which Assertion Ladder
   level does each sit at for that rule, and why is the gap dangerous?
8. **(Evaluate)** Rung 1 exits 1 when there is no `course.md`; upstream exits 0. Which is better for a script
   that runs in CI, and why?
