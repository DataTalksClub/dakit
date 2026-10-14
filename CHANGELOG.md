# Changelog

All notable changes to dakit are recorded here, following Keep a Changelog.
Versions follow Semantic Versioning; while below 1.0, breaking changes may ship
in a minor version with migration notes.

## [0.2.0] - Unreleased

### Added

- Principle 4, "No vanity metrics" (`docs/principles.md`, guidelines
  "Counts and metrics"): working screens show the actionable list, not stat
  strips/KPI tiles/count bars restating it; at most one inline actionable
  count in a heading or button; a count is said once (no header count +
  "N shown" + tile). `.dk-stat-strip` stays only for performance/analytics
  views (e.g. campaign opens, clicks, CTR), each figure with a comparison or
  trend. Showcase demos updated: the task list and Live Q&A lose their
  strips; the component demo is now an issue's performance with deltas.
  Later principles renumber to 5–8.
- Segmented control standard (`docs/segmented.md`, `dist/tabs.js`):
  `.dk-tabs` is the one look for every view switcher and list filter — a
  rounded track, the selected segment in the kit selection (accent-soft fill,
  neutral border, accent semibold text), idle segments plain text, a
  trailing `.dk-count` rendered pill-less in mono. Semantics by job:
  `<nav>`+`aria-current` for routes, `role="tablist"` for in-page views,
  `role="radiogroup"` + `aria-checked` for a single-choice filter,
  `aria-pressed` for combinable toggles (all four render the selected
  state). `dist/tabs.js` (`globalThis.dakitTabs`) adds roving tabindex,
  ←/→/↑/↓/Home/End with automatic activation via `.click()`, disabled-skip,
  RTL, focus that follows a re-rendered track, and keeps the choice
  scrolled into view. Default (28px) and `--sm` (24px) sizes, 44px on
  touch; overflow scrolls inside the track with neutral edge shadows and
  never wraps. New tokens `tabs.{track,text,hover,hover-text,selected,
  selected-text,count,disabled-text,focus,radius,radius-item,pad,gap,height,
  height-sm,pad-x,pad-x-sm}` (both themes, contrast-checked). Showcase
  section `#segmented`.

- Load before open (`docs/dialog-loading.md`): a dialog that needs data
  never opens half-loaded. `dakitDialogs.openWhenReady(trigger, load, render,
  options)` in `dist/dialogs.js` keeps the trigger busy (`aria-busy`, same
  size, spinner after `--dk-loading-delay-busy`), swallows double clicks,
  shows the `.dk-loading` overlay (dialog backdrop + centred spinner) past
  `--dk-loading-delay-overlay` or at once for row/card triggers, cancels on
  Escape, backdrop click or a newer trigger (`AbortSignal`), opens the dialog
  only with its content in place, and on failure opens nothing and shows a
  `.dk-toast--danger` with Retry (or `onError`). New `.dk-spinner`
  (`--lg`), busy `.dk-button`/`.dk-icon-button`, `.dk-loading`, `.dk-toast`;
  tokens `spinner.{size,size-lg,stroke,color,track,duration}` and
  `loading.{delay-busy,delay-overlay}` (both themes; the ring stands still
  under reduced motion). Showcase section `#loading`.
