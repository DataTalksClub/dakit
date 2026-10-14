# The dakit app shell

Binding contract for the shared application shell (`css/components.css`,
`js/shell.js`) and the small components it needs, used by dataops, dapier,
dataqna, relay and (next) agent-hub. It **supersedes** the "Who uses which
shell" and "Account chrome" sections of `family.md`. Where an app's local shell
disagrees with this file, the app changes.

Direction in one line: **a quiet workbench**. The sidebar is navigation and
nothing else; the two pieces of personal chrome each get one fixed seat:
notifications at the top, you at the bottom. Popovers open beside the sidebar,
never on top of it.

---

## 1. What is wrong today

Grounded in `~/tmp/agent-reports/dakit-audit.md` §5 and `docs/family-reference/`.

1. **The sidebar footer is a junk drawer.** dataops stacks a filter
   `<details>`, Help, Notifications and Account as full-width nav-styled rows
   (`frontend/index.html:96-138`), about 120px of chrome that looks like
   destinations. dapier puts a region line and a full-width Refresh button
   in the same spot. Session chrome, page actions and alerts all look like
   navigation.
2. **Popovers bury the navigation.** Account and Notifications open 360–380px
   sheets at `left: 12px; bottom: 84px`. They cover about 70% of the sidebar
   and spill more than 100px into `<main>`. They also carry a modal-style grey
   header with an `×`, so a menu reads like a dialog.
3. **The account menu is a second app.** dataops hides real destinations
   (Admin, Users) and a live export widget inside it. relay goes the other
   way: it has no account UI at all, so you can't sign out.
4. **Each app collapses differently.** dataops collapses to a 40px blank
   strip that hides notifications and account. dapier can't collapse.
   dataqna uses a 268px sidebar for two links. relay rotates the word
   "Menu" vertically.
5. **The header has template tells.** A 32px solid-accent letter block sits
   beside a two-line title ("DataOps / Daily operations workspace"), and
   the search box has its own caption. That's three lines of chrome before
   the first link.
6. **It misreports and drifts off the grid.** dataops shows a red `0`
   badge, which reads as an alarm when there's nothing to see. Every sidebar
   uses off-grid values (`5/6/9/10/14/18px`), even though the family recipe
   itself does too (`family.md` sidebar recipe).

## 2. Direction and banned list

- **Navigation column, not a dashboard.** 240px wide (down from 268). It holds
  four things in a fixed order: brand row, optional search, nav, account row.
  Nothing else can be added to it.
- **Two seats for personal chrome, chosen by how often each is used.**
  Notifications are time-sensitive and are read newest-first, so the bell
  sits in the **brand row at the top**, beside the app name, and its panel
  drops downward in list order. Account is visited about once a session, so
  it's the **single bottom row**: avatar, name, chevron. The collapse toggle
  sits beside it. Help and theme go inside the account menu, so the
  footer is one row and never grows.
- **Popovers fly out beside the sidebar, never over it.** Every shell popover
  anchors to the sidebar's outer edge (`left: <column width> + 8px`) and
  aligns with its trigger: the notification panel is top-aligned with the
  bell, the account menu bottom-aligned with the account row. The nav stays
  visible while they're open. This rule is the same for the full sidebar
  and the rail.
- **Collapse goes to a working icon rail** (56px) that keeps every
  destination, the bell and the avatar. A collapsed sidebar is never a blank
  strip.
- **Wordmark, no logo block.** The brand is the app name set in semibold
  text. A one-letter mark only appears in the rail, as a neutral tile, never
  an accent fill.
- **Data reads as data.** Counts, times, versions and regions are set in
  `--dk-font-mono` with `tabular-nums`. Controls and nav use `--dk-text-md`
  (13px).

Banned (and kept out by review):

1. Utility rows (Help, Notifications, Refresh, region, filters) in the
   sidebar.
2. Destinations, live status widgets or page filters inside the account
   menu.
3. A header bar or `×` on menus and popovers. They close on Esc, an outside
   click, or a second click on the trigger.
4. Explainer subtitles under the app name or under menu items.
5. A visible `0` count, or danger red on an ordinary unread count.
6. Solid-accent logo or letter blocks.
7. A collapsed state that hides navigation, notifications or account.
8. Popovers that overlap the sidebar column on desktop.
9. Detached stat cards with coloured dots. Use one `.dk-stat-strip`.
10. Any accent or status border, tab underline stripe, side rail or inset
    coloured shadow (AGENTS.md). Selection uses a `--dk-accent-soft` fill.
11. Off-grid spacing, inline `style=` offsets, or negative-margin tricks.

---

## 3. Scale and tokens

All values below are on the 4px grid. Token changes land in phase B through
`tokens/` (they are listed here, not edited in phase A):

| Token | Value | Change | Use |
|---|---|---|---|
| `--dk-size-sidebar` | 240px | **268 → 240** | expanded sidebar |
| `--dk-size-rail` | 56px | new | collapsed rail |
| `--dk-size-topbar` | 48px | new | mobile bar, `.dk-shell--topbar` header |
| `--dk-size-menu` | 256px | new | account menu, brand switcher |
| `--dk-size-panel` | 384px | new | notification panel |
| `--dk-size-measure` | 896px | new | queue/reading/form surfaces |
| `--dk-size-content-max` | 1120px | — | default content width |

