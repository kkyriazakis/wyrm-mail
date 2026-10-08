# Mail Client

A native email client for GNOME (Fedora and other Linux distros), built with
Python, GTK 4 and libadwaita.

## Layout

```
meson.build                     top-level build
src/                            Python app (main.py, window.py) + window.ui
data/                           .desktop, metainfo, GSettings schema, icon
io.github.kkyriazakis.MailClient.json     Flatpak manifest (any distro, Flathub)
packaging/mail-client.spec      RPM spec (Fedora/RHEL, e.g. via COPR)
run.sh                          build + run locally
```

## Run locally (Fedora)

```bash
sudo dnf install meson python3-gobject gtk4 libadwaita
./run.sh
meson test -C build      # validates desktop, metainfo and schema files
```

## Build as a Flatpak

```bash
flatpak install flathub org.gnome.Sdk//51 org.flatpak.Builder
flatpak run org.flatpak.Builder --user --install --force-clean flatpak-build io.github.kkyriazakis.MailClient.json
flatpak run io.github.kkyriazakis.MailClient
```

## Build an RPM

```bash
meson dist -C build --no-tests --allow-dirty   # needs a git repo; produces build/meson-dist/*.tar.xz
rpmbuild -ba packaging/mail-client.spec --define "_sourcedir $PWD/build/meson-dist"
```
