# Threats and defence in depth

How to think about the security of a course platform, and how rung 6 turns that thinking into sentences,
scenarios and walls. Worked from `tutors/variants/rung-6-guarded` (paths without a prefix are relative to
it) and tutors-mono-repo at `2b96b69`. Read it after the two talks and before the lab.

## Where we are on the ladder

This is the only week of rung 6 (Guarded). Rung 6 is a copy of rung 5 with nothing taken away: the
workspace, the reader, the requirements R-001 to R-021 and every test still hold. It adds fifteen
requirements, R-022 to R-036, two small packages (`packages/identity`, `packages/rbac`), one script
(`scripts/supply-chain.ts`) and **no dependency**. Every defence is written with the language and Node's
built-ins, so each can be read in one sitting. Rung 7 (Shipped) releases what this rung made safe.

## A threat model in four questions

A threat model is a short, honest answer to four questions: what are we building, what can go wrong, what
are we going to do about it, and did we do a good enough job? For Tutors the first answer is a pipeline:

```
course folder ──gen──► tutors.json ──lite / reader──► HTML in a browser
   (author)         (CI or laptop)                    (reader's session)

npm registry ──pnpm install──► node_modules ──build──► release
```

Each arrow is a **trust boundary**: something we do not control goes in on the left, and something we
answer for comes out on the right. To find what can go wrong, name the **assets** (readers' browsers and
sessions, the files on the machine that runs the generator, private course content, the release) and the
**actors**, and ask what each actor could push across each arrow.

The actor students forget is the **course author**. Rungs 1 to 5 treated a course as ours. But a course is
forked, copied from a colleague, or written by a student for a project, and then built by a lecturer's
laptop and opened by a whole class. The author is trusted to write content. The author is not trusted to
run script in a reader's browser or to make the generator read `~/.ssh/config`.

That gives rung 6 its four threats, one per boundary:

| Threat | Boundary it crosses | Requirements |
| --- | --- | --- |
| Hostile course content (stored XSS) | course text into a page | R-022, R-023, R-033, R-034 |
| A course that reads outside its folder | a path into the file system | R-024, R-025, R-027 |
| A private course read by the wrong reader | course settings into a decision | R-026, R-028 to R-032 |
| A dependency we did not mean to install | the registry into the build | R-035, R-036 |

Upstream writes its answers down in two places. `SECURITY.md` is the policy: report privately to
security@tutors.dev, with an acknowledgement within 48 hours and a 90-day disclosure window, and a list of
measures. `docs/security/scorecard-baseline.md` is the posture: an OpenSSF Scorecard run with an aggregate
of 6.4 out of 10, Branch-Protection at 0 and Code-Review at 3, and the remediations in order. The fourth
question, "did we do a good enough job?", is answered by evidence like that, not by confidence.

## From a threat to a sentence

Rung 4 taught that behaviour starts as a sentence. A security rule is nearly always the EARS pattern for
**unwanted behaviour**:

> If *what an attacker supplies*, then the *system* shall *what happens instead*.

Eleven of rung 6's fifteen new rows in `REQUIREMENTS.md` have this shape. Here is the first:

> **R-022** If a link, an image or a web link in a course has an address whose scheme is not http, https
> or, for a link, mailto, then the site shall show its text without the address.

Read it with week 6's eyes. The trigger is something the *adversary* controls. The response is observable
on a page. And the sentence is an **allow-list**: it names what is permitted and refuses the rest. The
tempting sentence, "If an address starts with javascript:, then ...", is a block-list, and it would pass
its own scenario while `vbscript:`, `data:` and `JaVaScRiPt:` walked through.

The Rule in `tests/bdd/features/site/safe-content.feature` repeats the sentence, and its Givens are attacks:

```gherkin
  @R-022 @ears-unwanted
  Rule: If a link, an image or a web link in a course has an address whose scheme is not http, https or, for a link, mailto, then the site shall show its text without the address.

    Scenario: A javascript link keeps its text and loses its address
      Given a note whose Markdown is "[the reading list](javascript:alert)"
      When the site is built
      Then the note's page holds '<span class="blocked" title="unsafe address removed">the reading list</span>'
      And no page holds "javascript:"
```

Notice the last scenario of that Rule too, "The addresses a course needs keep working". A security
requirement that broke `mailto:` and relative links would be met by deleting every link. Always specify
what must survive the defence.

## Escaping is not sanitising

