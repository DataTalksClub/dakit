# Changelog

All notable changes to dakit are recorded here, following Keep a Changelog.
Versions follow Semantic Versioning; while below 1.0, breaking changes may ship
in a minor version with migration notes.

## [0.2.0] - Unreleased

### Added

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

- `accent.border` and `success.border`, `warning.border`, `danger.border`,
  `info.border` roles. Replace border references with `border.default`,
  `border.control-hover`, or `border.strong`.
- Primitive color ramps from generated CSS. Use semantic roles instead;
  primitives remain available in JavaScript for the showcase.

## [0.1.0]

### Added

- Primitive and semantic tokens, light and dark themes, and a contrast-gated build.
- Shared base styles, self-hosted Inter and IBM Plex Mono, buttons, fields,
  cards, badges, tables, layout rhythm, filter chips, and dialogs.
- Dialog dismissal helper, a live showcase, and family/adoption guidance.
