# AGENTS.md

Rung 6 (Guarded) of the Tutors ladder: rung 5's specified workspace and reader, made safe against hostile
course content, with private courses and a checked supply chain. The working agreement for every
contributor, human or AI. What a test can check lives in the tests.

## Verify

    pnpm test                  # tsc, svelte-check, every Vitest tier, the build
    pnpm test:e2e              # the hostile and private courses in Chromium
    pnpm audit:supply-chain    # lockfile, registry sources, allowances

`pnpm test` is the Single Gate. Run `pnpm test:mutation` then `pnpm check:mutation-floors` when you change
`packages/` or `lib/course`. If a security test, a rule or the fence fails, change the code.

## Behaviour starts as a sentence

1. `pnpm test:ears:audit --next-id`; add the EARS sentence to `REQUIREMENTS.md`. A security rule is
   usually "If <what an attacker supplies>, then the <system> shall <what happens instead>."
2. Copy it as a `Rule:` tagged `@R-NNN @ears-<pattern>` in `tests/bdd/features/`, with an adversarial
   scenario. See it fail.
3. Implement it where the hostile value enters. Add a unit row so Stryker sees it.

## Where things go

| You are adding | It belongs in |
| --- | --- |
| a URL from a course on a page | through `safeUrl` (`packages/lite/src/url.ts`) |
| HTML | the `html` template or `{text}`; never `new SafeHtml(...)` or `{@html}` on course text |
| a route from `tutors.json` in the reader | `decorateCourseTree`, which guards it |
| a source of files | a `FileSystemPort` adapter that calls `containedPath`, in the contract |
| a source of identity | a `SessionPort` adapter in `apps/`, in the session contract |
| who may do what | `packages/rbac`, pure, with a row in its table test |
| a hostile input you thought of | a row in `tests/unit/lite/xss-corpus.test.ts` |

## Security habits

- Allow-list, never block-list. When unsure, refuse.
- Fail closed: an unreadable setting makes a course private.
- A failing security test is a finding. Never weaken it.

## Rung Fence

`tests/rung-fence.test.ts` fails, naming the file and the rung that introduces the capability, if:

- a `package.json` declares a dependency outside `RUNG.md`'s table (rung 6 adds none);
- source imports a test tool, or anything but `@ladder/*`, `svelte`, `@sveltejs/kit`, `$app/*` (reader)
  or `node:` (the rest);
- the tools fetch, start a process (except `scripts/supply-chain.ts`) or write client script; anything
  uses browser storage, adds server code, or weakens a CSP with `unsafe-inline` or `unsafe-eval`;
- a package other than model, identity, rbac, gen, lite, cli and reader appears.

`dompurify`, `better-auth` and `@supabase/*` arrive at the Summit. Say so, and stop.

## Ask a human first

- Adding or upgrading a dependency; changing the fence; an entry in `security/audit-allowlist.json`.
- Changing `CSP`, `apps/reader/csp.ts`, `safeUrl`'s schemes, `containedPath` or the policy's answers.
- Changing or retiring a requirement; deleting or weakening a security test or a corpus row.
- Changing `tests/architecture/`, `tests/suite-health/`, `scripts/checks/`, a floor other than raising
  it, a golden file, a `tsconfig.json`, a port, `../fixtures/`, this file or `SECURITY.md`.
