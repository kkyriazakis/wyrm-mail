Name:           mail-client
Version:        0.1.0
Release:        1%{?dist}
Summary:        Native email client for GNOME

License:        GPL-3.0-or-later
URL:            https://example.com/mail-client
Source0:        %{name}-%{version}.tar.xz

BuildArch:      noarch

BuildRequires:  meson
BuildRequires:  python3-devel
BuildRequires:  python3-gobject
BuildRequires:  glib2-devel
BuildRequires:  desktop-file-utils
BuildRequires:  appstream

Requires:       python3-gobject
Requires:       gtk4
Requires:       libadwaita
Requires:       hicolor-icon-theme

%description
A native email client for GNOME, built with GTK and libadwaita.

%prep
%autosetup

%build
%meson
%meson_build

%install
%meson_install

%check
%meson_test

%files
%doc README.md
%{_bindir}/mail-client
%{_datadir}/mail-client/
%{_datadir}/applications/io.github.kkyriazakis.MailClient.desktop
%{_metainfodir}/io.github.kkyriazakis.MailClient.metainfo.xml
%{_datadir}/glib-2.0/schemas/io.github.kkyriazakis.MailClient.gschema.xml
%{_datadir}/icons/hicolor/scalable/apps/io.github.kkyriazakis.MailClient.svg

%changelog
* Wed Oct 07 2026 kkyriazakis - 0.1.0-1
- Initial package
