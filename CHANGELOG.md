# Changelog

All notable changes to dakit are recorded here, following Keep a Changelog.
Versions follow Semantic Versioning; while below 1.0, breaking changes may ship
in a minor version with migration notes.

## [0.2.0] - Unreleased

### Added

- Shared zero-dependency sync tool with font URL rewriting and a SHA-256 lock
  for drift checks that work without the dakit checkout.
- Border checker CLI and build enforcement of neutral borders.
- Cascade layers `dk.base` and `dk.components` in the built bundle.
- Version and source commit stamps in every built file, plus JavaScript metadata exports.

### Changed

- Accent borders are forbidden. Use neutral borders, tinted status fills, and
  text or badges; keyboard focus outlines remain the sole exception.
- Token files use W3C DTCG 2025.10 `$value`, `$type`, and `$description` syntax.
- Native `color-scheme` is included for token-only consumers.

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
