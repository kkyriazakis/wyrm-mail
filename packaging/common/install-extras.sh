#!/usr/bin/env bash
# Installs the desktop integration that `mach install` does not: desktop
# file, AppStream metainfo, icons, vendor prefs and distribution.ini.
# Shared by the RPM spec and the Arch PKGBUILD.
#
# Usage: install-extras.sh DESTDIR APPDIR DISTRO_ID DISTRO_NAME
#   DESTDIR      package staging root ($RPM_BUILD_ROOT, $pkgdir)
#   APPDIR       install dir of the app, e.g. /usr/lib64/wyrm-mail
#   DISTRO_ID    reverse-DNS distro id, e.g. org.fedoraproject
#   DISTRO_NAME  shown in the About dialog, e.g. "Fedora"
set -euo pipefail

destdir="$1"
appdir="$2"
distro_id="$3"
distro_name="$4"

name=wyrm-mail
app_id=io.github.kkyriazakis.WyrmMail
here="$(cd "$(dirname "$0")" && pwd)"
branding="$here/../../comm/mail/branding/$name"
datadir="$destdir/usr/share"

install -Dm644 "$here/$name.desktop" "$datadir/applications/$name.desktop"
install -Dm644 "$here/$app_id.metainfo.xml" "$datadir/metainfo/$app_id.metainfo.xml"

for size in 16 22 24 32 48 64 128 256; do
  install -Dm644 "$branding/default$size.png" \
    "$datadir/icons/hicolor/${size}x$size/apps/$name.png"
done
install -Dm644 "$branding/TB-symbolic.svg" \
  "$datadir/icons/hicolor/symbolic/apps/$name-symbolic.svg"

install -Dm644 "$here/vendor.js" "$destdir$appdir/defaults/pref/vendor.js"

install -Dm644 /dev/stdin "$destdir$appdir/distribution/distribution.ini" <<EOF
[Global]
id=$distro_id
version=1.0
about=Wyrm Mail for $distro_name
EOF

# mach installs the launcher twice, as $name and $name-bin. Keep one copy.
if cmp -s "$destdir$appdir/$name" "$destdir$appdir/$name-bin"; then
  ln -sf "$name" "$destdir$appdir/$name-bin"
fi
