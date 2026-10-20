#!/usr/bin/env bash
# Updates the version and pinned Firefox tag in the RPM spec and the Arch
# PKGBUILD to match comm/. Run after scripts/update-thunderbird.sh.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
spec="$root/packaging/rpm/fedora-email-client.spec"
pkgbuild="$root/packaging/arch/PKGBUILD"
version="$(cat "$root/comm/mail/config/version_display.txt")"
tag="$(sed -n 's/^GECKO_HEAD_REF: //p' "$root/comm/.gecko_rev.yml")"

old_version="$(sed -n 's/^pkgver=//p' "$pkgbuild")"
old_tag="$(sed -n 's/^_gecko_tag=//p' "$pkgbuild")"

if [ "$version" = "$old_version" ] && [ "$tag" = "$old_tag" ]; then
  echo "Packaging already at $version ($tag)."
  exit 0
fi

sed -i -e "s/^%global gecko_tag .*/%global gecko_tag $tag/" \
       -e "s/^\(Version: *\).*/\1$version/" \
       -e "s/^\(Release: *\).*/\11%{?dist}/" "$spec"
sed -i -e "s/^pkgver=.*/pkgver=$version/" \
       -e "s/^pkgrel=.*/pkgrel=1/" \
       -e "s/^_gecko_tag=.*/_gecko_tag=$tag/" "$pkgbuild"

if [ "$tag" != "$old_tag" ]; then
  # The Firefox tarball changed; its checksum must be refreshed.
  sed -i "0,/^sha256sums=('[^']*'/s//sha256sums=('SKIP'/" "$pkgbuild"
  echo "Firefox tag changed: run 'updpkgsums' in packaging/arch/ on Arch to pin the new checksum."
fi

echo "Packaging updated to $version ($tag). Also add a %changelog entry to the spec and a <release> to the metainfo."