There are no new colour roles. Everything uses existing roles and existing
contrast pairs (`accent-default` / `text-on-accent` for the count pill).

Other new classes: `.dk-skip-link`, `.dk-search`, `.dk-field-error`
(field-level error text), `.dk-skeleton` (loading block).

Fixed component dimensions (not tokens, all on the grid): row heights 32/36px,
icon 20px (nav) or 16px (menus), avatar 24/28/36px, count pill 16px tall.
Z-order: popovers 40, scrim 45, drawer 50, mobile sheets 60.

---

## 4. Layouts

### 4.1 Sidebar shell (default, ≥ 4 destinations)

```
┌─ .dk-sidebar 240 ───────┬─ .dk-main ──────────────────────────────────┐
│ DataOps            [🔔3] │  .dk-page-header                            │
│ [⌕ Search…         /]   │  Title                    [Secondary][Primary]│
│ ─────────────────────── │  .dk-tabs  (optional)                         │
│ WORKSPACE               │  .dk-stat-strip (optional)                    │
│ [▣] Home                │  .dk-toolbar                                  │
│ [▣] Tasks            12 │  one bordered work container                  │
│ [▣] Inbox               │                                               │
│ ADMIN                   │                                               │
│ [▣] Users               │                                               │
│          (scrolls)      │                                               │
│ ─────────────────────── │                                               │
│ (G) Grace           ▾ « │                                               │
└─────────────────────────┴───────────────────────────────────────────────┘
```

- `.dk-shell` sets `display: grid; grid-template-columns: var(--dk-size-sidebar) minmax(0, 1fr); height: 100dvh; background: var(--dk-bg-page);`.
  `[data-sidebar="collapsed"]` swaps the first column to `var(--dk-size-rail)`.
  The column change isn't animated: a width animation reflows the whole canvas.
- `.dk-main` is `#main-content`, with `min-width: 0; overflow-y: auto; padding: var(--dk-space-6) var(--dk-space-7);`.
  It's the only scroll container for page content.
- `.dk-main__inner` has `max-width: var(--dk-size-content-max); margin-inline: auto; display: flex; flex-direction: column; gap: var(--dk-gap-section);`.
  `.dk-main__inner--narrow` uses `--dk-size-measure`.

### 4.2 Topbar shell (`.dk-shell--topbar`, 2–3 destinations)

For tools with two or three destinations: dataqna admin (Live Q&A, Sessions)
and dapier designer. A 240px column for two links is waste.

```
┌──────────────────────────────────────────────────────────────────────┐
│ DataQnA   Live Q&A  Sessions                              [🔔] (A)    │ 48px
├──────────────────────────────────────────────────────────────────────┤
│ .dk-main                                                             │
```

- Rows: `var(--dk-size-topbar) minmax(0, 1fr)`. `.dk-shell__bar` uses
  `display: flex; align-items: center; gap: var(--dk-space-4); padding: 0 var(--dk-space-4); background: var(--dk-bg-muted); border-bottom: 1px solid var(--dk-border-default);`.
- On the left are `.dk-brand` and a `<nav aria-label="Primary">` of
  `.dk-nav-item` elements in horizontal form: auto width, 32px tall,
  `aria-current` fill.
- On the right (`margin-left: auto`) are the bell, then an avatar-only
  account trigger (`.dk-account-trigger--compact`, 32×32). Popovers drop
  below the trigger and align to the right edge: `top: calc(var(--dk-size-topbar) + var(--dk-space-1)); right: var(--dk-space-4)`.
- At ≤820px it stays a bar. Two or three links fit at 390px; if they don't,
  the link row scrolls horizontally (`.dk-shell__nav`). There's no drawer.

---

## 5. Sidebar anatomy

`.dk-sidebar` (`<aside id="dk-sidebar" aria-label="Workspace">`) is a flex
column: `background: var(--dk-bg-muted); border-right: 1px solid var(--dk-border-default); min-width: 0;`.

### 5.1 Brand row (`.dk-sidebar__head`, 48px)

`display: flex; align-items: center; gap: var(--dk-space-1); height: 48px; padding: 0 var(--dk-space-2) 0 var(--dk-space-3);`.
It has no bottom border. The search field or the nav carries on beneath it.

- `.dk-brand`: an `<a href="/">` with `flex: 1; min-width: 0;` holding
  `.dk-brand__name` (`--dk-text-body`, semibold, `--dk-text-heading`,
  ellipsis). For a short scope you can add `.dk-brand__scope` (`--dk-text-sm`,
  muted), such as relay's active client.
- **Switcher form** (relay clients, a future workspace switch): `.dk-brand`
  becomes a `<button aria-haspopup="menu">` with a 16px chevron, hover
  `--dk-bg-hover`, and radius `--dk-radius-md`. It opens a `.dk-menu`
  (`--dk-size-menu`) that's top-aligned beside the sidebar and holds
  `menuitemradio` rows. This replaces relay's "Active client" eyebrow block
  and its "Switch client" link.
- `.dk-notif-trigger`: a `.dk-icon-button` (32×32, bell 20px) at the right
  end of the row. See §7.

### 5.2 Search (`.dk-sidebar__search`, optional)

`padding: 0 var(--dk-space-2) var(--dk-space-2);`. It's a 32px command field:
`border: 1px solid var(--dk-border-default); border-radius: var(--dk-radius-md); background: var(--dk-bg-surface);`
with a 16px search icon, an input with no border, and a trailing `.dk-kbd`
`/`. There is no caption. Pressing `/` focuses it from anywhere outside a
text field.

