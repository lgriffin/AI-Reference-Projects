/**
 * The reader's Content Security Policy (R-034): the last wall behind Svelte's escaping, renderMarkdown and
 * safeUrl. The static pages of @ladder/lite run no script at all; the reader is a script, so its policy
 * names exactly what may run: files from its own origin, and the one inline script SvelteKit writes to
 * start the app, which SvelteKit allows by its SHA-256 hash at build time (mode "hash"). Nothing inline
 * otherwise, no eval, no plugin, no <base>, no form, and fetch only to its own origin (tutors.json).
 *
 * One allowance, by hash: SvelteKit's route announcer (the live region that tells a screen reader the new
 * page's title) hides itself with a style attribute. ANNOUNCER_STYLE_HASH is the hash of exactly that
 * attribute, so no other inline style is let in; the scenario for R-034 recomputes it from SvelteKit's
 * source and prints the new hash if an upgrade changes it. 'unsafe-hashes' is CSP's name for "a hash may
 * allow an attribute"; it is not 'unsafe-inline'.
 *
 * vite.config.ts hands this to SvelteKit, which writes it into 200.html as a meta tag, because a static
 * build has no server to send a header. A meta tag cannot set frame-ancestors; that is the host's job
 * (upstream tests/security/header-contract.json).
 */
export const ANNOUNCER_STYLE_HASH = "sha256-S8qMpvofolR8Mpjy4kQvEm7m1q8clzU4dfDH0AmvZjo=";

export const READER_CSP = {
  "default-src": ["none"],
  "script-src": ["self"],
  "style-src": ["self"],
  "style-src-attr": ["unsafe-hashes", ANNOUNCER_STYLE_HASH],
  "img-src": ["self", "https:"],
  "connect-src": ["self"],
  "base-uri": ["none"],
  "form-action": ["none"],
} as const;

type Mutable<T> = { -readonly [K in keyof T]: T[K] extends readonly (infer Source)[] ? Source[] : never };

/** The same directives as plain arrays, which is the shape SvelteKit's `csp.directives` option takes. */
export const readerCspDirectives = () => Object.fromEntries(Object.entries(READER_CSP).map(([name, sources]) => [name, [...sources]])) as Mutable<typeof READER_CSP>;
