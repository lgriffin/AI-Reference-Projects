# Rung Delta: 6, Guarded

## Capability

Rung 5's workspace, made safe to point at a course you did not write, in the site and in the reader, and
specified first: fifteen new requirements, `R-022` to `R-036`.

- **Content safety (R-022).** Escaping (rung 2) stops course text becoming markup. Rung 6 adds sanitising:
  every link, image and web-link address passes a scheme allow-list (`safeUrl`), so `javascript:`, `data:`
  and their disguises never reach an `href` or `src`. The reader renders Markdown through the same function,
  and checks every route as `tutors.json` enters it (R-033).
- **Content Security Policy (R-023, R-034).** Every static page carries a policy with no script at all and one
  style, by hash. The built reader carries one that runs only its own files and the start-up script
  SvelteKit hashes.
- **Path containment (R-024, R-025, R-027).** gen reads only inside the course folder. Every adapter refuses
  `..`, absolute paths and links that lead out, with the same `PathEscapeError`, and the command writes
  nothing. Pages that link outside their own folder get upstream's V021 warning.
- **Identity and RBAC (R-026, R-028 to R-032).** `@ladder/identity` (a verified-actor port that imports
  nothing) and `@ladder/rbac` (a pure policy). A course with `auth: 1` in `properties.yaml` is private: the
  command builds it only with `--private` and marks every page; the reader shows an anonymous reader a
  notice, not the course.
- **Supply chain (R-035, R-036).** A lockfile is required; every dependency comes from the registry with an
  integrity hash; audit allowances need a reason and an expiry; `pnpm audit:online` runs the real audit.
  `SECURITY.md` says how to report a problem.

## Expertise needed

Everything from rungs 1 to 5, plus:

- Threat modelling: assets, adversaries, trust boundaries, and which boundary each defence stands on.
- Cross-site scripting: stored XSS, URL schemes, why escaping is not sanitising, allow-lists over block-lists.
- Content Security Policy: directives, `'none'`, hash sources, what a meta tag cannot set, CSP in a
  framework that writes an inline script.
- Path traversal and symbolic links: `..`, absolute paths, `realpath`.
- Authentication versus authorisation; Role-Based Access Control; failing closed; why a client-side check
  is a courtesy and not a lock.
- Supply-chain security: lockfiles, integrity hashes, registry sources, advisories, VEX.
- Security requirements in EARS (mostly "If ..., then ... shall ..."), adversarial scenarios, a corpus,
  and a property with an independent oracle.

## Dependencies

Rung 6 adds **no dependency**. Every defence is written with the language and Node's built-ins, so each can
be read in one sitting. The Rung Fence (`tests/rung-fence.test.ts`) allows exactly rung 5's list, and checks
that this table agrees with it.

| Package | Version | Where, and why |
| --- | --- | --- |
| `svelte` | `5.57.2` | `apps/reader` dev: the component compiler and runes. Upstream's reader pins the same. |
| `@sveltejs/kit` | `3.1.1` | `apps/reader` dev: routing, load functions, the build. Upstream pins the same. |
| `@sveltejs/vite-plugin-svelte` | `7.3.0` | `apps/reader` dev: compiles `.svelte` files inside Vite (a peer of kit). |
| `@sveltejs/adapter-static` | `4.0.1` | `apps/reader` dev: writes the build as plain files with a `200.html` fallback. |
| `vite` | `8.3.5` | `apps/reader` dev: dev server and bundler. Upstream's lockfile resolves the same. |
| `svelte-check` | `4.7.6` | `apps/reader` dev: type-checks `.svelte` files in the gate. |
| `playwright` | `1.63.0` | root dev, from rung 5: drives Chromium for `pnpm test:e2e`. The library, not upstream's `@playwright/test` runner. |
| `typescript` | `^6.0.3` | root dev, from rung 3. |
| `@types/node` | `^22.20.7` | root dev, from rung 3. |
| `vitest` | `^5.1.2` | root dev, from rung 4: the runner for every tier, the browser tier included. |
| `@amiceli/vitest-cucumber` | `^8.0.1` | root dev, from rung 4: Gherkin features bound to Vitest. |
| `fast-check` | `^4.11.0` | root dev, from rung 4: property-based tests. |
| `@stryker-mutator/core` | `^10.1.1` | root dev, from rung 4: mutation testing. |
| `@stryker-mutator/vitest-runner` | `^10.1.1` | root dev, from rung 4: Stryker's Vitest runner. |

All are build-time or test-time tools. The built reader ships Svelte's small runtime and the code in
`apps/reader/src`, `@ladder/lite`, `@ladder/rbac`, `@ladder/identity` and nothing else. `dompurify`, `better-auth`
and `@supabase/*` arrive at the Summit, and the fence says so when one is added.

## Specifying the guard

The old Guarded rung (built on rung 3, before testing moved to rung 4) was ported onto rung 5 in this order:

