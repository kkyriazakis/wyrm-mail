#!/usr/bin/env bash
# Build, install into ./_install and launch, for local development without Flatpak.
set -euo pipefail
cd "$(dirname "$0")"

# Prefer the system Python (it has PyGObject) over any active virtualenv.
export PATH="/usr/bin:$PATH"

[ -d build ] || meson setup build --prefix="$PWD/_install"
meson install -C build --quiet

export XDG_DATA_DIRS="$PWD/_install/share:${XDG_DATA_DIRS:-/usr/local/share:/usr/share}"
export GSETTINGS_SCHEMA_DIR="$PWD/_install/share/glib-2.0/schemas"
exec "$PWD/_install/bin/mail-client" "$@"
