# Security Policy

This is rung 6 (Guarded) of the Tutors ladder, a teaching variant. It is not deployed anywhere. Its
policy is modelled on upstream's [`SECURITY.md`](https://github.com/tutors-sdk/tutors-mono-repo/blob/main/SECURITY.md),
so you can practise the habits on something small.

## Supported versions

Only the copy in this repository's default branch. Fixes are not backported to older rungs: rungs 1 to 5
do not claim to be safe against hostile course content.

## Reporting a vulnerability

Please do not open a public issue for a vulnerability in this variant. Use the repository's private
vulnerability reporting (GitHub: Security, then "Report a vulnerability") where it is enabled; otherwise
contact a maintainer privately and ask for a private channel.

A vulnerability in Tutors itself (tutors-mono-repo, tutors.dev) goes to upstream, as its `SECURITY.md`
says: email **security@tutors.dev**, not a public issue.

Include:

- what an attacker can do, and to whom (a reader, an author, the person running the build);
- the smallest course, or command, that shows it;
- the file you think is at fault, if you know;
- your severity estimate (critical, high, medium, low).

We aim to acknowledge a report within 7 days. Coordinated disclosure: please allow 90 days before
publishing, as upstream asks.

## What this variant defends against

| Threat | Defence |
| --- | --- |
| Script in course text, links, images or web links (stored XSS), in the static site | escaping, a URL scheme allow-list, and a Content Security Policy with no script |
| The same, in the reader | Svelte's escaping, the same renderer and allow-list, every route checked as `tutors.json` enters, and a Content Security Policy that runs only the reader's own files |
| A course that reads files outside its folder (`..`, absolute paths, symbolic links) | path containment in every file system adapter |
| A private course (`auth: 1`) published as an open static site | the RBAC policy; `--private` is required and marks every page; the reader shows an anonymous reader a notice, not the course |
| A dependency from a git URL, tarball or local path; a missing lockfile | `pnpm audit:supply-chain` and its test in the Single Gate |
| A known advisory in a dependency | `pnpm audit:online`, with expiring allowances in `security/audit-allowlist.json` |

## Out of scope

- The host that serves the built pages: response headers (`frame-ancestors`, HSTS) and access control
  for `--private` builds are the host's job. The reader's private-course notice is a courtesy, not a lock:
  `tutors.json` is a file on the host, and only the host can refuse to serve it.
- Denial of service by a very large course.
- Upstream Tutors, its services (Supabase, Netlify) and its dependencies: report those upstream.