1. Fifteen sentences in `REQUIREMENTS.md`. Two systems joined the EARS audit: `the policy`
   (`packages/rbac`) and `the audit` (`scripts/supply-chain.ts`). Eleven of the fifteen are *unwanted
   behaviour* requirements: a security rule names what an attacker supplies and what the system does instead.
2. A `Rule:` per sentence, in five features tagged `@security`, whose Givens are adversaries: a hostile
   note, a path with `..`, a symbolic link, a private course, a dependency from a git URL.
3. The code, ported from the old rung; the reader's part is new (`refusal` in the course service, `guarded`
   routes in `lo-tree.ts`, `apps/reader/csp.ts`).
4. The rung 4 tiers on the new code: the XSS corpus and the policy table as unit tests, the hand-rolled
   generator replaced by fast-check properties (`tests/fuzz/safe-url.fuzz.test.ts`, with a block-list as the
   negative fixture), both port contracts, five architecture rules, mutation and floors, and a browser test
   that opens the hostile course and the private course in Chromium.

Two things the port found:

- **The port's contract had to change.** Rung 5's contract said a leading `/` names the course root. Under
  containment `/etc/passwd` is an absolute path, so `/topic-1` is refused too. The case was changed on
  purpose, in the contract, and its header says so.
- **A framework writes inline code.** SvelteKit's start-up script is inline, and its route announcer hides
  itself with a `style` attribute. The policy allows each by hash, never with `'unsafe-inline'`; the scenario
  for R-034 recomputes the announcer's hash from SvelteKit's own source (a Closure Check), and the browser
  test fails if the reader ever trips its own policy.

## Mutation testing

`pnpm test:mutation` now also mutates the security logic: `packages/lite/src/url.ts`,
`packages/gen/src/file-system-port.ts` (containment), `portable.ts`, `settings.ts` and `packages/rbac`.

| Run | New files | All files |
| --- | --- | --- |
| first run: the old rung's tests ported to Vitest, the corpus, the fast-check properties, the scenarios' unit twins | url 92.86, file-system-port 94.59, rbac 94.23, portable 60.58, settings 65.26 | 86.11%, below the break threshold of 90 |
| after `url.test.ts`, `portable.test.ts`, `settings.test.ts` and `memory-links.test.ts`, written row by row for the survivors | url 96.43, file-system-port 100, rbac 98.08, portable 98.08, settings 85.26 | **94.21%** |

The first run is the lesson. The corpus and the properties attack `safeUrl` well, but `portable.ts` and
`settings.ts` are mostly regular expressions, and a handful of examples lets almost any change to a regular
expression live. `settings.ts` decides whether a course is private, so its survivors were hidden defects in
security logic. Floors: `url.ts` 96, `file-system-port.ts` 100, `rbac/src/index.ts` 98, `portable.ts` 98,
`settings.ts` 85. The survivor left in `url.ts` is equivalent (`colon < pathStart` made `<=`: a colon and a
slash cannot share an index).

One floor went down, on purpose and by a person: `memory-file-system.ts`, 100 to 94. It gained link
following for the containment contract, and six mutants in it are equivalent, because a path a link lands on
passes `containedPath` again, which removes the empty and `.` segments those mutants let through. The
alternative, deleting the redundant filter, would make the double's code read less like the disk's.

## Where this lives upstream

Pinned at tutors-mono-repo `2b96b69`.

| Here | Upstream | What is mirrored |
| --- | --- | --- |
| `REQUIREMENTS.md` R-022 to R-036, features tagged `@security` | `tests/security/security.test.ts`, `tests/bdd/features` | security contracts as executable rules with hostile inputs |
| `packages/lite/src/url.ts` | `packages/svelte/ui-primitives/src/utils/sanitize.ts` (DOMPurify), `packages/jsr/course-rules/src/rich.ts` (`STRIPPED`, V016) | removing script-bearing URLs from author content |
| `packages/lite/src/html.ts` (`CSP`), `apps/reader/csp.ts` | `tests/security/header-contract.json`, `tests/security/known-response-gaps.txt` | the CSP header upstream requires; its apps do not send one yet |
| `tests/unit/lite/xss-corpus.test.ts`, `tests/fuzz/safe-url.fuzz.test.ts` | `tests/security/security.test.ts` (negative fixtures), `tests/fuzz` | hostile inputs as a table and as properties |
| `packages/gen/src/file-system-port.ts` (`containedPath`) | `packages/jsr/course-rules/src/ports.ts`, `resolveSource` in `warnings.ts` | paths relative to the course root, never above it |
| `packages/gen/src/portable.ts` | `checkPortable`, `linkSources`, `imageSources` in `packages/jsr/course-rules/src/warnings.ts`; `messages.reachesOutside` | V021, its message word for word |
| `packages/gen/src/settings.ts` | `packages/jsr/gen/src/services/course-builder.ts` (`properties.yaml`, `enrollment.yaml`) | the course's settings in `tutors.json` |
| `packages/identity` | `packages/jsr/identity/src/index.ts` (`Actor`, `SessionPort`) | verified identity only; imports nothing |
| `packages/rbac` | `packages/svelte/utils/rbac/src/permissions.ts`, `types.ts`; `turnsAway` in `packages/svelte/connect/src/services/connect.svelte.ts`; `loadPropertyFlags` in `packages/jsr/model/src/utils/course-utils.ts`; `guides/RBAC.md` | roles, permissions, auth levels, whitelist |
| `refusal` in `apps/reader/src/lib/course/course-service.ts` | `turnsAway` in `packages/svelte/connect/src/services/connect.svelte.ts` | the reader turning a reader away from a private course |
| Identity and Purity rules in `tests/architecture` | `identity-contracts-self-contained` in `.dependency-cruiser.cjs` | identity depends on nothing |
| `scripts/supply-chain.ts`, `security/audit-allowlist.json` | `scripts/checks/dependency-audit.ts`, `auditFindings` in `scripts/checks/security.ts`, `tests/security/audit-allowlist.json` | the audit and its expiring allowances |
| `SECURITY.md` | `SECURITY.md` | a security policy: how to report, what is in scope |
| (talks only) | `.github/workflows/codeql.yml`, `scorecard.yml`, `zizmor.yml`, `release/openvex.json`, `docs/security/scorecard-baseline.md`, `supabase/migrations/20260924_enable_rls_public_tables.sql` | the CI and data-layer defences this rung describes but does not run |

