# Assertion levels in rung 6

How rung 6 (Guarded) keeps each of its security rules, from L0 to L5, what its Rung Fence allows, and what
lifting the fence would mean.

## Why security rules climb high

A security rule broken once is a vulnerability shipped. So rung 6 keeps almost every rule at L3 or above,
gives each failure a message that names the payload or path, why it is dangerous and the file to fix (L4),
and puts every exception (an allowance, a lifted fence) behind a person.

## The rules of rung 6

| Rule | Level | Where it is kept |
| --- | --- | --- |
| Course text is escaped before it reaches a page | L5 and L3 | the `html` tagged template returns `SafeHtml`; the Trusted HTML rule in `packages/lite/tests/html.test.ts` allows `new SafeHtml(...)` only in `html.ts` and `markdown.ts` |
| Every course URL passes the scheme allow-list | L4 | `packages/lite/tests/xss-corpus.test.ts`: 26 named payloads and 3,000 generated URLs; each failure names the payload, why it is dangerous and `url.ts` |
| Every page carries the strict CSP, and its style hash is current | L4 | `packages/lite/tests/csp.test.ts` prints the hash to paste; the fence refuses `unsafe-inline` and `unsafe-eval` in source |
| No path leaves the course folder | L3 Honest Double and L4 | the containment cases of `apps/cli/tests/file-system-port.contract.test.ts` run on `NodeFileSystem` and `MemoryFileSystem`; the Containment rule in `tests/architecture` requires `containedPath` in every adapter |
| A page links only inside its own folder | L3, a warning | V021 in `packages/gen/src/portable.ts`, upstream's message word for word |
| Identity imports nothing | L4 | the Identity rule in `tests/architecture/architecture.test.ts` (upstream: `identity-contracts-self-contained`) |
| RBAC is a pure policy | L4 | the Purity rule: no async, clock, top-level state, classes or value imports |
| Every role has its permissions | L5 Unrepresentable Mistake | `Record<Role, readonly Permission[]>`: a new role does not compile without its line |
| A refusal says why | L5 | `Decision` is a union whose refusal carries `reason: "sign-in-required" \| "not-enrolled"` |
| A private course is built only on purpose | L3 | `apps/cli/tests/guarded-cli.test.ts` |
| The fake identity cannot claim more than a real one | L3 Honest Double | `packages/identity/tests/session-port.contract.test.ts`, and a rule that every `SessionPort` adapter runs it |
| Lockfile present, registry sources only, allowances in date | L4 | `tests/supply-chain.test.ts` and `pnpm audit:supply-chain` |
| No advisory without an allowance | L3, online only | `pnpm audit:online`; not in the Single Gate, because it needs the registry |
| Allow-list, never block-list; fail closed | L2 | "Security habits" in `AGENTS.md`; L1 in `safeUrl` and `accessOf` |
| How to report a vulnerability | L2 | `SECURITY.md` |
| A new allowance, a weaker test, a changed CSP | Human Boundary | "Ask a human first" in `AGENTS.md` |
| One command says the work is done | Single Gate | `pnpm test` |

## Why some rules stop at L2 or L3

- **Allow-list over block-list** is a habit, not a property one test can check for every future function. The
  corpus checks the one function that matters (L4); the habit stays in the manifest (L2).
- **The online audit** depends on the registry and on advisories published tomorrow. A Single Gate that
  turns red when the network does is a gate people learn to ignore, so it runs on demand, as upstream's
  `dependency-audit` job runs in CI.
- **V021** is a warning upstream, because an author may mean it. Rung 6 keeps upstream's severity.

## The Rung Fence

Rung 6 starts from a copy of rung 3 (Layers). Its fence, `tests/rung-fence.test.ts`, lifts rung 3's in
exactly three places:

- two packages, `@ladder/identity` and `@ladder/rbac`, and no others;
- one script, `scripts/supply-chain.ts`, may start one process, to run `pnpm audit`;
- the fence now also refuses `unsafe-inline` and `unsafe-eval` anywhere in source.

It still allows **no runtime dependency**. DOMPurify, `sanitize-html`, `jsdom`, Better Auth, `@supabase/*`
and JWT libraries fail with a message naming the Summit, and saying why this rung does without them: it
renders no raw HTML, so it sanitises URLs instead of a DOM, and it verifies no sessions, so identity is a
port with no provider.

## What lifting the fence means

Lifting it to allow DOMPurify would mean rendering raw HTML from courses, which needs a DOM (jsdom on the
server, `isomorphic-dompurify` upstream) and a much larger corpus. Lifting it to allow Better Auth would
mean a server, sessions, cookies and CSRF protection, which upstream checks in `tests/security/security.test.ts`.
Both are the Summit's. Lift the fence yourself, in its own commit, when you are ready for them.