- List–detail split `.dk-split` (`docs/list-detail.md`, `dist/split.js`,
  `showcase-split.html`): list and detail panes fill the content area and
  scroll independently (the page doesn't), header bands stay put, selection
  is the accent-soft fill + accent name, URL-driven one-pane-at-a-time phone
  layout with Back, ↑/↓/Home/End in the list, focus that follows the visible
  pane, optional persisted resize grip. New token `--dk-size-split-list`
  (320px); `.dk-fill` carries the height through app wrappers.
- Shared zero-dependency sync tool with font URL rewriting and a SHA-256 lock
  for drift checks that work without the dakit checkout.
- Playwright showcase screenshot script for both themes at desktop and mobile sizes.
- Border checker CLI and build enforcement of neutral borders.
- Cascade layers `dk.base` and `dk.components` in the built bundle.
- Version and source commit stamps in every built file, plus JavaScript metadata exports.
- App shell (`css/shell.css`, `dist/shell.js`; contract in `docs/shell.md`):
  240px sidebar that collapses to a 56px icon rail with tooltips, topbar
  variant for 2–3 destinations, mobile bar + modal drawer, account menu,
  notification bell and panel (hidden at 0, `99+`), popovers that open beside
  the sidebar, ⌘/Ctrl+B and `/` shortcuts.
- Shared components: `dk-icon-button`, `dk-count`, `dk-kbd`, `dk-avatar`,
  `dk-callout`, `dk-page-header`, `dk-section-header`, `dk-tabs`,
  `dk-stat-strip`, `dk-dl`, `dk-empty`, `dk-switch`, `dk-menu`,
  `dk-code-block` + `data-dk-copy`, `dk-field-error`, `dk-skeleton`, `dk-skip-link`.
- Mobile bar shows the app wordmark (`a.dk-topbar__title`, home link); the page
  title appears once, as the content `h1`.
- Touch: 44px hit areas for the device-login identity and footer links;
  the code-block's first line centres on the 44px Copy button.
- Device login: the code query parameter is the app's wire-protocol name
  (`code` by default, DataOps keeps `userCode`), with no alias.
- Device login (`docs/device-login.md`): `dk-auth-page`, `dk-auth-card`,
  `dk-code-input`, and `dist/device-code.js` (`normalizeUserCode`,
  `formatUserCode`, `describeUserCodeError`, `bindCodeInput`).
- Size tokens `size.rail` (56), `size.topbar` (48), `size.menu` (256),
  `size.panel` (384), `size.measure` (896); contrast pairs for text on
  `bg.muted`/`bg.hover`.
- `showcase-shell.html` and `showcase-device.html`.

### Changed

- Accent borders are forbidden. Use neutral borders, tinted status fills, and
  text or badges; keyboard focus outlines remain the sole exception.
- Token files use W3C DTCG 2025.10 `$value`, `$type`, and `$description` syntax.
- Native `color-scheme` is included for token-only consumers.
- `size.sidebar` is 240px (was 268px).
- The app shell recipe and account chrome in `docs/family.md` are superseded
  by `docs/shell.md`: no utility rows in the sidebar, the bell sits in the
  brand row, the account is the single bottom row, and collapse goes to an
  icon rail instead of a blank strip. Operator page titles are 22px.

### Removed

- `.dk-filter-chip` and `.dk-filter-chip__count`: separate pill buttons were
  a second look for the job the segmented control does. Replace a chip row
  with `<div class="dk-tabs" role="radiogroup" aria-label="…">` of
  `<button class="dk-tab" role="radio" aria-checked>` (or keep
  `aria-pressed` for true multi-select), and the count with `.dk-count`.

- `accent.border` and `success.border`, `warning.border`, `danger.border`,
  `info.border` roles. Replace border references with `border.default`,
  `border.control-hover`, or `border.strong`.
- Primitive color ramps from generated CSS. Use semantic roles instead;
  primitives remain available in JavaScript for the showcase.

### Fixed

- A busy `.dk-button` / `.dk-icon-button` whose label sits in a child
  element (`<span>`, icon + text) kept its accessible name only until the
  spinner showed: children were hidden with `visibility: hidden`, which
  removed them from the accessibility tree, so `getByRole('button', { name })`
  stopped resolving. Children now fade to `opacity: 0`; the name, size and
  focus are unchanged while busy. Behaviour test covers bare text, icon +
  `<span>`, and `aria-label` icon buttons.
- A `.dk-tabs` placed directly in a `.dk-dialog__head` stays one row: the
  head's stacking rule for its title block no longer applies to the track.

- The build resolves a role that aliases another role (`{accent.default}`)
  regardless of the order the roles were visited in.

## [0.1.0]

### Added

- Primitive and semantic tokens, light and dark themes, and a contrast-gated build.
- Shared base styles, self-hosted Inter and IBM Plex Mono, buttons, fields,
  cards, badges, tables, layout rhythm, filter chips, and dialogs.
- Dialog dismissal helper, a live showcase, and family/adoption guidance.
