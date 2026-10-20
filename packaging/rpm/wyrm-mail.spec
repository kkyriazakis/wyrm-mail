# RPM package for Fedora and RHEL-family distros (RHEL, AlmaLinux, Rocky).
# See docs/PACKAGING.md. Version and gecko_tag are kept in sync with comm/
# by scripts/sync-packaging.sh.

%global gecko_tag FIREFOX_157_0_BUILD1
%global app_id io.github.kkyriazakis.WyrmMail

# Gecko is built with clang. Its own LTO settings apply, not the distro's.
%global toolchain clang
%global _lto_cflags %{nil}
# Full debuginfo for libxul is several GB; not worth it for this package yet.
%global debug_package %{nil}

# Bundled libraries are private to the app; keep them out of the global
# Provides/Requires so they never satisfy or demand system packages.
%global __provides_exclude_from ^%{_libdir}/%{name}/.*$
%global __requires_exclude ^(libxul|liblgpllibs|libmoz[a-z0-9]+|libgkcodecs|librnp|libipcclientcerts|libnss3|libnssutil3|libsmime3|libssl3|libsoftokn3|libfreeblpriv3|libnspr4|libplc4|libplds4)\\.so.*$

Name:           wyrm-mail
Version:        157.0.2
Release:        1%{?dist}
Summary:        Outlook-first email client based on Thunderbird

License:        MPL-2.0
URL:            https://github.com/kkyriazakis/wyrm-mail
# Mozilla platform at the revision comm/.gecko_rev.yml pins.
Source0:        https://github.com/mozilla-firefox/firefox/archive/refs/tags/%{gecko_tag}.tar.gz#/firefox-%{gecko_tag}.tar.gz
# This repository; made by scripts/make-source-tarball.sh.
Source1:        %{name}-%{version}.tar.xz

ExclusiveArch:  x86_64 aarch64

BuildRequires:  cargo
BuildRequires:  cbindgen
BuildRequires:  clang
BuildRequires:  clang-devel
BuildRequires:  lld
BuildRequires:  llvm
BuildRequires:  make
BuildRequires:  m4
BuildRequires:  nasm
BuildRequires:  nodejs
BuildRequires:  perl-interpreter
BuildRequires:  python3
BuildRequires:  rust
BuildRequires:  unzip
BuildRequires:  zip
BuildRequires:  pkgconfig(alsa)
BuildRequires:  pkgconfig(dbus-1)
BuildRequires:  pkgconfig(gtk+-3.0)
BuildRequires:  pkgconfig(libdrm)
BuildRequires:  pkgconfig(libffi)
BuildRequires:  pkgconfig(libpulse)
BuildRequires:  pkgconfig(x11-xcb)
BuildRequires:  pkgconfig(xcomposite)
BuildRequires:  pkgconfig(xdamage)
BuildRequires:  pkgconfig(xfixes)
BuildRequires:  pkgconfig(xrandr)
BuildRequires:  pkgconfig(xt)
BuildRequires:  pkgconfig(xtst)
BuildRequires:  pkgconfig(zlib)
BuildRequires:  desktop-file-utils
BuildRequires:  libappstream-glib

Requires:       hicolor-icon-theme
Recommends:     hunspell
Suggests:       ffmpeg-free

%description
A native email client for Linux, based on Thunderbird. It connects to
Microsoft 365 and Outlook accounts, including work accounts on custom
domains, through Microsoft Graph, alongside Gmail and standard IMAP and SMTP
accounts.

%prep
%setup -q -n firefox-%{gecko_tag}
%setup -q -n firefox-%{gecko_tag} -T -D -a 1
ln -sfn %{name}-%{version}/comm comm
cat %{name}-%{version}/mozconfig %{name}-%{version}/packaging/common/mozconfig > mozconfig
cat >> mozconfig <<'EOF'
ac_add_options --libdir=%{_libdir}
ac_add_options --with-distribution-id=org.fedoraproject
# Fedora and RHEL do not package a wasi sysroot that Gecko can use.
ac_add_options --without-wasm-sandboxed-libraries
EOF

%build
export MOZBUILD_STATE_PATH="$PWD/.mozbuild"
export MACH_BUILD_PYTHON_NATIVE_PACKAGE_SOURCE=none
export MOZ_NOSPAM=1
ulimit -n 4096
./mach build

%install
export MOZBUILD_STATE_PATH="$PWD/.mozbuild"
export MACH_BUILD_PYTHON_NATIVE_PACKAGE_SOURCE=none
DESTDIR=%{buildroot} ./mach install
%{name}-%{version}/packaging/common/install-extras.sh \
  %{buildroot} %{_libdir}/%{name} org.fedoraproject "%{?fedora:Fedora}%{!?fedora:Enterprise Linux}"

%check
desktop-file-validate %{buildroot}%{_datadir}/applications/%{name}.desktop
appstream-util validate-relax --nonet %{buildroot}%{_metainfodir}/%{app_id}.metainfo.xml

%files
%license LICENSE
%{_bindir}/%{name}
%{_libdir}/%{name}/
%{_datadir}/applications/%{name}.desktop
%{_metainfodir}/%{app_id}.metainfo.xml
%{_datadir}/icons/hicolor/*/apps/%{name}.png
%{_datadir}/icons/hicolor/symbolic/apps/%{name}-symbolic.svg

%changelog
* Mon Oct 19 2026 Kleanthis Kyriazakis <kleanthis_kyriaz@hotmail.com> - 157.0.2-1
- First RPM package of the Thunderbird fork
