@security
Feature: The audit checks what the workspace installs, and from where
  As a contributor about to run pnpm install
  I want every dependency to come from the registry, pinned by a hash, with no stale excuses
  So that the code I run is the code that was reviewed

  The adversary is a dependency: one that arrives from a git URL or a tarball, where no lockfile hash and
  no advisory can see it, or an allowance for a known advisory that nobody revisits. The scenarios call the
  functions behind `pnpm audit:supply-chain` in scripts/supply-chain.ts. Upstream runs the same kind of
  check in scripts/checks/dependency-audit.ts, with allowances in tests/security/audit-allowlist.json.

  @R-035 @ears-unwanted
  Rule: If a dependency is neither a workspace package nor a registry version that the lockfile pins with an integrity hash, then the audit shall report it and exit with status 1.

    Scenario: This workspace is clean
      When the audit is run on this workspace
      Then it reports nothing

    Scenario: A dependency from a git URL
      Given a package.json that asks for "typescript" at "github:evil/typescript"
      When the audit reads it
      Then it reports "non-registry-source"

    Scenario: A workspace package and a registry range pass
      Given a package.json that asks for "@ladder/model" at "workspace:*"
      When the audit reads it
      Then it reports nothing

    Scenario: A lockfile entry resolved from a tarball
      Given a lockfile that resolves a package with "tarball: https://evil.example/leftpad.tgz"
      When the audit reads it
      Then it reports "non-registry-source"

    Scenario: A workspace with no lockfile
      Given a copy of this workspace without its pnpm-lock.yaml
      When the audit is run on the copy
      Then it reports "lockfile-missing"

  @R-036 @ears-unwanted
  Rule: If an audit allowance has no reason, no expiry date or an expiry date in the past, then the audit shall report it and exit with status 1.

    Scenario: An allowance that has expired
      Given an allowance with the reason "dev-only, not reachable" that expires "2026-11-24"
      When the audit reads it on "2026-11-25"
      Then it reports "expired-allowance"

    Scenario: An allowance with no reason
      Given an allowance with the reason "" that expires "2026-12-31"
      When the audit reads it on "2026-11-25"
      Then it reports "malformed-allowance"

    Scenario: An allowance in date, with a reason, passes on its last day
      Given an allowance with the reason "dev-only, not reachable" that expires "2026-11-25"
      When the audit reads it on "2026-11-25"
      Then it reports nothing
