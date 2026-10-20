# Wyrm Mail codebase guide

For AI agents and new contributors. Wyrm Mail is a Thunderbird fork with an
Outlook-for-macOS look, built on Mozilla's platform. Read this before
editing; it records how things are wired and what went wrong before.

## Layout

| Path | What |
|---|---|
| `comm/` | Thunderbird source with our changes. Nearly all work happens here. |
| `comm/mail/` | Mail app: UI (`base/content`), themes (`themes/`), components. |
| `comm/mailnews/` | Mail engine (C++ and JS): folders, views, accounts. |
| `comm/calendar/` | Calendar and tasks. |
| `firefox/` | Mozilla platform checkout, not tracked. `scripts/setup.sh` creates it. Only touch it for GTK widget code (`widget/gtk`). |
| `in/` | Design inputs: icon sources, palette, `outlook-macos/` screenshots and `DESIGN-RULES.md`. |
| `docs/` | `SETUP.md`, `PACKAGING.md`. `packaging/` has RPM and Arch files. |
| `mozconfig` | Build config. **`mach bootstrap` overwrites it through a symlink; `git checkout mozconfig` after.** |

## Build and run

```bash
cd firefox
./mach build              # first build ~30-60 min
./mach build faster       # front end only (JS, CSS, XHTML, ftl, prefs): seconds
./mach build binaries     # C++ only
./mach run
```

- Front-end edits need `build faster` and an **app restart**: chrome CSS and
  JS are cached while it runs.
- C++ edits (`mailnews/base/src`, `firefox/widget/gtk`) need
  `build binaries`; only some are rebuilt incrementally.
- New files in `comm/mail/base` need a line in `base/jar.mn`; new theme files
  need lines in `themes/shared/jar.inc.mn` (and `themes/linux/jar.mn` for
  Linux-only CSS). New icons go in `themes/shared/mail/icons/new/compact/`,
  are registered in `jar.inc.mn` and given a `--icon-*` variable in
  `themes/shared/mail/icons.css`.

## Looking at the running app (screenshots and probes)

GNOME blocks screenshots, so drive the app with Marionette:

```bash
./mach run -- --marionette --remote-allow-system-access
```

Then, from `firefox/`, use `./mach python script.py` with
`testing/marionette/client` and the `testing/mozbase/*` dirs on `sys.path`,
`Marionette(host="127.0.0.1", port=2828)`, `set_context("chrome")`,
`execute_script(js)` (wrap `await` code in an async IIFE), and
`screenshot(format="binary")`.

- Works: the main window, dialogs (`MsgFilters()` opens one; use
  `chrome_window_handles`).
- Does not capture: popups/menus, and GTK-drawn window frames and titlebars.
- Pixel checks on screenshots are against a white backdrop, so translucent
  areas look lighter than on screen.
- Only the current tab's `browser.contentWindow` is reachable
  (`tabmail.currentTabInfo`, `tabmail.currentAbout3Pane`).
- Probe computed styles first (`getComputedStyle`, `elementsFromPoint`,
  `InspectorUtils.getMatchingCSSRules`) instead of guessing at CSS.

## Design rules

See `in/outlook-macos/DESIGN-RULES.md`. Summary of what is implemented:

- Top level panes are **cards**: `--border-radius-large` (14px),
  `--card-outline` hairline (a border, not an outline, on scrolling lists), on
  an 8px gutter over the window surface. Splitters are the transparent 8px
  gutters.
- Radius tokens live in `themes/shared/mail/colors.css` (`--border-radius-*`,
  `--button-border-radius` 8px). `variables.css` and `common.css` also set
  some (they load later; check there when a radius does not apply).
  Window radius is 20px (`--border-radius-xlarge`).
- Window surface colors: `--window-background` (outer chrome, translucent when
  the pref is on) and `--inner-window-background` (inside nested pages, so the
  tint is not applied twice) in `variables.css`.
- Use design tokens and `light-dark()`; check light and dark.

## Preferences added (`comm/mail/app/profile/all-thunderbird.js`)

