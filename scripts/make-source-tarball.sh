#!/usr/bin/env bash
# Packs the committed state of this repository (comm/, mozconfig,
# packaging/, ...) into fedora-email-client-<version>.tar.xz, the second
# source of the RPM spec and the Arch PKGBUILD.
#
# Usage: scripts/make-source-tarball.sh [output-dir]   (default: artifacts/)
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
out="$(mkdir -p "${1:-$root/artifacts}" && cd "${1:-$root/artifacts}" && pwd)"
version="$(cat "$root/comm/mail/config/version_display.txt")"
name="fedora-email-client-$version"

if [ -n "$(git -C "$root" status --porcelain)" ]; then
  echo "Warning: uncommitted changes are not included; the tarball is built from HEAD." >&2
fi

echo "Packing $name.tar.xz..."
git -C "$root" archive --format=tar --prefix="$name/" HEAD | xz -T0 > "$out/$name.tar.xz"
echo "Wrote $out/$name.tar.xz"
