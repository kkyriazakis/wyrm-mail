#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
firefox="$root/firefox"
version="$(cat "$root/comm/mail/config/version_display.txt")"
out="$root/dist"

for tool in dpkg dpkg-deb; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Required command not found: $tool" >&2
    exit 1
  fi
done

arch="$(dpkg --print-architecture)"

if [ ! -x "$firefox/mach" ] || [ ! -e "$firefox/comm" ]; then
  echo "Firefox checkout is missing; run scripts/setup.sh first." >&2
  exit 1
fi

work="$(mktemp -d "${TMPDIR:-/tmp}/wyrm-mail-deb.XXXXXX")"
trap 'rm -rf "$work"' EXIT
mkdir -p "$out"

sed 's#obj-wyrm-mail$#obj-wyrm-mail-deb#' "$root/mozconfig" > "$work/mozconfig"
cat "$root/packaging/common/mozconfig" >> "$work/mozconfig"
cat >> "$work/mozconfig" <<'EOF'
ac_add_options --with-distribution-id=org.debian
ac_add_options --without-wasm-sandboxed-libraries
EOF

export MOZCONFIG="$work/mozconfig"
export MACH_BUILD_PYTHON_NATIVE_PACKAGE_SOURCE=none
export MOZ_NOSPAM=1

cd "$firefox"
./mach build

stage="$work/root"
DESTDIR="$stage" ./mach install
"$root/packaging/common/install-extras.sh" \
  "$stage" "/usr/lib/wyrm-mail" org.debian "Debian/Ubuntu"
install -Dm644 "$firefox/LICENSE" "$stage/usr/share/doc/wyrm-mail/copyright"

control="$stage/DEBIAN/control"
install -d "$(dirname "$control")"
sed -e "s/@VERSION@/$version/" -e "s/@ARCH@/$arch/" \
  "$root/packaging/debian/control.in" > "$control"

package="$out/wyrm-mail_${version}_${arch}.deb"
dpkg-deb --build --root-owner-group "$stage" "$package"
printf 'Wrote %s\n' "$package"
