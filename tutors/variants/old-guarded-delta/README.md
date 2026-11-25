# Rung 6: Guarded

The rung 3 tools, a course folder in and a static website out, made safe to point at a course you did
not write. Hostile links are neutralised, every page carries a strict Content Security Policy, the
generator never reads outside the course folder, a private course is built only on purpose, and the
supply chain is checked.

## Run it in three commands

    pnpm install                   # TypeScript and Node's types, still the only (dev) dependencies
    pnpm test                      # the Single Gate: tsc, every suite, the XSS corpus, the fence
    pnpm start tests/fixtures/hostile-course out

The last command builds a course written to attack its site. Open `out/topic-01-attack/index.html` and
try the links. Then build the same course with rung 3 (`../rung-3-layers`) and try them again.

More commands:

    pnpm start <course> <out> --private   # build a course whose properties.yaml says auth: 1
    pnpm audit:supply-chain               # offline: lockfile, registry sources, allowances
    pnpm audit:online                     # also runs pnpm audit against the registry
    pnpm test:assignment                  # the grading test for Assignment 07

## Defences, outside in

| Threat | Defence | Where | Checked by |
| --- | --- | --- | --- |
| Course text becomes markup (`<script>`) | Escaping by default (`html` template) | `packages/lite/src/html.ts` | `packages/lite/tests/xss-corpus.test.ts` |
| A link or image runs script (`javascript:`, `data:`) | Sanitising: URL scheme allow-list | `packages/lite/src/url.ts` | the XSS corpus, table-driven and property-based |
| Something slips past both | Content Security Policy: no script at all | `packages/lite/src/html.ts` (`CSP`) | `packages/lite/tests/csp.test.ts` |
| The build reads `../../.ssh/id_ed25519` or follows a link out | Path containment in every adapter | `containedPath` in `packages/gen`, `NodeFileSystem` | the port contract, both adapters |
| A page links to files outside its folder | Warning V021, as upstream | `packages/gen/src/portable.ts` | `packages/gen/tests/guarded.test.ts` |
| A private course is published openly | RBAC policy; `--private` flag; pages marked | `packages/rbac`, `apps/cli/src/run.ts` | `packages/rbac/tests/policy.test.ts`, `apps/cli/tests/guarded-cli.test.ts` |
| A dependency from a git URL or tarball | Registry sources only, lockfile required | `scripts/supply-chain.ts` | `tests/supply-chain.test.ts` |

## Architecture

    apps/cli ──► @ladder/gen ──────────► @ladder/model
        │                                   ▲  ▲
        ├──────► @ladder/lite ──────────────┘  │
        ├──────► @ladder/rbac ─────────────────┘
        │              │ (types only)
        └──────► @ladder/identity ◄────┘

| Package | Folder | Job | May import |
| --- | --- | --- | --- |
| `@ladder/model` | `packages/model` | The learning-object types, now with `properties` and `enrollment`. | nothing |
| `@ladder/identity` | `packages/identity` | `Actor` and `SessionPort`: who is reading, verified. `AnonymousSession`, `FakeSession`. | nothing |
| `@ladder/rbac` | `packages/rbac` | A pure policy: roles, permissions, `accessOf`, `canView`. | types of `model` and `identity` |
| `@ladder/gen` | `packages/gen` | Course folder to `Course`, through a contained `FileSystemPort`. | `@ladder/model` |
| `@ladder/lite` | `packages/lite` | `Course` to pages, sanitised and under a CSP. | `@ladder/model` |
| `@ladder/cli` | `apps/cli` | The composition root: adapters, the policy decision, the files. | all of the above |

Rung 3's rules still hold. Rung 6 adds four, in `tests/architecture/architecture.test.ts`: identity imports
nothing outside itself, rbac is pure, every file system adapter calls `containedPath`, and every session
adapter runs the session contract.

See `RUNG.md` for what this rung adds and leaves out, `AGENTS.md` for the working agreement, and
`SECURITY.md` for how to report a problem.
