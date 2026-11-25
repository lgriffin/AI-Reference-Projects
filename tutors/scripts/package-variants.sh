#!/usr/bin/env bash
# Standard Version: package each rung's completed code as a zip the course ships to students.
#
# For every variant this script
#   1. stages a clean copy (tracked files only) beside the shared fixture, in the layout of the zip;
#   2. proves the staged copy: installs from the lockfile, runs the Single Gate (which compiles and tests),
#      and runs the showcase command on the fixture course;
#   3. writes a reproducible zip into the course, as an archive learning object in the rung's final week.
# A zip is written only if its staged copy passed, so a shipped zip always builds and runs.
#
# Usage: tutors/scripts/package-variants.sh [--check] [rung-name ...]
#   --check   build the zips in a temp folder and fail if any differs from the one in the course
#   rung-name e.g. rung-3-layers; default is every variants/rung-* folder
# Needs Node 22.18+, pnpm, zip and python3 with Pillow (for the archive card).
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
check=0
if [ "${1:-}" = "--check" ]; then check=1; shift; fi

# The final week of each rung carries that rung's standard version.
week_of() {
  case "$1" in
    rung-1-seed) echo "topic-02-seed-types" ;;
    rung-2-lite) echo "topic-03-lite" ;;
    rung-3-layers) echo "topic-05-layers-ports" ;;
    rung-4-proven) echo "topic-07-proven-bdd" ;;
    rung-5-reader) echo "topic-09-reader-components" ;;
    rung-6-guarded) echo "topic-10-guarded" ;;
    rung-7-shipped) echo "topic-11-shipped" ;;
    *) echo "no week is mapped to $1; add it to week_of in $0" >&2; exit 1 ;;
  esac
}

if [ "$#" -gt 0 ]; then rungs=("$@"); else rungs=(); for d in "$here"/variants/rung-*/; do rungs+=("$(basename "$d")"); done; fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
status=0

for rung in "${rungs[@]}"; do
  n="${rung#rung-}"; n="${n%%-*}"
  name="${rung#rung-*-}"
  week="$(week_of "$rung")"
  stage="$work/$rung/tutors-ladder"
  mkdir -p "$stage"
  echo "== $rung"

  # 1. Stage tracked files only, so node_modules and build output never ship.
  (cd "$here/variants" && git ls-files -z "$rung" fixtures | xargs -0 -I{} cp --parents {} "$stage/")
  cat > "$stage/README.md" <<EOF
# Tutors Ladder: rung $n ($name), the standard version

This is the completed code for rung $n of the Tutors Ladder. Build your own work on top of it.

- \`$rung/\`: the variant. Start with its README.md, then RUNG.md and AGENTS.md.
- \`fixtures/\`: the sample course every rung's tests use, and its upstream tutors.json.

Keep the two folders side by side: the tests find the fixture at \`../fixtures\`.
EOF

  # 2. Prove the staged copy: compile and test through the Single Gate, then showcase on the fixture.
  proof="$work/$rung/proof"; cp -r "$stage" "$proof"
  (
    cd "$proof/$rung"
    if [ -f pnpm-lock.yaml ]; then
      pnpm install --frozen-lockfile >/dev/null 2>&1
      pnpm test >"$work/$rung/gate.log" 2>&1
      pnpm start ../fixtures/ladder-sample-course "$work/$rung/showcase" >"$work/$rung/showcase.log" 2>&1
    else
      npm test >"$work/$rung/gate.log" 2>&1
      node src/main.ts ../fixtures/ladder-sample-course "$work/$rung/showcase" >"$work/$rung/showcase.log" 2>&1
    fi
  ) || { echo "   FAILED: the staged copy does not pass its gate or showcase; no zip written"; tail -20 "$work/$rung/gate.log" "$work/$rung/showcase.log" 2>/dev/null; status=1; continue; }
  test -e "$work/$rung/showcase" || { echo "   FAILED: the showcase wrote nothing"; status=1; continue; }
  echo "   gate green, showcase ran"

  # 3. A reproducible zip: fixed timestamps, sorted entries, no extra attributes.
  zip="$work/$rung/$rung.zip"
  find "$stage" -exec touch -h -d "2026-01-01T00:00:00Z" {} +
  (cd "$work/$rung" && find tutors-ladder -type f | LC_ALL=C sort | TZ=UTC zip -X -q "$zip" -@)

  dest="${LADDER_ZIP_OUT:-$here/course}/$week/unit-2-practice/archive-rung-$n-$name"
  if [ "$check" = 1 ]; then
    cmp -s "$zip" "$dest/$rung.zip" || { echo "   STALE: $dest/$rung.zip differs from the variant; run package-variants.sh"; status=1; }
    continue
  fi
  mkdir -p "$dest"
  cp "$zip" "$dest/$rung.zip"
  cat > "$dest/archive.md" <<EOF
Rung $n ($name): the standard version

The completed code for rung $n as a zip. It installs, compiles, passes its gate and runs on the sample course. Build beyond it, and start the next rung from it.
EOF
  python3 "$here/scripts/make-card.py" "Rung $n: standard version" "$rung.zip" "$dest/archive.png" --rung "$n" >/dev/null
  echo "   wrote course/$week/unit-2-practice/archive-rung-$n-$name/$rung.zip ($(du -h "$zip" | cut -f1))"
done
exit $status
