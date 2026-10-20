# Design rules for Wyrm Mail

Derived from the screenshots in this folder (see SOURCES.md). We borrow the
structure, shape language and density, not the references' colors or assets.
Wyrm's Dragon Blue palette (`in/dragon-email-colors.md`) stays; these rules
decide shape, spacing and layout.

## 1. Window and layout

- One window, rounded corners all around, soft drop shadow.
- Top bar: window controls at the left, a wide centered rounded search field,
  small utility icons at the right (feedback, notifications).
- Under the top bar, a command row: primary **New Mail** button on the far
  left, then flat text+icon actions (Delete, Archive, Move, Flag, Mark as
  Unread, Sync, "..."), and a right-aligned assistant/panel toggle.
- Below that, panes left to right:
  1. Narrow **app rail** (round icon buttons: mail, calendar, people, tasks,
     apps, add).
  2. **Folder pane** (Favorites, then per-account trees).
  3. **Message list**.
  4. **Reading pane**, a white card.
  5. Optional **side panel** (calendar, assistant) that slides in.
- The window background shows between panes: panes read as separate cards,
  not one slab divided by lines.

## 2. Shape language

- Everything is rounded; nothing is square. Use the tokens, never raw px:

| Element | Token (colors.css) | Value |
|---|---|---|
| Window, large cards, reading pane, panels | `--border-radius-large` / `--card-border-radius` | 14px |
| Popovers, menus, dialogs | `--panel-border-radius`, `--popup-border-radius` | 12px |
| Buttons, inputs, search, selected rows | `--button-border-radius`, `--input-text-border-radius` | 8px |
| Menu items, small chips | `--border-radius-small` | 6px |
| Avatars, rail buttons, badges, toggle pills | `--border-radius-circle` | 9999px |

- Selected rows, folder highlights and tab pills are rounded rectangles that
  sit inset from the pane edge, never edge-to-edge bars.
- Segmented controls (Focused / Other) are full pills with the active segment
  filled.

## 3. Color and surfaces

- Light: white reading pane and message list on a very pale tinted
  window/sidebar background. Dark: near-black panes on a slightly lighter or
  tinted window, not pure black.
- Primary action (New Mail, Send, Continue) is a solid accent-filled rounded
  button with white text and a leading icon. Everything else is flat: no
  fill or border until hover.
- Accent is used sparingly: primary button, selected folder, unread subject
  line and dot, links, active segment. Unread = accent-colored subject plus
  a small accent dot left of the avatar.
- Selected message row: light accent tint, rounded, with a darker tint when
  the list is focused.
- Hairline separators (1px, low contrast) between list sections only; cards
  and panes are separated by gap, not borders.

## 4. Lists and typography

- Message row: circular avatar (initials fallback on a tinted circle), then
  sender (semibold), subject (accent if unread), 1-line preview (secondary
  color), time at the right in secondary color.
- Date group headers ("Today", "Yesterday") are small, secondary color, no
  background.
- Counts (unread) are plain secondary numbers right-aligned in the folder
  row, not filled badges.
- System font stack, sizes about 13px body, 12px secondary, 15-16px for
  reading-pane titles. Weight (semibold) carries hierarchy more than size.

## 5. Icons

- Outline icons, about 1.5px stroke, rounded caps and joins, one consistent
  set. Filled variant only for the active state (the current rail icon).
- Rail icons are circular buttons; the active one gets a tinted circle
  background.

## 6. Reading pane

- White card with generous inner padding. Title row: subject, then an inline
  rounded action chip (e.g. Summarize).
- Header: avatar, sender, "To:" line in secondary color, reply / reply all /
  forward icon buttons and timestamp at the right.
- Body in comfortable line height; footer and signature in normal flow.

## 7. Popovers and dialogs

- Large rounded card with soft shadow, anchored to the trigger with a small
  pointer when it comes from the rail.
- Inside, content is grouped in rounded sub-cards (e.g. account groups), each
  with an icon in a tinted circle, a title, a secondary line and a chevron.
- Primary row of a popover can be a solid accent header with a checkmark for
  the active choice.

## 8. Theming

- Three looks are supported: light, dark, and a tinted/photo "background"
  theme where pane backgrounds go translucent. Build every surface from
  tokens so a theme can swap them; no hard-coded colors in component CSS.
- Light and dark must both be checked for every change.

## 9. Motion and feedback

- Hover: subtle tinted rounded background, no border.
- Focus ring: accent, following the element's radius.
- Side panels and popovers fade/slide in; keep it short (150-200ms) and
  respect reduced motion.

## 10. Checklist for any new screen

- [ ] No square corners (buttons, inputs, cards, menus, dialogs, list selection).
- [ ] Panes are cards with a gutter, not borderless slabs split by lines.
- [ ] One solid primary button per view; the rest flat.
- [ ] Radii come from the tokens above.
- [ ] Looks right in light and dark.
- [ ] Icons are outline, rounded, one set.

## 11. Known gaps in Wyrm Mail today

- The sign-in / account hub screen (`accountHub.css`) still has square
  corners on the card, inputs and buttons.
- Toolbar buttons, the app rail ("spaces toolbar") and the search field are
  not yet rounded or inset.
- No window-level rounding or shadow beyond what GNOME provides.
