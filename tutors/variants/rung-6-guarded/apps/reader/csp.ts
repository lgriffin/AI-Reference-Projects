/**
 * The reader's Content Security Policy (R-034): the last wall behind Svelte's escaping, renderMarkdown and
 * safeUrl. The static pages of @ladder/lite run no script at all; the reader is a script, so its policy
 * names exactly what may run: files from its own origin, and the one inline script SvelteKit writes to
 * start the app, which SvelteKit allows by its SHA-256 hash at build time (mode "hash"). Nothing inline
 * otherwise, no eval, no plugin, no <base>, no form, and fetch only to its own origin (tutors.json).
 *
 * vite.config.ts hands this to SvelteKit, which writes it into 200.html as a meta tag, because a static
 * build has no server to send a header. A meta tag cannot set frame-ancestors; that is the host's job
 * (upstream tests/security/header-contract.json).
 */
export const READER_CSP = {
  "default-src": ["none"],
  "script-src": ["self"],
  "style-src": ["self"],
  "img-src": ["self", "https:"],
  "connect-src": ["self"],
  "base-uri": ["none"],
  "form-action": ["none"],
} as const;