Rung 2 made escaping true by construction: the `html` template in `packages/lite/src/html.ts` returns
`SafeHtml`, and every interpolated string is escaped. That stops text becoming markup. `<script>` becomes
`&lt;script&gt;`, and it stays text.

Now take `javascript:alert(document.domain)`. No character in it needs escaping, so escaping leaves it
alone, and as an `href` it runs when a reader clicks. **Escaping** changes how a value is written.
**Sanitising** decides whether a value is allowed at all. Rung 5's renderer admitted the gap in a comment:
"sanitising links such as `javascript:` is rung 6 (Guarded)".

Rung 6's sanitiser is one short function, `packages/lite/src/url.ts`:

```ts
export function safeUrl(url: string, use: UrlUse): string | null {
  const read = url.replace(/[\u0000- \u007f-\u009f]/g, "").toLowerCase();
  const scheme = read.match(/^([a-z][a-z0-9+.-]*):/)?.[1];
  if (scheme !== undefined) return ALLOWED[use].has(scheme) ? url : null;
  const colon = read.indexOf(":");
  const pathStart = read.search(/[/?#]/);
  if (colon !== -1 && (pathStart === -1 || colon < pathStart)) return null;
  return url;
}
```

Three decisions are worth copying. It reads the address **the way a browser does**: browsers ignore case
in a scheme, delete tabs and newlines inside it, and strip leading control characters, so the first line
does the same before looking. It **refuses when unsure**: a colon that comes before any `/`, `?` or `#`
and does not make an allowed scheme is refused, whatever it is. And it returns the address **unchanged or
not at all**; a sanitiser that rewrites its input creates new strings nobody tested.

Upstream needs a heavier tool. Its Markdown and Marp renderers pass raw HTML through, so it runs DOMPurify
over the result (`packages/svelte/ui-primitives/src/utils/sanitize.ts`). Rung 6's renderer never emits raw
HTML, so an allow-list for addresses is enough, and the Rung Fence keeps `dompurify` for the Summit.

### Proving a sanitiser

One scenario cannot prove a sanitiser, so rung 6 uses three more tiers from rung 4.

- **A corpus.** `tests/unit/lite/xss-corpus.test.ts` holds 15 hostile addresses and 11 hostile texts, each
  with the reason it is dangerous, pushed through every Markdown construct and every field of every kind of
  learning object. A corpus is institutional memory: every attack somebody thought of, kept.
- **A property.** `tests/fuzz/safe-url.fuzz.test.ts` has fast-check build addresses the way an attacker
  does: a scheme in random case, junk between its letters, a colon in one of its disguises. Its negative
  fixture is a block-list, `(/^(javascript|vbscript|data):/.test(url) ? null : url)`, which the property
  must catch. A property that cannot fail proves nothing (week 7).
- **An independent oracle.** `tests/support/xss-oracle.ts` asks Node's WHATWG `new URL(...)` what scheme an
  `href` really opens with. Its header says why: "An oracle that shared code with safeUrl would agree with
  its mistakes."

And the failure teaches. Remove the `safeUrl` call from `markdown.ts` and the gate prints the payload, the
reason, what reached the page, and the file to fix:

```
XSS corpus: "JaVaScRiPt:alert(1)" (schemes are case-insensitive) reached the page as href="JaVaScRiPt:alert(1" opens as javascript:.
```

## The last wall: Content Security Policy

Defence in depth means each wall assumes the one before it can fail. Suppose a future change lets a script
through both escaping and sanitising. A Content Security Policy (CSP) asks the *browser* to refuse it.
Every static page carries this, first thing after its charset (R-023, `packages/lite/src/html.ts`):

```
default-src 'none'; img-src 'self' https:; style-src 'sha256-uFXDLpKCWUzpfGMl1+wqTfnwqAJAOXhmjbj/FXjCahQ='; base-uri 'none'; form-action 'none'
```

`default-src 'none'` with no `script-src` means no script runs at all. The one inline style is named by its
SHA-256 hash; `tests/unit/lite/csp.test.ts` recomputes it and, if `STYLE` changes, prints the new hash to
paste and warns against `'unsafe-inline'`, which the Rung Fence refuses anywhere in source.

The reader is harder, because the reader *is* a script. `apps/reader/csp.ts` (R-034) allows scripts and
styles from its own origin only, lets SvelteKit hash its inline start-up script (`csp: { mode: "hash" }`),
and allows one `style` attribute, SvelteKit's route announcer, by one hash that the R-034 scenario
recomputes from SvelteKit's own source. A framework that writes inline code is why real policies are hard.

