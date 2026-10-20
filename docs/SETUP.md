# Setup guide

How to go from a fresh clone of this repository to a running build of
Wyrm Mail.

## 1. Requirements

| | Minimum | Recommended |
|---|---|---|
| OS | Any 64-bit Linux (Fedora, RHEL/Alma/Rocky, Debian/Ubuntu, Arch, openSUSE) | Fedora Workstation |
| CPU | 4 cores | 8+ cores |
| RAM | 16 GB | 32 GB |
| Free disk | 40 GB | 60 GB |

Disk use after a full build is roughly:

- `firefox/` checkout: ~6 GB
- `comm/`: ~0.7 GB
- toolchains in `~/.mozbuild`: ~5 GB
- build output in `firefox/obj-wyrm-mail/`: ~15–25 GB

The only things to install by hand are `git`, `python3` and `curl`.
`mach bootstrap` (step 4) installs everything else.

Fedora / RHEL / Alma / Rocky:

```bash
sudo dnf install git python3 curl
```

Debian / Ubuntu:

```bash
sudo apt install git python3 curl
```

Arch:

```bash
sudo pacman -S git python curl
```

## 2. Clone

```bash
git clone <your-private-repo-url> native-email-client
cd native-email-client
```

## 3. Fetch the Mozilla platform

Thunderbird runs on Mozilla's platform (Gecko, SpiderMonkey, NSS, the build
system), which lives in the Firefox repository. This repository only contains
`comm/`, the mail application. The script below:

- downloads the exact Firefox revision that `comm/.gecko_rev.yml` pins into
  `firefox/` (a shallow clone, ~1.5 GB download);
- links `comm/` and `mozconfig` into it.

```bash
scripts/setup.sh
```

`firefox/` is ignored by git. Never commit changes inside it; all fork
changes belong in `comm/`.

## 4. Install the build toolchains

```bash
cd firefox
./mach --no-interactive bootstrap --application-choice "Firefox for Desktop"
```

- It asks for your `sudo` password once, to install a few system packages
  (perl, m4, make, unzip, ...) with dnf/apt/pacman.
- It then downloads clang, rust, node, cbindgen and other toolchains into
  `~/.mozbuild`. Nothing else goes outside the repository.
- Choose "Firefox for Desktop": Thunderbird uses the same toolchains, and
  `mozconfig` selects the mail app.

## 5. Build and run

From `firefox/`:

```bash
./mach build        # first build: ~45–90 min; later builds are incremental
./mach run          # starts Wyrm Mail
```

The profile is stored in `~/.wyrm-mail/`, separate from any
installed Thunderbird.

When you have changed only front-end files (JS, CSS, HTML, Fluent strings),
this is much faster:

```bash
./mach build faster
```

## 6. Tests

From `firefox/`:

```bash
./mach xpcshell-test comm/mail/components/accountcreation/test/xpcshell/test_findConfig.js
./mach mochitest comm/mail/components/accountcreation/test/browser/
./mach lint comm/mail/components/accountcreation/
```

## 7. Updating to a new Thunderbird release

Upstream Thunderbird code is kept, unmodified, on the `upstream-thunderbird`
branch. `main` merges it and adds our changes on top.

```bash
scripts/update-thunderbird.sh            # latest "release" branch
scripts/update-thunderbird.sh esr153     # or a specific branch/tag
scripts/setup.sh                         # move firefox/ to the matching version
cd firefox && ./mach build
```

Merge conflicts, if any, will be in files we changed. Resolve them as usual
and commit.

## Troubleshooting

`./mach configure` builds Firefox instead of the mail app
: Check that `mozconfig` is not empty (`git diff mozconfig`). `mach bootstrap`
  has been seen to truncate it; restore it with `git checkout mozconfig`.

`ModuleNotFoundError` or the wrong Python is picked up
: Deactivate any active Python virtualenv before running `./mach`.

`firefox/comm` or `firefox/mozconfig` missing
: Run `scripts/setup.sh` again; it is safe to rerun at any time.

Build fails after updating Thunderbird
: Run `scripts/setup.sh` so `firefox/` matches the version `comm/` expects,
  then `./mach build` again. If it still fails, `./mach clobber` and rebuild.
