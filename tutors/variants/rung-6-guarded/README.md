# Rung 6: Guarded

Rung 5's workspace, its reader, its tests and its requirements, made safe to point at a course you did not
write. Hostile links are neutralised in the static site and in the reader, every page carries a strict
Content Security Policy, the generator never reads outside the course folder, a private course is built
only on purpose and shown only to whom the policy allows, and the supply chain is checked. It was specified
first: fifteen new EARS requirements (`R-022` to `R-036`) and their Given/When/Then scenarios, with the
closure audit holding them together. It adds no dependency.

## Run it in three commands

    pnpm install                   # rung 5's tools; nothing new
    pnpm test                      # the Single Gate: tsc, svelte-check, every Vitest tier, then the reader's build
    pnpm start tests/fixtures/hostile-course out

The last command builds a course written to attack its site. Open `out/topic-01-attack/index.html` and
try the links. Then build the same course with rung 5 (`../rung-5-reader`) and try them again.

More commands:

    pnpm start ../fixtures/ladder-sample-course out        # the sample course, as every rung builds it
    pnpm start --private tests/fixtures/private-course out # a course whose properties.yaml says auth: 1
    pnpm dev                       # the reader, serving the sample, hostile and private courses
    pnpm test:e2e                  # the built reader in Chromium: no script from the hostile course runs
    pnpm audit:supply-chain        # offline: lockfile, registry sources, allowances
    pnpm audit:online              # also runs pnpm audit against the registry
    pnpm test:assignment           # the grading test for Assignment 6, which the gate skips

With `pnpm dev`, open <http://localhost:5173/course/hostile-course> and
<http://localhost:5173/course/private-course>. Run `pnpm exec playwright install chromium` once if you
have no browser.

## Defences, outside in

| Threat | Defence | Where | Requirement and proof |
| --- | --- | --- | --- |
| Course text becomes markup (`<script>`) | Escaping by default | `html` template in `packages/lite/src/html.ts`; Svelte's `{text}` | R-008; `tests/unit/lite/xss-corpus.test.ts` |
| A link or image runs script (`javascript:`, `data:`) | Sanitising: a URL scheme allow-list | `packages/lite/src/url.ts` | R-022; the corpus, `tests/fuzz/safe-url.fuzz.test.ts` |
| A route in `tutors.json` is script | The same allow-list, as the file enters the reader | `decorateCourseTree` in `apps/reader/src/lib/course/lo-tree.ts` | R-033; `guarded-reader.feature` |
| Something slips past both | Content Security Policy | `CSP` in `packages/lite/src/html.ts`; `apps/reader/csp.ts` | R-023, R-034; `tests/e2e/guarded.e2e.ts` |
| The build reads `../../.ssh/id_ed25519` or follows a link out | Path containment in every adapter | `containedPath` in `packages/gen`, `NodeFileSystem` | R-024, R-027; the port contract, both adapters |
| A page links to files outside its folder | Warning V021, as upstream | `packages/gen/src/portable.ts` | R-025; `containment.feature` |
| A private course is published openly | RBAC policy; `--private`; pages marked; the reader's notice | `packages/rbac`, `apps/cli/src/run.ts`, the course service | R-028 to R-032; `access.feature`, `guarded-command.feature` |
| A dependency from a git URL or tarball; a stale allowance | Registry sources only, lockfile required, allowances expire | `scripts/supply-chain.ts` | R-035, R-036; `supply-chain.feature` |

Each defence stands where the hostile value enters, and each is one layer of several: that is defence in
depth. `SECURITY.md` says what is out of scope. In particular, the reader's private-course notice is a
courtesy to an honest reader, not a lock: `tutors.json` is a file on the host, and only the host can refuse
to serve it.

## The tests

Everything from rung 5 still runs, and `tests/TESTING.md` maps every folder. What this rung adds:

| Command | What it runs | In the gate |
| --- | --- | --- |
| `pnpm test:bdd` | now also five `@security` features: R-022 to R-036, with hostile Givens | yes |
| `pnpm test:unit` | now also the XSS corpus, `safeUrl` row by row, the CSP, containment, the RBAC table, the guarded command and the supply-chain rules | yes |
| `pnpm test:contract` | the `FileSystemPort` contract with containment and links, and the new `SessionPort` contract | yes |
| `pnpm test:fuzz` | now also `safeUrl` against generated hostile addresses, with the browser's URL parser as oracle | yes |
| `pnpm exec vitest run tests/architecture` | now also the Identity, Purity, Containment, Sanitising and Route rules | yes |
| `pnpm test:e2e` | now also `guarded.e2e.ts`: the hostile and private courses in Chromium | no: it needs a browser |
| `pnpm test:mutation` | Stryker, now also over `url.ts`, containment, `portable.ts`, `settings.ts` and `packages/rbac` | no |
| `pnpm audit:supply-chain` | the offline audit, as a command (its rules also run in the gate as tests) | yes, as tests |