Upstream shows how hard. `SECURITY.md` says deployed apps "enforce security headers including
Content-Security-Policy". `tests/security/header-contract.json` requires the header, calling it "the main
defence if course markdown ever renders unsafe HTML". And `tests/security/known-response-gaps.txt` records
the truth: "No app sends a Content-Security-Policy", because a policy needs an inventory of everything the
reader loads. **A claim is not a check.** The prose (L2) drifted; the test (L3) did not.

## Containment at the port

The generator runs with your permissions. A `course.md` that is a symbolic link to a private file, or a
path with `..` in it, asks it to read outside the course (R-024). The defence lives where a path meets real
files: the adapter. `containedPath` in `packages/gen/src/file-system-port.ts` refuses `..`, absolute
paths, `~` and NUL bytes; `NodeFileSystem` (`apps/cli/src/node-file-system.ts`) then resolves the real path
and refuses one that lands outside the root. The command writes nothing and exits 1 (R-027).

Two things keep this true. The Containment rule in `tests/architecture` requires every class that
`implements FileSystemPort` to call `containedPath`, so a third adapter cannot forget. And the port's
contract runs the same cases on the real adapter and on the in-memory double, which gained links for this
purpose:

```ts
for (const path of ["..", "../outside/secret.txt", "topic-1/../../outside", "/etc/passwd", "/topic-1", "C:/Windows/win.ini", "~/.ssh/config"]) {
  await assert.rejects(fs.readText(path), refused, `readText(${path})`);
```

That is the Honest Double of week 5 doing security work: if the double were laxer than the disk, gen's fast
tests would lie about containment. It had a price. Rung 5's contract said a leading `/` names the course
root; under containment `/etc/passwd` is absolute, so `/topic-1` is refused too. The contract was changed
on purpose, by a person, and its header says so.

## Who may read: identity and a pure policy

**Authentication** answers "who is this?". **Authorisation** answers "what may they do?". Upstream keeps
them apart: `packages/jsr/identity/src/index.ts` is twenty lines (`Actor`, `SessionPort`, `IdentityClient`)
and a dependency-cruiser rule, `identity-contracts-self-contained`, forbids it to import anything. Rung 6's
`packages/identity` keeps `Actor` and `SessionPort` with two adapters: `AnonymousSession`, and a
`FakeSession` for tests that refuses an actor no real provider could verify.

`packages/rbac` is the policy, and it is **pure**: no I/O, no clock, no state. `canView(actor, access)`
returns a decision from its arguments alone, so `tests/unit/rbac/policy.test.ts` can be a table of every
role against every kind of course, and the table is the whole truth. The policy **fails closed** (R-030):
`accessOf` reads any `auth` value that is not a whole number as 1, so `auth: yes` makes a course private.
A typo should cost a sign-in, not leak a course.

Be honest about what this buys. The command refuses to build a private course without `--private` (R-028),
and the reader answers an anonymous reader with a 403 notice (R-032). But a static site has no sign-in, and
the files are still on the host. The notice is a **courtesy, not a lock**. Upstream learned the same lesson
one layer down: `supabase/migrations/20260924_enable_rls_public_tables.sql` records fourteen tables with
Row-Level Security off, "so the anon key every browser holds could read, change, delete and truncate
them". A check in the app is only as strong as the layer beneath it.

## What we install

`scripts/supply-chain.ts` runs offline in the Single Gate: a lockfile exists, every dependency comes from
the registry by version with an integrity hash (R-035), and every allowance in
`security/audit-allowlist.json` has a reason and an expiry that has not passed (R-036). `pnpm audit:online`
asks the registry for advisories, on demand; it is not in the gate, because a gate that turns red when the
network does is a gate people learn to ignore. Upstream mirrors: `scripts/checks/dependency-audit.ts`,
`tests/security/audit-allowlist.json`, and the CodeQL, zizmor and Scorecard workflows.

## Lean: defects that escape, and poka-yoke

Lean counts defects as waste, and the worst defect is the one that **escapes**: it passes every station
and reaches the customer. A defect caught by the gate costs minutes. A stored XSS that reaches a class
costs every reader's trust, and nobody can cap the bill.

Lean's tool against escapes is **poka-yoke**, mistake-proofing: shape the work so the mistake cannot be
made, or is caught at the moment it is made. On the Assertion Ladder that is **L5, Prevented**. Rung 6 has
four:

