# Commands

## Build from source

```bash
scripts/setup.sh               # once: fetches the firefox/ checkout
cd firefox
./mach build -j6               # full build; -j sets parallel jobs (6 = half of 12 cores)
./mach build faster            # front end only (JS, CSS, XHTML), seconds
./mach build binaries          # C++ only
git checkout ../mozconfig      # if `mach bootstrap` overwrote it
```

## Run the build

```bash
cd firefox
./mach run
```

Restart the app after front-end changes.

## Install on Fedora / RHEL / AlmaLinux / Rocky (RPM)

```bash
sudo dnf install rpm-build rpmdevtools dnf-plugins-core
rpmdev-setuptree
scripts/make-source-tarball.sh ~/rpmbuild/SOURCES
spectool -g -C ~/rpmbuild/SOURCES packaging/rpm/wyrm-mail.spec
sudo dnf builddep packaging/rpm/wyrm-mail.spec
rpmbuild -ba packaging/rpm/wyrm-mail.spec
sudo dnf install ~/rpmbuild/RPMS/x86_64/wyrm-mail-*.rpm
wyrm-mail
```

## Install on Arch Linux (pacman)

```bash
sudo pacman -S --needed base-devel
scripts/make-source-tarball.sh packaging/arch
cd packaging/arch
makepkg -si
wyrm-mail
```

See `docs/PACKAGING.md` for details.
