# Rung Delta: 6, Guarded

## Capability

Safe content, private courses and a checked supply chain, on the rung 3 workspace. Rung 6 starts from a
copy of rung 3 (Layers), not from rungs 4 or 5, so it can be climbed straight after Layers.

- **Content safety.** Escaping (rung 2) stops course text becoming markup. Rung 6 adds sanitising: every
  link, image and web-link address passes a scheme allow-list (`safeUrl`), so `javascript:`, `data:` and
  their disguises never reach an `href` or `src`. An OWASP-style corpus and 3,000 generated URLs check it.
- **Content Security Policy.** Every page carries a strict policy in a meta tag: no script at all, one
  inline style allowed by its SHA-256 hash.
- **Path containment.** gen reads only inside the course folder. Every adapter refuses `..`, absolute
  paths and links that lead out, with the same `PathEscapeError`. Pages that link outside their own
  folder get upstream's V021 warning.
- **Identity and RBAC.** `@ladder/identity` (a verified-actor port that imports nothing) and
  `@ladder/rbac` (a pure policy). A course with `auth: 1` in `properties.yaml` is private: the CLI builds
  it only with `--private`, and marks every page.
- **Supply chain.** A lockfile is required; every dependency comes from the registry with an integrity
  hash; audit allowances need a reason and an expiry; `pnpm audit:online` runs the real audit.
  `SECURITY.md` says how to report a problem.

## Expertise needed

Everything from rungs 1 to 3, plus:

- Cross-site scripting: stored XSS, URL schemes, why escaping is not sanitising, allow-lists over block-lists.
- Content Security Policy: directives, `'none'`, hash sources, what a meta tag cannot set.
- Path traversal and symbolic links: `..`, absolute paths, `realpath`.
- Authentication versus authorisation; Role-Based Access Control; failing closed.
- Supply-chain security: lockfiles, integrity hashes, registry sources, advisories, VEX.
- Table-driven and property-based testing (with a seeded generator, since fast-check is rung 5's).

## Where this lives upstream

Pinned at tutors-mono-repo `2b96b69`.

| Here | Upstream | What is mirrored |
| --- | --- | --- |
| `packages/lite/src/url.ts` | `packages/svelte/ui-primitives/src/utils/sanitize.ts` (DOMPurify), `packages/jsr/course-rules/src/rich.ts` (`STRIPPED`, V016) | removing script-bearing URLs from author content |
| `packages/lite/src/html.ts` (`CSP`) | `tests/security/header-contract.json`, `tests/security/known-response-gaps.txt` | the CSP header upstream requires; its apps do not send one yet |
| `packages/lite/tests/xss-corpus.test.ts` | `tests/security/security.test.ts` (negative fixtures) | security contracts as tests with hostile inputs |
| `packages/gen/src/file-system-port.ts` (`containedPath`) | `packages/jsr/course-rules/src/ports.ts`, `resolveSource` in `warnings.ts` | paths relative to the course root, never above it |
| `packages/gen/src/portable.ts` | `checkPortable`, `linkSources`, `imageSources` in `packages/jsr/course-rules/src/warnings.ts`; `messages.reachesOutside` | V021, its message word for word |
| `packages/gen/src/settings.ts` | `packages/jsr/gen/src/services/course-builder.ts` (`properties.yaml`, `enrollment.yaml`) | the course's settings in `tutors.json` |
| `packages/identity` | `packages/jsr/identity/src/index.ts` (`Actor`, `SessionPort`) | verified identity only; imports nothing |
| `packages/rbac` | `packages/svelte/utils/rbac/src/permissions.ts`, `types.ts`; `turnsAway` in `packages/svelte/connect/src/services/connect.svelte.ts`; `loadPropertyFlags` in `packages/jsr/model/src/utils/course-utils.ts`; `guides/RBAC.md` | roles, permissions, auth levels, whitelist |
| identity and purity rules in `tests/architecture` | `identity-contracts-self-contained` in `.dependency-cruiser.cjs` | identity depends on nothing |
| `scripts/supply-chain.ts`, `security/audit-allowlist.json` | `scripts/checks/dependency-audit.ts`, `auditFindings` in `scripts/checks/security.ts`, `tests/security/audit-allowlist.json` | the audit and its expiring allowances |
| `SECURITY.md` | `SECURITY.md` | a security policy: how to report, what is in scope |
| (talks only) | `.github/workflows/codeql.yml`, `scorecard.yml`, `zizmor.yml`, `release/openvex.json`, `docs/security/scorecard-baseline.md`, `supabase/migrations/20260924_enable_rls_public_tables.sql` | the CI and data-layer defences this rung describes but does not run |

## Deliberately left out

- A DOM sanitiser (DOMPurify). Upstream needs one because its Markdown renderer passes raw HTML through. This
  renderer never emits raw HTML, so an allow-list for URLs is enough; raw HTML stays escaped text.
- Response headers (`frame-ancestors`, `X-Frame-Options`, HSTS). A meta tag cannot set them; they belong
  to the host (upstream `tests/security/header-contract.json` checks a built container).
- A real identity provider (Better Auth upstream), sessions, cookies, CSRF. A static site has no sign-in, so
  the CLI asks the policy about an anonymous reader. `IdentityClient` (sign in and out) is left out too.
- Content locks (`isLoRouteLocked`). They are Assignment 07.
- CodeQL, OpenSSF Scorecard, zizmor and OpenVEX. They run in CI on a repository, which this rung does not
  have; rung 7 (Shipped) brings workflows.
- YAML beyond the subset Tutors courses use (no nested maps, no anchors).

## Assertion Ladder

| Rule | Rung | Where |
| --- | --- | --- |
| Course text is escaped | L5 and L3 | `html` template; Trusted HTML rule; XSS corpus |
| Course URLs pass the allow-list | L3/L4 Teaching Failure | XSS corpus, table and property; failure names the payload, why it is dangerous and the file to fix |
| Every page carries the strict CSP, and its hash is current | L3/L4 | `csp.test.ts` prints the hash to paste |
| No path leaves the course | L3 Honest Double, L3/L4 | port contract on both adapters; Containment rule |
| A page links only inside its folder | L3, a warning | V021 in gen |
| identity imports nothing; rbac is pure | L3/L4 | Identity and Purity rules |
| Every role has its permissions | L5 Unrepresentable Mistake | `Record<Role, readonly Permission[]>` |
| A private course needs `--private` | L3 | `guarded-cli.test.ts` |
| Registry sources, lockfile, allowances in date | L3/L4 | `tests/supply-chain.test.ts`, `pnpm audit:supply-chain` |
| No advisory without an allowance | L3, online only | `pnpm audit:online` |
| A new allowance or lifted fence needs a person | Human Boundary | `AGENTS.md` |