| Poka-yoke | The mistake it removes |
| --- | --- |
| `buildSite(course, { access })` with `access` required | building a private course as if public; `tsc` says `Expected 2 arguments, but got 1` |
| `html` returning `SafeHtml`, constructed in two files only | forgetting to escape |
| `Record<Role, readonly Permission[]>` and `Record<Refusal, string>` | a role without permissions, a refusal without words |
| the CSP, enforced by the browser | a script that slipped past every test |

Not everything can be mistake-proofed. A type cannot know that a string came from a course, so "every
course address passes `safeUrl`" stays at L3/L4: the corpus, and two architecture rules (Sanitising, Route)
that name the function to call. Choosing the level is a judgement about cost: what does an escape cost, and
what does the guard cost every day?

### Five Whys on an XSS escape

In the lab a `javascript:` link runs in a rung 5 page. Ask why, five times:

1. Why did script run? The page held the author's address as an `href`.
2. Why was it there? `renderInline` wrote it there after escaping it.
3. Why was escaping not enough? Escaping changes no character of `javascript:alert(1)`.
4. Why did nobody notice? The only rule was R-008, "the site shall escape ...", and its scenarios passed.
5. Why was there no rule about addresses? Nobody had named the course author as an adversary.

The root cause is a missing requirement, which came from a missing threat model. So the countermeasure is
not one line in `markdown.ts`. It is R-022, a corpus that remembers, a property that hunts, and a CSP
behind them in case all three are wrong.

## Which levels guard this week's rules

| Rule | Level | Where it is kept |
| --- | --- | --- |
| Course text is escaped | L5 and L3 | `SafeHtml`; the Trusted HTML rule; the corpus, text half |
| Every course address passes the allow-list | L3, L4 Teaching Failure | the corpus, the property, the Sanitising and Route rules |
| Whoever builds a site says who it is for | L5 Unrepresentable Mistake | `access` is a required argument |
| Every page carries the policy, and its hashes are current | L3, L4 | `csp.test.ts`, the R-034 scenario |
| Whatever slips past still does not run | L5, by the browser | the two policies; `tests/e2e/guarded.e2e.ts` |
| No path leaves the course | L3 Honest Double, L4 | the port contract on both adapters; the Containment rule |
| A page uses files only inside its folder | L3, a warning | V021, upstream's message word for word |
| identity imports nothing; the policy is pure | L3, L4 | the Identity and Purity rules |
| Registry sources, a lockfile, allowances in date | L3, L4 | `pnpm audit:supply-chain`, in the gate |
| No advisory without an allowance | L3, online only | `pnpm audit:online` |
| Allow-list, never block-list; fail closed | L2 Told, L1 Shown | "Security habits" in `AGENTS.md`; `safeUrl`, `accessOf` |
| A new allowance, a weaker policy, a deleted corpus row | a person | "Ask a human first" in `AGENTS.md` |

No security rule here is left at L0, Implied. The Rung Fence allows exactly what the rung adds: the two
packages, one script that may start one process (`pnpm audit`), and it now refuses `unsafe-inline` and
`unsafe-eval`. `dompurify`, `better-auth` and `@supabase/*` fail with a message naming the Summit.

## Self-check

1. **(Remember)** Name the four threats of rung 6 and the trust boundary each one crosses.
2. **(Understand)** Why does escaping stop `<script>alert(1)</script>` but not `javascript:alert(1)`?
3. **(Understand)** Why is the reader's private-course notice called a courtesy and not a lock?
4. **(Apply)** Write an unwanted-behaviour requirement for this threat: a web link whose `weburl` file
   holds `file:///etc/passwd`. Which existing requirement already covers it?
5. **(Analyse)** `safeUrl` removes control characters before it looks for a scheme, but returns the
   original string. Explain both halves of that decision.
6. **(Analyse)** The oracle for the XSS property is Node's `new URL(...)`. What would be lost if it called
   `safeUrl` to decide what is safe?
7. **(Analyse)** Upstream's `SECURITY.md` and `tests/security/known-response-gaps.txt` disagree about CSP.
   Place each on the Assertion Ladder and say which you believe, and why.
8. **(Evaluate)** `pnpm audit:online` is not in the Single Gate. Judge that decision. What evidence would
   change your mind?
9. **(Evaluate)** A colleague proposes replacing the allow-list with "block `javascript:`, `vbscript:` and
   `data:`", because it is easier to explain. Which test fails, and what do you say to them?
10. **(Create)** Propose one more poka-yoke for rung 6: a mistake that a type, a required argument or the
    browser could make impossible. Say what it would cost.