## From a threat to a test

    threat                a course author writes [the reading list](javascript:alert(document.cookie))
          │
          ▼
    REQUIREMENTS.md       R-022 | Unwanted behaviour | If a link, an image or a web link in a course has an address whose scheme is not http, https or, for a link, mailto, then the site shall show its text without the address. | lite
          │  the same sentence, word for word
          ▼
    tests/bdd/features/site/safe-content.feature     @R-022 @ears-unwanted  Rule: If a link, an image ...
          │  Scenario: Given a note whose Markdown is "[the reading list](javascript:alert)" / When the site is built / Then ...
          ▼
    packages/lite/src/url.ts      safeUrl: an allow-list, read the way a browser reads a scheme
          │
          ▼
    many more adversaries         the corpus (table), fast-check (properties), Stryker (mutants), Chromium (the hostile course)

## Architecture

    apps/cli ──► @ladder/gen ────► @ladder/model ◄──── @ladder/reader
        │                            ▲   ▲                 │
        ├──────► @ladder/lite ───────┘   │ ◄───────────────┤
        ├──────► @ladder/rbac ───────────┘ ◄───────────────┤
        │              │ (types only)                      │
        └──────► @ladder/identity ◄──┘ ◄───────────────────┘

| Package | Folder | Job | May import |
| --- | --- | --- | --- |
| `@ladder/model` | `packages/model` | The learning-object types, now with `properties` and `enrollment`. | nothing |
| `@ladder/identity` | `packages/identity` | `Actor` and `SessionPort`: who is reading, verified. `AnonymousSession`, `FakeSession`. | nothing |
| `@ladder/rbac` | `packages/rbac` | A pure policy: roles, permissions, `accessOf`, `canView`. | types of `model` and `identity` |
| `@ladder/gen` | `packages/gen` | Course folder to `Course`, through a contained `FileSystemPort`. | `@ladder/model` |
| `@ladder/lite` | `packages/lite` | `Course` to pages, sanitised and under a CSP; `renderMarkdown`, `safeUrl`. | `@ladder/model` |
| `@ladder/cli` | `apps/cli` | The composition root: adapters, the policy decision, the files. `--json-only`, `--private`. | all of the above |
| `@ladder/reader` | `apps/reader` | `tutors.json` to an interactive site, in the browser, guarded. | `model`, `lite`, `identity`, `rbac` |

Rules from rungs 3 to 5 still hold. Rung 6 adds five, in `tests/architecture/`: identity imports nothing
outside itself, rbac is pure, every file system adapter calls `containedPath`, every session adapter runs
the session contract, and every course address the site or the reader writes passed `safeUrl`.

## The reader

    src/routes/(course-reader)/<kind>/[courseid]/[...loid]/+page.ts    load: requestLo or requestLab, then found()
                                                    +page.svelte       one component from ui-components
    src/lib/ui-components   Card, Cards, Units, Composite, Note, Lab
    src/lib/ui-navigators   TutorsShell, SecondaryNavigator (breadcrumbs)
    src/lib/ui-primitives   Icon, Markdown (the one {@html}), lo-colours
    src/lib/runes           currentCourse, currentLo: shared $state
    src/lib/course          course-service (the one fetch, and the policy's answer), lo-tree (guards every route), live-lab: plain TypeScript
    csp.ts                  the reader's Content Security Policy, handed to SvelteKit by vite.config.ts

Each layer imports only the ones beneath it. `tests/architecture/reader-layers.test.ts` checks that, and
that only the course service fetches and only `Markdown.svelte` writes raw HTML. A route decides nothing:
the course service answers with the page, with a 404 message (R-020) or with a private-course notice
(R-032), and `found.ts` turns those into SvelteKit's `error(404, ...)` and `error(403, ...)`. So every rule a scenario proves lives in `lib/course`, where Vitest and
Stryker reach it without a browser.

| URL | Load | Component |
| --- | --- | --- |
| `/course/[courseid]` | `requestLo("course", ...)` | `structure/Composite.svelte` |
| `/topic/[courseid]/[...loid]` | `requestLo("topic", ...)` | `structure/Composite.svelte` |
| `/talk/...`, `/note/...` | `requestLo("talk" or "note", ...)` | `content/Note.svelte` |
| `/lab/[courseid]/[...loid]` | `requestLab(...)` | `content/lab/Lab.svelte` |

## Extension points

| To add | Change | The checks that guide you |
| --- | --- | --- |
| a security behaviour | `REQUIREMENTS.md` first (`pnpm test:ears:audit --next-id`), a Rule and an adversarial scenario, then the layer where the hostile value enters | the closure audit, vitest-cucumber |
| a hostile input | a row in `tests/unit/lite/xss-corpus.test.ts`, or a file in `tests/fixtures/hostile-course` | the corpus, the browser test |
| an allowed URL scheme | a person's decision: `ALLOWED` in `url.ts`, with a corpus row for its abuses | the properties, the Sanitising rule |
| a source of identity (real sign-in) | a `SessionPort` adapter in `apps/`, added to the session contract, handed to `requestLo` | the Honest Double rule |
| a rule about who may do what | `packages/rbac`, pure, with a row in `tests/unit/rbac/policy.test.ts` | the Purity rule, `Record<Role, ...>` |
| a dependency | a person's decision: `RUNG.md` and the Rung Fence together | `tests/rung-fence.test.ts`, `pnpm audit:supply-chain` |

## Next on the ladder

Rung 7 (Shipped) starts from a copy of this rung: a versioned, gated, containerised release with checked
claims, where the security checks here become release evidence.

See `RUNG.md` for what this rung adds and leaves out, `tests/TESTING.md` for the tiers, `AGENTS.md` for the
working agreement and `SECURITY.md` for how to report a problem.
