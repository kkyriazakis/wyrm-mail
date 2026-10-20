# Packaging guide

How to build native packages of Wyrm Mail:

- an RPM for Fedora and RHEL-family distros (RHEL, AlmaLinux, Rocky);
- a pacman package for Arch Linux.

Both packages build with the distro's own toolchains (clang, rust, cbindgen,
nodejs) and work offline. They do not use `mach bootstrap` or `~/.mozbuild`.
For a development build, see [SETUP.md](SETUP.md) instead.

## Layout

| Path | What it is |
|---|---|
| `packaging/rpm/wyrm-mail.spec` | RPM spec. |
| `packaging/arch/PKGBUILD` | Arch package recipe. |
| `packaging/common/mozconfig` | Build options both packages add to the top-level `mozconfig`. |
| `packaging/common/install-extras.sh` | Installs the desktop file, metainfo, icons, `vendor.js` and `distribution.ini`. |
| `packaging/common/*.desktop`, `*.metainfo.xml`, `vendor.js` | Files that script installs. |
| `scripts/make-source-tarball.sh` | Packs this repository into `wyrm-mail-<version>.tar.xz`. |
| `scripts/sync-packaging.sh` | Sets the version and Firefox tag in both recipes from `comm/`. |

Each package has two sources:

1. The Firefox source at the tag `comm/.gecko_rev.yml` pins, downloaded from
   GitHub (~1 GB).
2. This repository, packed by `scripts/make-source-tarball.sh`. It packs the
   last commit (`HEAD`); uncommitted changes are left out.

## What gets installed

| | Fedora / RHEL | Arch |
|---|---|---|
| App | `/usr/lib64/wyrm-mail/` | `/usr/lib/wyrm-mail/` |
| Launcher | `/usr/bin/wyrm-mail` | same |
| Desktop file | `/usr/share/applications/wyrm-mail.desktop` | same |
| AppStream | `/usr/share/metainfo/io.github.kkyriazakis.WyrmMail.metainfo.xml` | same |
| Icons | `/usr/share/icons/hicolor/*/apps/wyrm-mail.png` | same |
| Distribution id | `org.fedoraproject` | `org.archlinux` |

The app uses the system's hunspell dictionaries (`/usr/share/hunspell`) and
follows the system locale. The About dialog names the distro.

Bundled libraries (NSS, NSPR, ICU, codecs) stay inside the app directory.
RHEL-family releases ship versions too old for the pinned Gecko, and keeping
them bundled gives one build configuration for all distros.

## Build resources

Same as a development build: at least 16 GB RAM (32 GB recommended), 40 GB
of free disk, and 1–2 hours on 8 cores.

## Fedora / RHEL

```bash
sudo dnf install rpm-build rpmdevtools dnf-plugins-core
rpmdev-setuptree

scripts/make-source-tarball.sh ~/rpmbuild/SOURCES
spectool -g -C ~/rpmbuild/SOURCES packaging/rpm/wyrm-mail.spec
sudo dnf builddep packaging/rpm/wyrm-mail.spec
rpmbuild -ba packaging/rpm/wyrm-mail.spec

sudo dnf install ~/rpmbuild/RPMS/x86_64/wyrm-mail-*.rpm
```

On RHEL, AlmaLinux and Rocky, enable EPEL first (`cbindgen` and `nasm` come
from there). Gecko needs a recent rust and clang, so use the latest minor
release of RHEL 10; older releases are likely to fail at configure.

### COPR

To publish a dnf repository, create a COPR project with the Fedora (and
optionally EPEL 10) chroots, then upload a source RPM:

```bash
rpmbuild -bs packaging/rpm/wyrm-mail.spec
copr-cli build <project> ~/rpmbuild/SRPMS/wyrm-mail-*.src.rpm
```

Users then install with `sudo dnf copr enable <user>/<project>` and
`sudo dnf install wyrm-mail`.

## Arch Linux

```bash
sudo pacman -S --needed base-devel

scripts/make-source-tarball.sh packaging/arch
cd packaging/arch
makepkg -si
```

`makepkg -s` installs the build dependencies, and `-i` installs the
finished package. Build output (`src/`, `pkg/`, the tarballs and the
`.pkg.tar.zst`) stays in `packaging/arch/` and is ignored by git.

To publish on the AUR, push `PKGBUILD` and `.SRCINFO`
(`makepkg --printsrcinfo > .SRCINFO`) to an AUR repository. The AUR does not
host source tarballs, so the second source must first be changed to a
download URL, such as a GitHub release asset.

## Updating

`scripts/update-thunderbird.sh` runs `scripts/sync-packaging.sh` for you.
It sets the new version and Firefox tag in both recipes. Then:

1. Add a `%changelog` entry to the spec and a `<release>` to the metainfo.
2. If the Firefox tag changed, run `updpkgsums` in `packaging/arch/` on Arch
   to pin the new Firefox checksum.
3. Commit, then build as above.

For a new package of the same version, increase `Release:` in the spec and
`pkgrel=` in the PKGBUILD instead.
