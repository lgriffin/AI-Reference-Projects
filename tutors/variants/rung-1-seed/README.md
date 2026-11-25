# Rung 1: Seed

A course folder in, `tutors.json` out. This is the smallest Tutors generator: three source files, no
dependencies, nothing to install. It is the Worked Slice of the ladder: read it whole before you change it.

## Run it in three commands

    node --version                 # 22.18 or later
    npm test                       # the Single Gate: every test, including the Rung Fence
    node src/main.ts ../fixtures/ladder-sample-course out/tutors.json

Without an output file the generator writes `json/tutors.json` inside the course folder, as upstream
`tutors` does.

## How it works

| File | Job |
| --- | --- |
| `src/model.ts` | The learning objects as a discriminated union on `type`, plus `preOrder` and the folder prefixes. |
| `src/course-builder.ts` | Walks the folder. A folder's kind is the longest prefix of its name; each kind is built by one `case`. |
| `src/main.ts` | The command line: checks for `course.md`, builds, writes JSON. |

`tests/conformance.test.ts` builds the shared fixture and compares it, field by field, with the
`tutors.json` that the upstream generator wrote for the same folder.

See `RUNG.md` for what this rung adds and leaves out, and `AGENTS.md` for the working agreement.
