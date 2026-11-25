# Rung Delta: 1, Seed

## Capability

`node src/main.ts <courseFolder> [outFile]` reads a Tutors course folder and writes `tutors.json`: the
course, its topics, units and sides, and the talks, labs, notes, web links and archives inside them.

## Expertise needed

- TypeScript on Node 22, run with type stripping: only erasable syntax, `import type` for types.
- The file system: `node:fs` and `node:path`.
- The Tutors course format: folder prefixes (`topic-`, `unit-`, `talk-`, `book-`, ...), `course.md`,
  lab steps named `NN.Title.md`, `weburl`, front matter, Marp decks.
- Discriminated unions and exhaustive `switch` with a `never` check.
- `node --test` and `node:assert`.

## Where this lives upstream

Pinned at tutors-mono-repo `2b96b69`.

| Here | Upstream | What is mirrored |
| --- | --- | --- |
| `src/model.ts` | `packages/jsr/model/src/types/learning-objects.ts` | `Course`, `Topic`, `Unit`, `Side`, `Talk`, `Lab`, `LabStep`, `Note`, `Web`, `Archive` and their `type` strings |
| `src/model.ts` | `packages/jsr/model/src/types/type-utils.ts` | `loTypes` (as `folderKinds`) and `preOrder` |
| `src/course-builder.ts` `folderKind` | `packages/jsr/gen/src/services/resource-builder.ts`, `packages/jsr/gen/src/utils/file-utils.ts` (`findLastMatchingString`) | kind from the folder name, longest prefix first; `book` means lab |
| `src/course-builder.ts` `buildLo` | `packages/jsr/gen/src/services/course-builder.ts` | one builder per kind, `preOrder` sort, Marp body for talks, lab steps, `weburl`, archive file |
| `src/course-builder.ts` `readMarkdown` | `packages/jsr/gen/src/utils/lr-utils.ts` (`getMarkdown`, `getRoute`), `file-utils.ts` (`getHeaderFromBody`) | title, summary, body, routes with `{{COURSEURL}}` |
| `src/main.ts` | `packages/jsr/tutors/main.ts`, `packages/jsr/gen/src/tutors.ts` (`parseCourse`) | the `tutors` command, writing `json/tutors.json` |
| `tests/conformance.test.ts` | the upstream generator itself | its output for the shared fixture is the oracle |

## Deliberately left out

- Images (`img`, `imgFile`), videos, PDFs, `frontMatter`, `hide`, `authLevel`, `properties.yaml`,
  `calendar.yaml` and `enrollment.yaml`. They need a YAML parser or concern the reader.
- The kinds `notebook`, `github`, `tutorial`, `podcast`, `whiteboard`, the panel kinds and `quiz`. They are
  recognised, so `notebook-1` is not mistaken for a note, then skipped with a message on stderr.
- `decorateCourseTree` (Markdown to HTML, table of contents, walls). HTML is rung 2.
- Copying assets, `netlify.toml`, `llms.txt` and course validation (`course-rules`).

## Assertion Ladder

| Rule | Rung | Where |
| --- | --- | --- |
| The generator agrees with upstream | L3 Executable Rule | `tests/conformance.test.ts` |
| No dependency, package import, network or HTML | L3/L4 Teaching Failure | `tests/rung-fence.test.ts` |
| Every kind has a builder and an order | L5 Unrepresentable Mistake | `switch` with `assertNever` in `buildLo`; `Record<LoType, number>` for `preOrder` |
| The shape of a feature | L1 Worked Slice | the whole of `src/` |
| What cannot be tested | L2 Short Manifest | `AGENTS.md` |

L5 needs a type checker, and this rung installs none. Your editor runs one as you type, with the strict
settings in `tsconfig.json` (it will also ask for Node's types, which rung 3 installs). The gate gains
`tsc --noEmit` in rung 3. Until then `assertNever` also throws at run time, so a missed kind fails loudly
instead of writing a wrong `tutors.json`.
