#!/usr/bin/env bash
# Prepares firefox/ (the Mozilla platform checkout) for building:
# checks out the Firefox revision that comm/.gecko_rev.yml pins, and links
# comm/ and mozconfig into it.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
firefox="$root/firefox"
ref="$(sed -n 's/^GECKO_HEAD_REF: //p' "$root/comm/.gecko_rev.yml")"

if [ -z "$ref" ]; then
  echo "Could not read GECKO_HEAD_REF from comm/.gecko_rev.yml" >&2
  exit 1
fi

if [ ! -d "$firefox/.git" ]; then
  git init -q "$firefox"
  git -C "$firefox" remote add origin https://github.com/mozilla-firefox/firefox
fi

if ! git -C "$firefox" rev-parse -q --verify "refs/tags/$ref" >/dev/null; then
  echo "Fetching Firefox $ref (shallow)..."
  git -C "$firefox" fetch --depth 1 --no-tags origin "refs/tags/$ref:refs/tags/$ref"
fi

if [ "$(git -C "$firefox" rev-parse HEAD 2>/dev/null)" != "$(git -C "$firefox" rev-parse "$ref^{commit}")" ]; then
  echo "Checking out Firefox $ref..."
  git -C "$firefox" -c advice.detachedHead=false checkout -q "$ref"
fi

ln -sfn ../comm "$firefox/comm"
grep -qxF /comm "$firefox/.git/info/exclude" 2>/dev/null || echo /comm >> "$firefox/.git/info/exclude"
ln -sfn ../mozconfig "$firefox/mozconfig"

echo "firefox/ is at $ref, with comm/ and mozconfig linked in."
echo "Next: cd firefox && ./mach --no-interactive bootstrap --application-choice \"Firefox for Desktop\""
