# Changelog

All notable changes to the rung 7 (Shipped) workspace are written here, newest first. The format is
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) and the versions follow
[Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

A section is drafted from Conventional Commit messages by `pnpm release:version` and curated by a person
before the release is tagged: a changelog is for the people who use a release, not a copy of the commit
log (upstream guides/Release-Strategy.md, "Changelog Discipline").

## [Unreleased]

## [1.0.0] - 2026-11-25

### Added

- **cli:** `--version` prints the release version and the git commit it was built from.
- **lite:** every site has a `version.json` with the build identity, the static twin of upstream's `GET /version`.
- **release:** release claims across the generator, the site, the reader and the security rules, each tied to its tests and requirements, checked by `pnpm release:claims` (a Closure Check).
- **release:** service level objectives for build time, site size and the reader's size, checked by `pnpm release:slo`.
- **release:** a readiness A3 with the mutation score and the supply-chain audit, written by `pnpm release:readiness`.
- **release:** the release value stream, measured step by step with its lead time, by `pnpm release:value-stream`.
- **release:** a container image that serves the fixture site as a user that is not root, and `pnpm container:smoke`.
- **ci:** a workflow template with every action pinned by commit SHA and one required job that needs the gate, the browser tier, the release checks and the container.

### Changed

- The workspace starts from rung 6 (Guarded); everything it built and guarded is unchanged.