| Pref | Purpose |
|---|---|
| `wyrm.ui.translucent` | Translucent window (Settings > Appearance). |
| `wyrm.ui.singleView` | One space at a time, no tab strip. |
| `wyrm.ui.showLinkTarget` | Show hovered link address (off). |
| `wyrm.ui.avatar.gravatar` | Look up account picture on Gravatar. |
| `wyrm.threadpane.dateFormat` | Message list date format. |
| `wyrm.threadpane.groupByDate` | Group folders by date on first open. |
| `widget.gtk.titlebar-css.dark/light` | GTK CSS for window titlebars. |
| Changed defaults | `mail.chat.enabled`, `mail.qrexport.enabled`, `mail.accounthub.thundermail.enabled` off; `ui.key.menuAccessKey`/`chromeAccess` 0 (no access keys); `mail.openMessageBehavior` 0; `mailnews.default_view_flags` 288 (grouped, expanded). |

Dark mode and its sign-in switch use `ui.systemUsesDarkTheme`.

## Where things are

- **Sign-in / account hub**: `comm/mail/components/accountcreation/`
  (`views/container.mjs` shadow DOM with switches and window buttons;
  templates `templates/*.inc.xhtml`; styles `themes/shared/mail/accountHub*.css`).
  Full-window first-run mode is the `account-hub-first-run` class.
- **Main window**: `base/content/messenger.xhtml`, `messenger.js`
  (`gAccountMenu`: settings button, avatar, account menu),
  `spacesToolbar.js` / `spacesToolbar.inc.xhtml` (left rail; always shown),
  top bar in `components/unifiedtoolbar/`.
- **Mail view** (`about:3pane`): `base/content/about3Pane.xhtml`, `.js`,
  `mailRibbon.js` (actions card: Block, Sweep, Move, Categorize...).
  Message list rows: `widgets/treeview/thread-card.mjs` and
  `themes/shared/mail/threadCard.css` (External tag, date format, hover
  actions, pin = `$pinned` keyword, select mode). Row heights: variable-height
  support in `widgets/tree-view.mjs` (`_rowTop`, group headings are 34px).
  Date groups (Today, Yesterday, Last Week, This Month, Older):
  `mailnews/base/src/nsMsgGroupView.cpp` (C++) and
  `threadPane.applyDefaultDateGrouping()`.
- **Message view**: `base/content/msgHdrView.inc.xhtml` / `msgHdrView.js`
  (subject card, details card, remote-content bar buttons),
  `themes/shared/mail/messageHeader.css`.
- **Contacts**: `components/addrbook/`; the tab sets `transparent` on its
  browser so translucency shows (content-type browsers otherwise paint an
  opaque canvas; a page-level `color-scheme` does too).
- **Calendar/Tasks/Today pane**: `calendar/base/themes/common/calendar.css`,
  `today-pane.css`. The Today pane toggle is moved into the top bar by
  `gAccountMenu.init()`. Calendar list ticks: `calendar-management.js`.
- **Settings**: `components/preferences/` (Appearance has theme mode and
  translucency; Export for Mobile and add-ons entry are off).
- **Filters dialog**: `base/content/FilterListDialog.xhtml`,
  `themes/shared/mail/filterDialog.css`.
- **Window shape (Linux)**: `themes/linux/mail/messenger.css`. Body is clipped
  to a 20px radius; `appearance: none` and a transparent `background-image` on
  the root stop GTK frame corners and canvas propagation from squaring it.
- **GTK titlebar hook**: `firefox/widget/gtk/nsLookAndFeel.cpp`
  (`UpdateTitlebarStyles`, reads the `widget.gtk.titlebar-css.*` prefs).

## Pitfalls found so far

- Check computed CSS before editing: a rule often loses to a later stylesheet
  (`:root` beats `html`; Linux theme files load after shared ones).
- `light-dark()` does not work for `opacity`; use media queries.
- Chrome pages with a CSP only load `data:` images; fetch and inline pictures.
- `display:none` on a parent hides `position: fixed` children; the status bar
  is hidden with `visibility` so the offline indicator can stay.
- Group heading rows: the tree view's click handler toggles them anywhere
  (checks `dummy` in `data-properties`).
- Removing UI usually means a pref, `hidden`, or CSS, not deleting markup:
  other code looks elements up by id.
- Do not edit `firefox/` except `widget/gtk`; it is not tracked.
- Avoid em-style fancy comments; keep comments rare (Mozilla style).

## Known gaps

- Settings page and some dialogs are not yet cards.
- Quick steps and Snooze (ribbon) do not exist.
- Real blur behind the window is not possible on GNOME from the app; only a
  compositor extension can do it.
- OAuth client IDs are still Thunderbird's.
