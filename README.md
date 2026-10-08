# Fedora Email Client

A native, Outlook-first email client for Linux, based on Thunderbird.

It targets Microsoft 365 / Outlook (including work accounts on custom domains)
through Microsoft Graph, alongside Gmail and standard IMAP/SMTP accounts.

## Getting started

See [docs/SETUP.md](docs/SETUP.md) for dependencies, building and running.

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
| `docs/` | Guides. |
| `prototypes/gtk-mail-client/` | Earlier GTK4/libadwaita prototype, kept for reference. |
| `firefox/` | Mozilla platform checkout. Not tracked; created by `scripts/setup.sh`. |

## Branches

- `main`: the fork.
- `upstream-thunderbird`: unmodified Thunderbird imports, one commit per
  release. Do not commit to it by hand; use `scripts/update-thunderbird.sh`.

## Changes from Thunderbird

- Own branding and app identity: `fedora-email-client` binary, profile in
  `~/.fedora-email-client/`
  (`comm/mail/branding/fedora-email-client/`, `comm/mail/moz.configure`).
- Mozilla's updater, crash reporter, telemetry, start page and in-app
  notifications disabled.
- Microsoft 365 mailboxes found through Exchange Autodiscover default to
  Microsoft Graph instead of EWS, which Microsoft is retiring in Exchange
  Online (`comm/mail/components/accountcreation/modules/FindConfig.sys.mjs`).

## Known gaps

- Microsoft and Google OAuth still use Thunderbird's client IDs
  (`comm/mailnews/base/src/OAuth2Providers.sys.mjs`). Register our own before
  any release.
- Icons are still Mozilla's "Daily" placeholders.
- "Fedora" is a Red Hat trademark; the name needs permission or a change
  before public release.

## License

Code under `comm/` is under the Mozilla Public License 2.0, like upstream
Thunderbird. Modified MPL files must stay under the MPL.