### 5.3 Nav (`.dk-sidebar__nav`)

`<nav aria-label="Primary">` uses `flex: 1; min-height: 0; overflow-y: auto; padding: var(--dk-space-1) var(--dk-space-2) var(--dk-space-3); display: flex; flex-direction: column; gap: var(--dk-space-4);`.

- `.dk-nav-group` is a `display: grid; gap: var(--dk-space-1)` container
  labelled by its `.dk-nav-group__label` (via `aria-labelledby`). The label
  is `--dk-text-xs`, semibold, uppercase, `letter-spacing: 0.06em`,
  `--dk-text-muted` (faint text fails AA on the sidebar's `--dk-bg-muted`, so
  faint is for surfaces only), with `padding: 0 var(--dk-space-2); height: 24px;`
  aligned to the end. Use groups only with 6 or more items. Below that,
  one unlabelled group.
- `.dk-nav-item` is an `<a>` (or a `<button>` for in-app surfaces):
  `display: flex; align-items: center; gap: var(--dk-space-2); height: 32px; padding: 0 var(--dk-space-2); border: 1px solid transparent; border-radius: var(--dk-radius-md); color: var(--dk-text-primary); font-size: var(--dk-text-md); font-weight: var(--dk-weight-medium);`.
  - `__icon` is 20px, `--dk-text-muted`. `__label` takes `flex: 1` and
    ellipsis. `.dk-count` is optional at the end of the row.
  - Hover: `--dk-bg-hover`; the icon turns `--dk-text-primary`.
  - Current: `[aria-current="page"]` gets a `--dk-accent-soft` fill and
    `--dk-accent-default` text and icon. **There is no other selection
    signal.**
- Every destination appears here, including Admin and Users. There's no
  "More" menu.

### 5.4 Account row (`.dk-sidebar__foot`, 52px)

`display: flex; align-items: center; gap: var(--dk-space-1); height: 52px; padding: 0 var(--dk-space-2); border-top: 1px solid var(--dk-border-default);`.

- `.dk-account-trigger` is a `<button aria-haspopup="true" aria-expanded aria-controls="dk-account-menu">`
  with `flex: 1; min-width: 0; height: 36px; padding: 0 var(--dk-space-2); gap: var(--dk-space-2); border-radius: var(--dk-radius-md);`.
  It holds `.dk-avatar--sm` (24px), the name (`--dk-text-md`, medium,
  ellipsis) and a 16px chevron (muted). Its accessible name is
  "Account, Grace Hopper".
- `.dk-sidebar__toggle` is a 32×32 `.dk-icon-button` with a panel-left
  icon, `aria-label="Collapse sidebar"` or "Expand sidebar", and
  `aria-controls="dk-sidebar"`.
- The row contains nothing else. Region and version go in the account menu;
  Refresh goes in the page header of the page it refreshes.

### 5.5 Collapsed rail (`[data-sidebar="collapsed"]`, 56px)

The rail is the same DOM; only CSS changes. Every control is a centred
36×36 square:

```
┌──────┐
│ [D]  │ brand tile: 28px, --dk-bg-surface, 1px --dk-border-default,
│ [🔔]•│   --dk-text-heading, mono semibold initial; links home
│ [⌕]  │ search becomes an icon button that opens/focuses search
│ ──── │ groups separated by a 1px --dk-border-default divider
│ [▣]  │ nav icons; the current item keeps the accent-soft fill
│ [▣]• │ a nav count becomes an 8px --dk-accent-default dot top-right
│      │
│ ──── │
│ [»]  │ expand toggle
│ (G)  │ avatar-only account trigger
└──────┘
```

- The brand row becomes a column of brand tile and bell
  (`flex-direction: column; height: auto; padding: var(--dk-space-2) 0; gap: var(--dk-space-1)`).
  The account row becomes a column with the toggle on top
  (`height: auto; padding: var(--dk-space-2) 0`).
