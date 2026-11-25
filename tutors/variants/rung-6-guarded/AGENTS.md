# AGENTS.md

Rung 6 (Guarded) of the Tutors ladder: a course folder in, a static website out, safe against hostile
course content, with private courses and a checked supply chain. TypeScript on Node 22.18 or later, run
directly with type stripping. This file is the working agreement for every contributor, human or AI.
Anything a test can check lives in the tests, not here.

## Verify

    pnpm test

The Single Gate: `tsc` for every package, then every `node --test` suite, including the XSS corpus, the
CSP test, the port contract and the offline supply-chain check. Work is finished when it passes. If a
security test, an architecture rule or the Rung Fence fails, change the code, not the test.

Only erasable syntax. Relative imports carry `.ts`; types use `import type`; packages by name.

## Where things go

| You are adding | It belongs in |
| --- | --- |
| a URL from a course on a page | through `safeUrl` in `packages/lite/src/url.ts` |
| HTML | the `html` template; never `new SafeHtml(...)` on course text |
| a new source of files | a `FileSystemPort` adapter that calls `containedPath`, added to the contract |
| a new source of identity | a `SessionPort` adapter in `apps/`, added to the session contract |
| a rule about who may do what | `packages/rbac`, pure, with a row in its table test |
| a hostile input you thought of | a row in `packages/lite/tests/xss-corpus.test.ts` |

## Security habits

- Allow-list, never block-list. When unsure, refuse.
- Fail closed: an unreadable setting makes a course private, not public.
- A security test that fails is a finding, not noise. Report it; do not weaken the test.

## Rung Fence

This rung has no runtime dependencies. `tests/rung-fence.test.ts` fails, naming the file and the rung
that introduces the capability, if:

- any `package.json` declares a dependency other than `@ladder/*` (`workspace:*`), or the root adds a
  dev dependency other than `typescript` and `@types/node`;
- source imports anything but `node:` built-ins, relative files and `@ladder/*`;
- source uses the network, starts a process (except `scripts/supply-chain.ts` for `pnpm audit`), writes
  client-side script, or weakens the CSP with `unsafe-inline` or `unsafe-eval`;
- a package other than model, identity, rbac, gen, lite and cli appears.

A failure means the work belongs to a later rung or to the Summit. Say so, and stop.

## Ask a human first

- Adding or upgrading any dependency, or changing `tests/rung-fence.test.ts`.
- Adding an entry to `security/audit-allowlist.json`.
- Changing `CSP`, `safeUrl`'s allowed schemes, `containedPath`, or the RBAC policy's answers.
- Deleting or weakening any security test, or a row of the XSS corpus.
- Changing `tests/architecture/`, a `tsconfig.json`, a port, or the shared fixture.
- Changing this file or `SECURITY.md`.
