#!/usr/bin/env bash
# Single Gate for course content: validate a Tutors course folder with the upstream rules
# (tutors-mono-repo packages/jsr/course-rules, run through tutors-cli), then build it with the
# upstream generator. Green means the folder is a compliant Tutors course.
#
# Usage: TUTORS_MONO_REPO=/path/to/tutors-mono-repo tutors/scripts/check-course.sh [course-folder]
# Needs Deno 2 on PATH (or DENO=/path/to/deno). Defaults to tutors/course.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
course="${1:-$here/course}"
deno="${DENO:-deno}"
mono="${TUTORS_MONO_REPO:?set TUTORS_MONO_REPO to a clone of tutors-sdk/tutors-mono-repo}"
cli="$mono/packages/jsr/tutors-cli/main.ts"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
cp -r "$course" "$work/course"
cd "$work/course"

echo "== validate ($course)"
"$deno" run -A "$cli" validate 2>&1 | grep -v "vitest-cucumber" || true
"$deno" run -A "$cli" validate >/dev/null 2>&1 || { echo "validate: errors found"; exit 1; }

echo "== build"
"$deno" run -A "$cli" build 2>&1 | grep -v "vitest-cucumber" | tail -3
test -s json/tutors.json || { echo "build: no json/tutors.json"; exit 1; }
echo "OK: compliant course, $(wc -c < json/tutors.json) bytes of tutors.json"