- The bell keeps its numeric `.dk-count` pill. Nav counts become dots.
- Labels use `.dk-visually-hidden` (they're never removed), so accessible
  names don't change. `shell.js` shows a `.dk-tooltip` beside the item on
  hover and on keyboard focus: `--dk-bg-surface`, 1px
  `--dk-border-default`, `--dk-radius-sm`, `--dk-shadow-overlay`,
  `--dk-text-sm`, and `aria-hidden="true"` because it only repeats the
  label. Don't use native `title`, which doesn't show on keyboard focus and
  appears late.
- Popovers keep the beside-the-column rule (`left: calc(var(--dk-size-rail) + var(--dk-space-2))`).

---

## 6. Account menu (`.dk-account-menu`)

A **disclosure popover**, not an ARIA `menu`. It mixes identity text, a
switch and links, which `role="menu"` can't express. It's a
`.dk-menu.dk-account-menu` with `id="dk-account-menu" hidden`. Shared
`.dk-menu` surface: `--dk-bg-surface`, 1px `--dk-border-default`,
`--dk-radius-lg`, `--dk-shadow-overlay`, `padding: var(--dk-space-1)`.

- Size and position: `width: var(--dk-size-menu); position: fixed; left: calc(<column> + var(--dk-space-2)); bottom: var(--dk-space-2);`.
  The bottom edge lines up with the account row, and the menu grows upward
  into the canvas.
- Contents, in order. Leave out any section the app doesn't have:
  1. **Identity** (`.dk-menu__identity`, not focusable): name
     (`--dk-text-md` semibold) and email (`--dk-text-sm` muted, ellipsis).
     There's no "Signed in as" eyebrow.
  2. **Scope** (dataops "Viewing work for"): a `.dk-menu__label` followed by
     `role="radiogroup"` with `.dk-menu__item[role="radio"][aria-checked]`
     rows (20px avatar, name, a check on the selected row, accent-soft
     fill).
  3. **Preferences:** a `Dark mode` row with a `.dk-switch` (the row is
     `role="switch"`, `aria-checked`, `data-dk-theme-toggle`). This is the
     app's **only** theme control.
  4. **Utilities:** `Keyboard shortcuts` with a trailing `.dk-kbd ?`;
     `Help` (a link, when the app has docs); `CLI sessions` (a link, for
     apps with device login; see `device-login.md`).
  5. **Meta** (`.dk-menu__meta`): one mono `--dk-text-xs` faint row with the
     version on the left and environment or region on the right, e.g.
     `v0.2.0 · eu-west-1`. This replaces dapier's footer status line.
  6. **Sign out:** a `.dk-menu__item--danger` row after a separator,
     `--dk-danger-text`, hover `--dk-danger-bg`. It's a `<form method="post">`
     button where the app posts logout.
- Menu rows (`.dk-menu__item`) are 32px tall, with
  `padding: 0 var(--dk-space-2)`, `--dk-radius-md`, `--dk-text-md`, a
  16px leading icon only when it helps scanning (theme, shortcuts, sign
  out), and one line each, with no subtitles.

## 7. Notifications

### 7.1 What counts

The bell is for **items that need this person to act or know now**:
assignments, replies awaited, failures on things they own. Ambient activity
belongs on the relevant page, not the bell. An app with nothing actionable
**omits the bell entirely**. dataqna and relay have no bell today. That's
correct, not a gap.

### 7.2 Trigger and count (`.dk-notif-trigger`, `.dk-count`)

- `.dk-icon-button` (32×32, 20px bell) in the brand row (§5.1), in the
  topbar (§4.2), or in the mobile bar (§10).
- `.dk-count` is a pill: `font-family: var(--dk-font-mono); font-size: var(--dk-text-xs); font-weight: var(--dk-weight-semibold); font-variant-numeric: tabular-nums; line-height: 16px; height: 16px; min-width: 16px; padding: 0 var(--dk-space-1); border-radius: var(--dk-radius-full);`.
  - On the bell it sits at `position: absolute; top: 0; right: 0;` with
    `--dk-accent-default` / `--dk-text-on-accent`. It's **never** danger.
  - On a nav item it's inline at the end of the row, `--dk-bg-hover` /
    `--dk-text-muted`. On the current item it's `--dk-bg-surface` /
    `--dk-accent-default`.
- Rules, all enforced by `setCount()`:
  - `n ≤ 0` (or missing) sets `hidden`. **A `0` is never visible.**
  - 1–99 shows exactly. 100 and above shows `99+`.
  - The count is unread items. Opening the panel **doesn't** clear it; only
    reading does.
  - The trigger's `aria-label` is "Notifications" or
    "Notifications, 3 unread". The pill itself is `aria-hidden="true"`.

### 7.3 Panel (`.dk-notif-panel`)

A non-modal `role="dialog"` with `aria-labelledby` set to its title. Its
position is `fixed; top: var(--dk-space-2); left: calc(<column> + var(--dk-space-2)); width: var(--dk-size-panel); max-height: calc(100dvh - 2 * var(--dk-space-2));`,
using the `.dk-menu` surface with `padding: 0` and a flex column.

```
┌ Notifications                       Mark all read ┐ head 44px
│ [ Unread 3 ][ All ]                              │ .dk-tabs--sm (only if > 1 page)
├──────────────────────────────────────────────────┤
│ TODAY                                            │ day label 28px, sticky
│ •  Guest reply waiting                      14m  │ unread: dot + semibold
│    Episode 42 · waiting since Tue              ✓ │ mark-read button on hover/focus
│    Sponsor invoice countersigned             3h  │ read: no dot, medium weight
│ EARLIER                                          │
│    …                                             │
├──────────────────────────────────────────────────┤
│ View all notifications                           │ foot 40px, only if a page exists
└──────────────────────────────────────────────────┘
```

- **Head** (`__head`) uses `height: 44px; padding: 0 var(--dk-space-2) 0 var(--dk-space-4); border-bottom: 1px solid var(--dk-border-default)`,
  with no grey band. The title is `h2`, `--dk-text-md`, semibold.
  "Mark all read" is a `.dk-button--secondary.dk-button--sm` that is
  `hidden` when nothing is unread. On touch the head grows to 52px so the 44px
  button keeps a 4px margin.
- **Body** (`__body`) has `overflow-y: auto`. Day labels (`Today`,
  `Yesterday`, `Earlier`) are `.dk-nav-group__label` style, sticky, on
  `--dk-bg-surface`.
- **Row** (`.dk-notif-item`): `display: grid; grid-template-columns: 8px minmax(0, 1fr) auto; column-gap: var(--dk-space-3); padding: var(--dk-space-3) var(--dk-space-4); border-top: 1px solid var(--dk-border-default);`
  (the first row and each row after a day label have no border). Hover is
  `--dk-bg-hover`.
  - Column 1 (`__marker`) is one line tall (`height: 1lh`), so the
    `.dk-dot--info` centres on the title line with no offsets. It holds the
    dot plus `<span class="dk-visually-hidden">Unread:</span>`. On read rows
    it's empty.
  - Column 2 (`__main`) holds the title link (`.dk-notif-item__link`,
    `--dk-text-md`: semibold `--dk-text-heading` when unread, medium
    `--dk-text-primary` when read) and one line of context (`__desc`,
    `--dk-text-sm` muted, ellipsis). The link's `::after` covers the whole
    row, so the row is one click target without nesting a button inside an
    `<a>`. Its focus ring is drawn on the row (`:has(:focus-visible)`).
  - Column 3 (`__side`) holds the relative time (`__time`, mono
    `--dk-text-xs` faint, `<time datetime>` with the absolute time in
    `title`). On unread rows a 24×24 **Mark read** icon button
    (`__read`, `aria-label="Mark read: <title>"`) shares the same grid cell:
    on row hover or focus-within the button replaces the time, so read and
    unread rows are the same height. On `(pointer: coarse)` both show,
    stacked.
  - Activating the row marks it read and navigates. Per-row inline actions
    aren't allowed; actions happen on the item's page.
- **States**: loading shows three skeleton rows (`--dk-bg-hover` blocks).
  Error shows a `.dk-callout--danger` inside the body with "Couldn't load
  notifications." and a Retry button. Empty (unread filter) shows a compact
  `.dk-empty` with "No unread notifications" and a "Show all" button. Empty
  (all) shows "Nothing yet."
- **Foot** (`__foot`) is 40px, with a top hairline and a link to the full
  page. It's only present when the app has a notifications or inbox page.
- **Live updates**: new arrivals update the count. One polite live region
  per shell (`#dk-live`) announces "2 new notifications", throttled to at
  most once a minute. Rows are never inserted under the reader's pointer
  while the panel is open. They wait behind a "2 new · Show" bar at the top
  of the body.

---

## 8. Page header and tabs

- `.dk-page-header` uses `display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--dk-gap-block);`
  and has no bottom border. Space and the next block separate it from the
  content.
  - `__title` is `h1`: `--dk-text-xl` (22px), semibold, `--dk-leading-tight`,
    `letter-spacing: -0.01em`. `--dk-text-page` (32px) is only for
    single-purpose views. This replaces `family.md`'s 32px default for
    operator apps.
  - `__crumb` (optional, above the title) is `--dk-text-sm` muted, made of
    links. It's for detail pages: "Tasks / T-1042".
  - `__subtitle` is optional, one line, `--dk-text-md` muted. Use it only
    when the title doesn't say it already.
  - `__actions` has `margin-left: auto`, primary last (rightmost), and at
    most one primary. **The page header is the home for page actions**
    such as Refresh, Export and New. That includes dapier's Refresh, with a
    mono `Updated 12s ago` in `--dk-text-sm` faint.
- `.dk-section-header` is a section-level copy of the page header (`h2`,
  `--dk-text-lg`).
- `.dk-tabs` (segmented, because underline stripes are banned):
  `display: inline-flex; gap: var(--dk-space-1); padding: var(--dk-space-1); background: var(--dk-bg-muted); border: 1px solid var(--dk-border-default); border-radius: var(--dk-radius-md);`.
  - `.dk-tab` is 28px (`--dk-size-control-sm`), `padding: 0 var(--dk-space-3)`,
    `--dk-radius-sm`, `--dk-text-md` medium muted, with hover
    `--dk-bg-hover`.
  - Selected: `[aria-current="page"]` (route tabs: a `<nav>` of links) or
    `[aria-selected="true"]` (`role="tablist"`, in-page panels). It follows the
    kit's single selection treatment: `--dk-accent-soft` fill, 1px
    `--dk-border-default`, `--dk-accent-default` semibold text. There's no
    underline.
  - An optional trailing `.dk-count` is allowed. `.dk-tabs--sm` is 24px.
  - Overflow: `overflow-x: auto` with no wrap. On mobile the bar spans the
    full width.

## 9. Shared components

Each one is used by at least two apps (audit §4). All use neutral 1px
borders or fill only.

| Class | Spec |
|---|---|
| `.dk-icon-button` | 32×32 (`--sm` 24×24), `--dk-radius-md`, transparent, icon `--dk-text-muted`. Hover and `[aria-expanded="true"]`: `--dk-bg-hover` + `--dk-text-primary`. It always has an `aria-label`. |
| `.dk-callout` (+ `--info/--success/--warning/--danger`) | Neutral: `--dk-bg-muted` + 1px `--dk-border-default`. Status: tinted `--dk-*-bg` fill, `--dk-*-text`, and `border-color: transparent`. `display: flex; gap: var(--dk-space-3); padding: var(--dk-space-3) var(--dk-space-4); border-radius: var(--dk-radius-md); font-size: var(--dk-text-md)`. Slots: optional 16px `__icon`, `__body` (`__title` semibold + text), `__actions` (end). `role="status"` or `role="alert"` is set by the app. |
| `.dk-stat-strip` / `.dk-stat` | One container: 1px `--dk-border-default`, `--dk-radius-md`, `--dk-bg-surface`, `overflow: hidden`, `display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr))`. Each `.dk-stat` (`padding: var(--dk-space-3) var(--dk-space-4)`, transparent) draws neutral 1px hairlines on its right and bottom edges (`box-shadow: 1px 0 0 …, 0 1px 0 …` in `--dk-border-default`). The strip clips the outer ones, so a short last row leaves plain surface. There are no negative margins and no filled gaps. `__label` is `--dk-text-sm` muted. `__value` is mono `--dk-text-xl` medium, tabular, heading colour. `__meta` is `--dk-text-xs` faint. Status is shown with a `.dk-badge` in `__meta`, never a coloured value. |
| `.dk-dl` | `display: grid; grid-template-columns: minmax(112px, max-content) minmax(0, 1fr); gap: var(--dk-space-2) var(--dk-space-4); margin: 0`. `dt` is `--dk-text-sm` muted. `dd` is `--dk-text-md`, `overflow-wrap: anywhere`, and gets `.dk-mono` for IDs, IPs and times. `--stacked` uses one column, with `dt` above `dd`. `--divided` puts a 1px hairline between pairs (`padding-block: var(--dk-space-2)`). |
| `.dk-empty` | Centred grid, `gap: var(--dk-space-2); padding: var(--dk-space-8) var(--dk-space-6)`. `__title` is `--dk-text-body` semibold heading. `__desc` is `--dk-text-md` muted, `max-width: 44ch`, and says why it's empty and what to do. `__actions`: one safe next action. No illustration. `--compact` uses `padding: var(--dk-space-6) var(--dk-space-4)`. |
| `.dk-switch` | A `button[role="switch"][aria-checked]` (or a span inside such a row). Track 32×20, `--dk-radius-full`, 1px `--dk-border-strong`, `--dk-bg-inset`. Thumb 12px `--dk-text-muted`, `margin: var(--dk-space-1)`. Checked: the track is `--dk-accent-default` with `border-color: transparent`, and the thumb is `--dk-text-on-accent` at `translateX(12px)`. `transition: 120ms` under `prefers-reduced-motion: no-preference` only. |
| `.dk-menu` | The popover surface in §6: `__item` (32px), `__item--danger`, `__label` (xs faint uppercase 24px), `__sep` (1px hairline, `margin: var(--dk-space-1) 0`), `__identity`, `__meta`. |
| `.dk-avatar` | 28px (`--xs` 20, `--sm` 24, `--lg` 36), `--dk-radius-full`, `--dk-accent-soft` fill, `--dk-accent-default` text, `--dk-text-xs` semibold sans initials (one or two), no border. `<img>` inside covers it. It's decorative (`aria-hidden`) when a name sits next to it. |
| `.dk-count` | §7.2. |
| `.dk-kbd` | Mono `--dk-text-xs`, `min-width: 20px; height: 20px; padding: 0 var(--dk-space-1)`, `--dk-bg-surface`, 1px `--dk-border-default`, `--dk-radius-sm`, `--dk-text-muted`. |
| `.dk-code-block` + `.dk-copy-button` | Block: `display: flex; align-items: flex-start; gap: var(--dk-space-3); padding: var(--dk-space-2) var(--dk-space-3); background: var(--dk-bg-inset); border: 1px solid var(--dk-border-default); border-radius: var(--dk-radius-md)`. `<pre><code>` mono `--dk-text-sm`, `flex: 1; min-width: 0; overflow-x: auto; white-space: pre`. Never truncate or ellipsize code or secrets. Use exactly `<div class="dk-code-block"><pre><code>…</code></pre><button …>Copy</button></div>`, so the code takes the free width and Copy sits at the far edge. On touch, `pre` gets `padding-block: var(--dk-space-3)`, so the first line centres on the 44px button. Copy button: `.dk-button--sm` secondary with `data-dk-copy`, labelled "Copy". On success its label reads "Copied" for 1.5s (the button width doesn't change, because `min-width` is set from the longer label) and `#dk-live` announces "Copied". On failure it reads "Press Ctrl+C" and selects the text. |
| `.dk-tooltip` | §5.5: rail labels only. |

## 10. Mobile (≤ 820px)

One decision: **the bar holds the personal chrome, the drawer holds only
navigation.**

```
┌─────────────────────────────────────┐
│ [☰]  DataOps              [🔔3] (G) │ .dk-topbar 48px
├─────────────────────────────────────┤
│ .dk-main (padding 16px)             │
```

- `.dk-shell` becomes `grid-template-columns: minmax(0, 1fr); grid-template-rows: var(--dk-size-topbar) minmax(0, 1fr);`.
  `.dk-topbar` is shown only here, with `background: var(--dk-bg-muted); border-bottom: 1px solid var(--dk-border-default); padding: 0 var(--dk-space-1);`.
  - It contains a 44×44 menu button (`aria-controls="dk-sidebar"`,
    `aria-expanded`), the app wordmark (`.dk-topbar__title`,
    `--dk-text-body` semibold, ellipsis, linking home), the 44×44 bell, and
    a 44×44 avatar-only account trigger.
  - The page title appears **once**, as the `h1` in content. The bar
    doesn't repeat it: the wordmark says which tool of the family you're
    in, the `h1` says where.
  - The bell and account trigger in the bar are the **same elements**.
    `shell.js` moves them into `.dk-topbar__end` when the viewport crosses
    820px, and back again, so ids, counts and listeners stay singular. They're
    never cloned. Without JS they stay in the drawer, whose account row then
    shows (`.dk-sidebar__foot` hides only when it's empty).
- The drawer is `.dk-sidebar` at `position: fixed; inset: 0 auto 0 0; width: min(288px, 100vw - 48px); z-index: 50; box-shadow: var(--dk-shadow-overlay); transform: translateX(-100%); visibility: hidden;`.
  `[data-drawer="open"]` slides it in (180ms; instant under reduced motion).
  While open it's a modal dialog: `shell.js` sets `role="dialog"`,
  `aria-modal="true"` and an accessible name on the `<aside>` (its own
  `aria-label`, else "Navigation"; an `aria-labelledby` is left alone). On
  close, including a resize back to desktop, it restores the original
  attributes, so the desktop sidebar is a plain `<aside>` landmark.
  It always shows labels (collapse state is ignored) and has no account row
  (it's in the bar). The brand row's bell is hidden. A 44×44 close button
  replaces the collapse toggle. `.dk-scrim` (`--dk-bg-backdrop`, z 45)
  closes it.
- Choosing a destination closes the drawer.
- Popovers become sheets under the bar: `position: fixed; top: calc(var(--dk-size-topbar) + var(--dk-space-2)); left: var(--dk-space-2); right: var(--dk-space-2); width: auto; max-height: calc(100dvh - var(--dk-size-topbar) - var(--dk-space-4));`.
- Touch: inside `@media (max-width: 820px), (pointer: coarse)`, nav items,
  menu rows, tabs and icon buttons get `min-height: var(--dk-size-touch)`.
  Icon buttons also become 44×44. `.dk-main` padding becomes
  `var(--dk-space-4)`.

## 11. Keyboard and accessibility

- **Landmarks:** `.dk-skip-link` (first focusable, visible on focus) jumps
  to `#main-content`. `<aside aria-label="Workspace">` contains
  `<nav aria-label="Primary">`, and `<main id="main-content">`. The page has
  one `h1`, inside main.
- **Current location:** use `aria-current="page"` on nav items and route
  tabs, and `aria-selected` only inside `role="tablist"`.
- **Popovers** (account, notifications, brand switcher):
  - Triggers carry `aria-expanded` and `aria-controls`. Only one popover is
    open at a time. When one opens, focus moves inside. The notification
    panel focuses its title (`tabindex="-1"`, `data-dk-autofocus`). A menu
    opened **from the keyboard** (Enter/Space on the trigger) focuses its
    first row, with a visible ring. A menu opened **with the pointer**
    focuses the menu container itself (no ring), so no row shows a ring that
    reads like a selection border. `↓` then enters the first row and `↑` the
    last.
  - `Esc`, an outside pointer-down, or clicking the trigger again closes
    it. **Focus returns to the trigger** for Esc and trigger clicks, and
    for outside clicks when focus was inside. Tab past the end closes it
    without trapping, because these are non-modal.
  - Inside `.dk-menu`, `↑`/`↓` move between rows, `Home`/`End` jump, and
    `Space` toggles the switch row. The brand switcher is a real
    `role="menu"` with full menu keys and typeahead.
- **Drawer (mobile):** it's modal. Focus is trapped (Tab wraps); `inert` is
  set on `.dk-main` and `.dk-topbar` while it's open. `Esc` or the scrim
  closes it, and focus goes back to the menu button.
- **Shortcuts:** these work only when focus isn't in a text field or
  `[contenteditable]`. `⌘B`/`Ctrl+B` collapses the sidebar (desktop). `/`
  focuses search. `?` opens keyboard help (the app supplies the dialog;
  the account menu row opens the same one). The kit defines no other
  global shortcuts.
- **Focus ring:** `outline: 3px solid var(--dk-focus-ring); outline-offset: 2px` on
  `:focus-visible`. In the rail and the menus, rows use `outline-offset: -2px`
  so the ring isn't clipped by `overflow`.
- **Motion:** everything that moves is wrapped in
  `prefers-reduced-motion: no-preference`.

## 12. Class and JS API

### 12.1 Markup skeleton

```html
<div class="dk-shell" data-app="dataops" data-sidebar="expanded">
  <a class="dk-skip-link" href="#main-content">Skip to content</a>
  <header class="dk-topbar">            <!-- mobile only -->
    <button class="dk-icon-button" data-dk-drawer-toggle aria-controls="dk-sidebar" aria-expanded="false" aria-label="Open navigation">…</button>
    <a class="dk-topbar__title" href="/">DataOps</a>
  </header>
  <aside class="dk-sidebar" id="dk-sidebar" aria-label="Workspace">
    <div class="dk-sidebar__head">
      <a class="dk-brand" href="/"><span class="dk-brand__tile" aria-hidden="true">D</span><span class="dk-brand__name">DataOps</span></a>
      <button class="dk-icon-button dk-notif-trigger" data-dk-popover-trigger="dk-notif-panel" aria-expanded="false" aria-controls="dk-notif-panel" aria-label="Notifications">…<span class="dk-count" aria-hidden="true" hidden></span></button>
    </div>
    <div class="dk-sidebar__search">…</div>
    <nav class="dk-sidebar__nav" aria-label="Primary">
      <div class="dk-nav-group" aria-labelledby="g-ws">
        <div class="dk-nav-group__label" id="g-ws">Workspace</div>
        <a class="dk-nav-item" href="/tasks" aria-current="page"><svg class="dk-nav-item__icon">…</svg><span class="dk-nav-item__label">Tasks</span><span class="dk-count">12</span></a>
      </div>
    </nav>
    <div class="dk-sidebar__foot">
      <button class="dk-account-trigger" data-dk-popover-trigger="dk-account-menu" aria-expanded="false" aria-controls="dk-account-menu">…</button>
      <button class="dk-icon-button dk-sidebar__toggle" data-dk-sidebar-toggle aria-controls="dk-sidebar" aria-label="Collapse sidebar">…</button>
    </div>
  </aside>
  <div class="dk-scrim" data-dk-drawer-close hidden></div>
  <main class="dk-main" id="main-content"><div class="dk-main__inner">…</div></main>
  <div class="dk-menu dk-account-menu" id="dk-account-menu" data-dk-popover hidden>…</div>
  <section class="dk-menu dk-notif-panel" id="dk-notif-panel" role="dialog" aria-labelledby="dk-notif-title" data-dk-popover hidden>…</section>
  <div id="dk-live" class="dk-visually-hidden" aria-live="polite"></div>
</div>
```

Popovers are siblings of the sidebar, not children, so `overflow` on the
nav never clips them. Other markup hooks: `.dk-topbar__end` (the mobile slot
the triggers move into), `.dk-sidebar__close` (drawer close, shown only on
mobile), `.dk-search` + `.dk-search__rail[data-dk-search-expand]` (the field,
and its icon form in the rail). `data-dk-autofocus` marks the element a
popover focuses on open, and `data-dk-count="n"` on a `.dk-count` is applied
through `setCount` at init. Leave `data-app` off a demo or test shell and the
collapse state isn't persisted. The full working markup is
`showcase-shell.html`.

### 12.2 `js/shell.js` → `dist/shell.js`

The file is a classic script with an idempotent global guard, like
`dialogs.js`. Load it once at the end of `<body>` (or `import "dakit/dist/shell.js"`
for its side effects). Listeners are delegated on `document`, so markup added
later works without re-init.

| Attribute | Behaviour |
|---|---|
| `.dk-shell[data-app]` | Namespaces the persisted collapse state: `localStorage["dk-sidebar:<app>"] = "collapsed" \| "expanded"`. It's applied on init. Apps can also set `data-sidebar` server-side. |
| `[data-dk-sidebar-toggle]` | Toggles `data-sidebar`, updates the label and `aria-expanded`, persists the state. |
| `[data-dk-drawer-toggle]` / `[data-dk-drawer-close]` | Mobile drawer: scrim, `inert`, focus trap, Esc, focus return. A nav link click closes it. |
| `[data-dk-popover-trigger="<id>"]` + `[data-dk-popover]` | Open, close, single-open rule, outside click, Esc, focus in and return, closing on Tab-out, arrow keys in `.dk-menu`. Position comes from CSS (expanded, rail, topbar, mobile). |
| `[data-dk-theme-toggle]` | Flips `html[data-theme]`, syncs `aria-checked`, persists `localStorage["dakit-theme"]` (the README boot-script key). |
| `[data-dk-copy="<selector>"]` | Copies the target's `textContent` (or the nearest `.dk-code-block code`), handles the label swap and the live announcement. |
| `[data-dk-search-expand]` | In the rail: expands the sidebar and focuses `.dk-search input`. |
| `.dk-nav-item` and rail controls | Tooltip on hover and keyboard focus while collapsed. |
| `?` key | Dispatches `dk:shortcuts` on `document`. The app opens its own help dialog. |

Every storage access is wrapped in `try/catch`. Blocked storage means the
defaults are used, never an exception.

```js
dakitShell.initShell(root = document);                 // runs automatically; call again for a new shell root
dakitShell.setSidebar(shell, "collapsed" | "expanded");
dakitShell.toggleDrawer(shell, open?);
dakitShell.openPopover(id, { trigger }?);
dakitShell.closePopovers({ restoreFocus = true }?);
dakitShell.setCount(countEl, n);                        // hidden at ≤0, 99+, updates the owner's aria-label
dakitShell.announce(message);                           // #dk-live; the caller applies the §7.3 throttle
```

`setCount` updates the owning trigger's `aria-label` from
`data-dk-count-label` ("Notifications"), producing "Notifications" or
"Notifications, 3 unread". Notification data, fetching and read state stay
in the app. The kit owns the chrome only.

## 13. Per-app migration (summary)

| App | Shell | Moves |
|---|---|---|
| dataops | sidebar | Admin and Users go into the nav (Admin group). The export widget goes to Knowledge. The filters `<details>` go to that page's `.dk-toolbar`. Help goes to the account menu. The bell moves to the brand row. |
| dapier | sidebar (+ topbar for designer) | Refresh and "Updated" go to the page header. The region goes to the account menu meta. Collapse is added. Lucide is replaced by the inline 24-grid set. |
| dataqna admin | **topbar** | Two links go in the bar. The avatar-only account trigger goes on the right. No bell. |
| relay | sidebar | The 52px top bar is removed. The client context becomes the brand switcher. Clients, API docs and Admin go into the nav. An account menu with **sign out** is added. The theme button goes into the account menu. The mobile drawer replaces the stacked grid. |
| agent-hub | sidebar | Adopts it as-is. |

`family.md` is updated in phase B to point here and to drop its sidebar
recipe.
