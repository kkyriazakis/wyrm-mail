# Wyrm Mail

A native, Outlook-first email client for Linux, based on Thunderbird.

It targets Microsoft 365 / Outlook (including work accounts on custom domains)
through Microsoft Graph, alongside Gmail and standard IMAP/SMTP accounts.

## Getting started

See [docs/SETUP.md](docs/SETUP.md) for dependencies, building and running.
To build installable packages for Fedora/RHEL (RPM) or Arch Linux (pacman),
see [docs/PACKAGING.md](docs/PACKAGING.md).

Short version:

```bash
scripts/setup.sh
cd firefox
./mach --no-interactive bootstrap --application-choice "Firefox for Desktop"
./mach build
./mach run
```

## Repository layout

| Path | What it is |
|---|---|
| `comm/` | Thunderbird source with our changes. All fork work happens here. |
| `mozconfig` | Build configuration (branding, disabled Mozilla services, objdir). |
| `scripts/setup.sh` | Fetches the matching Mozilla platform into `firefox/` and links `comm/` and `mozconfig` into it. |
| `scripts/update-thunderbird.sh` | Imports a new upstream Thunderbird release and merges it. |
| `packaging/` | RPM spec (Fedora/RHEL), Arch PKGBUILD and shared desktop integration. |
| `scripts/make-source-tarball.sh`, `scripts/sync-packaging.sh` | Source tarball and version sync for the packages. |
| `docs/` | Guides. |
| `prototypes/gtk-mail-client/` | Earlier GTK4/libadwaita prototype, kept for reference. |
| `firefox/` | Mozilla platform checkout. Not tracked; created by `scripts/setup.sh`. |

## Branches

- `main`: the fork.
- `upstream-thunderbird`: unmodified Thunderbird imports, one commit per
  release. Do not commit to it by hand; use `scripts/update-thunderbird.sh`.

## For AI agents and new contributors

Read [codebase.md](codebase.md) first: where things live, how to build and
check UI changes quickly, and the pitfalls found so far.

## Changes from Thunderbird

- Own branding and app identity: `wyrm-mail` binary, profile in
  `~/.wyrm-mail/`
  (`comm/mail/branding/wyrm-mail/`, `comm/mail/moz.configure`). Icon
  sources are in `in/`.
- Dragon Blue palette (`in/dragon-email-colors.md`): token overrides at the
  end of `comm/mail/themes/shared/mail/colors.css`, plus `layout.css`, the
  Compose button in `unifiedToolbar.css`, and the "Dragon blue" accent as the
  default.
- Outlook for macOS look (`in/outlook-macos/DESIGN-RULES.md`): rounded cards
  on a window surface, an actions card (ribbon) above the mail view, an
  Outlook-style message list (date groups, hover actions, preview) and
  message view (subject, sender and body cards), an avatar menu and settings
  button in the top bar, light/dark and translucent window switches.
- Single view: only the current space (mail, calendar, contacts, tasks) is
  open and the tab strip is hidden; chat, the status bar, add-ons settings
  and mobile export are turned off.
- Without an account, the app opens on a full-window sign-in screen instead
  of the mail UI (`accountHub.css`).
- Mozilla's updater, crash reporter, telemetry, start page and in-app
  notifications disabled.
- Microsoft 365 mailboxes found through Exchange Autodiscover default to
  Microsoft Graph instead of EWS, which Microsoft is retiring in Exchange
  Online (`comm/mail/components/accountcreation/modules/FindConfig.sys.mjs`).

## Known gaps

- Dialogs (filters, compose, settings dialogs) are only partly restyled; their
  titlebars come from a GTK CSS hook (`widget.gtk.titlebar-css.*`) that has
  not been verified on every GTK theme.
- Microsoft and Google OAuth still use Thunderbird's client IDs
  (`comm/mailnews/base/src/OAuth2Providers.sys.mjs`). Register our own before
  any release.

## License

Code under `comm/` is under the Mozilla Public License 2.0, like upstream
Thunderbird. Modified MPL files must stay under the MPL.
