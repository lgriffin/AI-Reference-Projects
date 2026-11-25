/**
 * The learning objects of a Tutors course, as tutors.json holds them.
 * Names and `type` strings mirror upstream packages/jsr/model/src/types/learning-objects.ts.
 * The ladder keeps only the fields it builds; RUNG.md lists what it leaves out.
 */

/** What every learning object carries. */
type LoBase = {
  id: string; // the folder name, e.g. "talk-1-welcome"
  title: string; // the first line of the markdown file, without the leading "#"
  summary: string; // the first line after the title
  contentMd: string; // the markdown body, without front matter
  route: string; // where the reader shows it, e.g. "/talk/{{COURSEURL}}/topic-01/unit-1/talk-1"
};

/** A learning object that holds others: the course, a topic, a unit or a side. */
type CompositeBase = LoBase & { los: Lo[] };

export type Course = CompositeBase & { type: "course" };
export type Topic = CompositeBase & { type: "topic" };
export type Unit = CompositeBase & { type: "unit" };
export type Side = CompositeBase & { type: "side" };

export type Talk = LoBase & { type: "talk" };
export type Note = LoBase & { type: "note" };
export type Web = LoBase & { type: "web" }; // route is the external URL from the `weburl` file
export type Archive = LoBase & { type: "archive"; archiveFile: string };
export type Lab = LoBase & { type: "lab"; los: LabStep[] };

/** One page of a lab, from a file named NN.Title.md. Upstream types every step "step". */
export type LabStep = {
  type: "step";
  id: string; // "Setup" from 01.Setup.md
  shortTitle: string;
  title: string;
  contentMd: string;
  route: string;
};

/**
 * The discriminated union: `type` tells TypeScript which shape it holds.
 * Add a member here and every exhaustive `switch` on `lo.type` stops compiling until it handles it.
 */
export type Lo = Course | Topic | Unit | Side | Talk | Lab | Note | Web | Archive;
export type LoType = Lo["type"];
export type Composite = Course | Topic | Unit | Side;

/** Display order inside a composite, from upstream `preOrder`. A Record makes every LoType need an entry. */
export const preOrder: Record<LoType, number> = {
  course: 0,
  unit: 1,
  side: 2,
  topic: 3,
  talk: 4,
  lab: 7,
  note: 8,
  web: 9,
  archive: 11,
};

/**
 * Folder-name prefixes and the kind each names, from upstream `loTypes`. A folder whose name starts
 * with no prefix is not content. `null` marks a kind upstream builds and this rung does not.
 * "book" is the upstream name for a lab folder.
 */
export const folderKinds: [prefix: string, kind: LoType | null][] = [
  ["topic", "topic"],
  ["unit", "unit"],
  ["side", "side"],
  ["talk", "talk"],
  ["book", "lab"],
  ["lab", "lab"],
  ["note", "note"],
  ["web", "web"],
  ["archive", "archive"],
  ["notebook", null],
  ["github", null],
  ["tutorial", null],
  ["podcast", null],
  ["whiteboard", null],
  ["panelnote", null],
  ["paneltalk", null],
  ["panelvideo", null],
  ["quiz", null],
];