## Deliberately left out

- A DOM sanitiser (DOMPurify). Upstream needs one because its Markdown renderer passes raw HTML through. This
  renderer never emits raw HTML, so an allow-list for URLs is enough; raw HTML stays escaped text.
- Response headers (`frame-ancestors`, `X-Frame-Options`, HSTS). A meta tag cannot set them; they belong
  to the host (upstream `tests/security/header-contract.json` checks a built container).
- A real identity provider (Better Auth upstream), sessions, cookies, CSRF, and Supabase's row-level
  security. Nothing here signs anyone in: the command and the static reader ask the policy about an
  anonymous reader, and `FakeSession` stands in for a signed-in one in tests. `IdentityClient` (sign in and
  out) is left out too. So the reader's private notice is a courtesy, not access control: the host guards
  the files.
- Content locks (`isLoRouteLocked`) and a raw-HTML warning. They are Assignment 6 (`tests/assignment/`).
- CodeQL, OpenSSF Scorecard, zizmor and OpenVEX. They run in CI on a repository; rung 7 (Shipped) brings
  workflows.
- YAML beyond the subset Tutors courses use (no nested maps, no anchors).
- Rung 5's navigator assignment test. Each rung carries its own assignment.

## Assertion Ladder

| Rule | Rung | Where |
| --- | --- | --- |
| Every security requirement is proved, every citation is known | L3/L4 Closure Check | `pnpm test:ears:audit`, `tests/suite-health/requirements.test.ts` |
| Course text is escaped | L5 and L3 | `html` template and Svelte's `{text}`; Trusted HTML and Raw HTML rules; XSS corpus |
| Course URLs pass the allow-list | L3/L4 Teaching Failure | XSS corpus, fast-check properties, the Sanitising and Route rules; a failure names the payload, why it is dangerous and the file to fix |
| Whoever builds a site says who it is for | L5 Unrepresentable Mistake | `buildSite(course, { access })`: `access` is required, so `tsc` refuses a call without it |
| Every page carries the strict CSP, and its hashes are current | L3/L4 | `tests/unit/lite/csp.test.ts` and the R-034 scenario print the hash to paste |
| Whatever slips past still does not run | L5 Prevented, by the browser | the two policies; `tests/e2e/guarded.e2e.ts` injects a script and watches it refused |
| No path leaves the course | L3 Honest Double, L3/L4 | port contract on both adapters; Containment rule |
| A page links only inside its folder | L3, a warning | V021 in gen |
| identity imports nothing; rbac is pure | L3/L4 | Identity and Purity rules |
| Every role has its permissions; every refusal has its words | L5 Unrepresentable Mistake | `Record<Role, readonly Permission[]>`, `Record<Refusal, string>` |
| A private course needs `--private`; the reader shows a notice | L3 | scenarios for R-028, R-029, R-032; the browser test |
| Registry sources, lockfile, allowances in date | L3/L4 | `tests/unit/scripts/supply-chain.test.ts`, `pnpm audit:supply-chain` |
| No advisory without an allowance | L3, online only | `pnpm audit:online` |
| The suite notices changes to the security logic | L3 | `pnpm test:mutation`, `pnpm check:mutation-floors` |
| A new allowance, a weaker policy or a lifted fence needs a person | Human Boundary | `AGENTS.md` |
| Rules from rungs 3, 4 and 5 | as before | `tests/architecture`, `tests/suite-health`, `tests/mutation` |
