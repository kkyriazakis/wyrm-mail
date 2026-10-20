#!/usr/bin/env bash
# Imports a new upstream Thunderbird revision into the upstream-thunderbird
# branch and merges it into the current branch.
#
# Usage: scripts/update-thunderbird.sh [branch-or-tag]   (default: release)
set -euo pipefail

ref="${1:-release}"
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is not clean; commit or stash first." >&2
  exit 1
fi

current="$(git branch --show-current)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "Fetching Thunderbird $ref..."
git clone -q --depth 1 --branch "$ref" https://github.com/thunderbird/thunderbird-desktop "$tmp/comm"
sha="$(git -C "$tmp/comm" rev-parse HEAD)"
version="$(cat "$tmp/comm/mail/config/version.txt")"

git switch -q upstream-thunderbird
git rm -rq --cached comm
rm -rf comm
mkdir comm
git -C "$tmp/comm" archive HEAD | tar -x -C comm
# -f: upstream ships files (e.g. vendored crates' .vscode/) that personal
# gitignores would otherwise drop, breaking cargo checksums.
git add -f comm
git commit -q -m "Import Thunderbird $version (comm)" \
  -m "Upstream: https://github.com/thunderbird/thunderbird-desktop/commit/$sha"
git switch -q "$current"

echo "Merging Thunderbird $version into $current..."
git merge --no-edit upstream-thunderbird
"$root/scripts/sync-packaging.sh"
echo "Done. Run scripts/setup.sh to move firefox/ to the matching Firefox version,"
echo "and commit the packaging/ changes, if any."
