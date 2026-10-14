# Adoption maps

How each existing project maps onto dakit. Two adoption strategies are used:

- **Alias** (dataops, relay): the project's tokens already mean the same
  roles — point the old variables at the dakit tokens and migrate components
  gradually.
- **Remap** (dapier, dataqna): the project's look deliberately changes in a
  few places (accent hue, surface tint, radius). The tables below name every
  change so nothing shifts silently.

dataops' look is the canonical reference (decided 2026-10-02): dakit's
tokens are that look, pinned byte-for-byte by dataops' drift-guard test.
Apps may add product roles that compose dakit roles (hero bands, QR
plates) and may keep a density exception for their medium (dataqna's 16px
phone body, dapier designer's dense canvas), but must not layer private
palette or ink choices on top of the system.

## The pattern

```css
/* 1. ship dakit with the app */
@import "dakit/dist/dakit.css";

/* 2. compat shim: old names keep working, now defined by dakit */
:root {
  --surface-muted: var(--dk-bg-muted);
  --text-muted: var(--dk-text-muted);
  /* …the relevant rows of the table below… */
}

/* 3. migrate components to --dk-* directly, then delete the shim */
```

## dataops → dakit (alias)

| dataops | dakit | note |
|---|---|---|
| `--page-bg` / `--surface-bg` | `--dk-bg-page` / `--dk-bg-surface` | same value |
| `--surface-muted`, `--surface-hover` | `--dk-bg-muted`, `--dk-bg-hover` | same values |
| `--border-muted`, `--border-strong` | `--dk-border-default`, `--dk-border-strong` | same values |
| `--text-primary/heading/muted/faint` | `--dk-text-*` | same values |
| `--link-color`, `--link-hover` | `--dk-text-link`, `--dk-text-link-hover` | same values |
| `--accent`, `--accent-hover`, `--accent-soft` | `--dk-accent-*` | same values |
| `--success-*`, `--warning-*`, `--danger-*`, `--info-*` | `--dk-success-*` etc. | text and bg pairs (badges are fill-only; accent borders forbidden) |
| `--focus-ring` | `--dk-focus-ring` | same value |
| `--font-sans`, `--font-mono` | `--dk-font-sans`, `--dk-font-mono` | same stacks |
| `--radius` (6px) | `--dk-radius-md` | same value |
| `--do-text-*`, `--do-space-*` | `--dk-text-*`, `--dk-space-*` | same scales |
| `--do-density-control` (34px) | `--dk-size-control-md` | same value |
| `--control-hover-border` | `--dk-border-control-hover` | promoted 2026-10-02 — equal to `border-default` in light, visibly stronger in dark |

## relay / datamailer → dakit (alias)

`--dm-color-text` → `--dk-text-primary`, `--dm-color-muted` →
`--dk-text-muted`, `--dm-color-faint` → `--dk-text-faint`,
`--dm-color-border(-strong)` → `--dk-border-*`, `--dm-color-background` →
`--dk-bg-page`, `--dm-color-surface(-strong)` → `--dk-bg-muted`/`--dk-bg-hover`,
`--dm-color-primary(-hover)` → `--dk-accent-*`, `--dm-color-link(-hover)` →
`--dk-text-link(-hover)`, `--dm-color-{success,warning,danger}` pairs →
`--dk-{status}-*`, `--dm-color-focus` → `--dk-focus-ring`,
`--dm-color-danger-hover` → `--dk-danger-hover` (a role dakit gained for
relay's solid danger buttons). Relay's CSS header
already says "follows the DataOps design system" — dakit is that system,
extracted; values are unchanged.

## dapier → dakit (remap)

Structure maps cleanly; the visual changes are deliberate (see below).

| dapier | dakit | change |
|---|---|---|
| `--paper`, `--surface` | `--dk-bg-page`, `--dk-bg-surface` | warm paper → white (dark: green-black → neutral #0d1117) |
| `--ink`, `--ink-soft` | `--dk-text-primary` | neutral ink |
| `--muted` | `--dk-text-muted` | same role |
| `--line`, `--line-strong` | `--dk-border-default`, `--dk-border-strong` | same roles |
| `--accent` (green #0b6745) | `--dk-accent-default` (blue #315f8f) | **hue changes** — one accent across all tools |
| `--accent-soft/line` | `--dk-accent-soft` | follows the hue (border stays neutral) |
| `--red`, `--red-soft/line` | `--dk-danger-text/bg` | text and bg (border stays neutral) |
| `--run-text`, `--run-dot` (rust = running) | `--dk-info-*` | running is "in progress" = info, not danger-adjacent rust |
| `--ok-dot` | `--dk-success-text` (as dot) | same idea |
| `--wash`, `--wash-soft/faint` | `--dk-bg-muted`, `--dk-bg-hover`, `--dk-bg-inset` | same washes, neutral |
| `--code-bg` | `--dk-bg-inset` | same role |
| `--rail*` (dark sidebar) | `--dk-bg-muted` + `--dk-text-*` | dark rail → light sidebar, matching dataops/relay |
| `--selection` | `--dk-selection` | follows the hue |
| `--dialog-shadow` (4px 4px 0) | `--dk-shadow-overlay` | hard offset → soft elevation |

Also deliberate: IBM Plex Sans → **Inter** (mono stays IBM Plex Mono, so data
keeps its voice), 0 radius → `radius-sm/md` (4/6px), button height 38 →
`control-md` 34, body 13.5px → 14px. The designer SPA
(`designer/src`) dresses itself entirely in dakit tokens but keeps its own
canvas density — 13.5px body, 40px primary buttons — a dense-tool
exception like dataqna's phone body, not a palette divergence.

## dataqna → dakit (remap)

| dataqna | dakit | change |
|---|---|---|
| `--slate-*` ramp | semantic `--dk-bg-*`, `--dk-text-*`, `--dk-border-*` | replace palette references with roles; primitive ramps are not shipped |
| `--navy-*` dark surfaces | `--dk-bg-*` dark values | navy → neutral dark |
| `--blurple-*` accent | `--dk-accent-*` | **hue changes** blurple → blue |
| `--bg`, `--text-*`, `--accent` semantics | `--dk-bg-*`, `--dk-text-*`, `--dk-accent-*` | same architecture, already the dakit model |
| rem-based type scale | `--dk-text-*` px scale | aligns with the ops tools |

dataqna's build already follows the primitives → semantic → components
architecture and checks AA numerically; adopting dakit is mostly swapping the
primitive values and joining the shared contrast pair list.

2026-10-02: fills converged to dakit's primary-button pairing
(`--dk-text-on-accent` on `--dk-accent-default`, `--dk-accent-hover` on
hover), pinned by equality in dataqna's theme tests — the dark deep-fill
divergence is gone. That orphaned dakit's `accent.deep-hover` role (built
for these fills); it has no consumers left.

## Sequencing

1. Import `dist/dakit.css`, add the theme boot script, add the compat shim,
   and load `dist/dialogs.js` for the shared dialog dismissal.
2. Migrate components file-by-file to `--dk-*` / `.dk-*`, screenshots in both
   themes.
3. Delete the shim and the dead variables; drop any font files the app no
   longer needs (dakit self-hosts).

## Border enforcement (scripts/check-borders.mjs)

Accent borders are forbidden across all projects consuming dakit. A consuming site runs the border checker as part of its CI / test suite:

```bash
node node_modules/dakit/scripts/check-borders.mjs <paths...>
```

Or when running from the dakit checkout:

```bash
node scripts/check-borders.mjs <paths...>
```

The checker is a zero-dependency CLI that scans `.css` files, plus `<style>` blocks and `style=""` attributes in `.html`, `.vue`, `.svelte`, `.jsx`, `.tsx`, and `.js` template strings (best effort, skipping `node_modules`, `dist`, `.git`, and vendored dakit dirs).

It fails (exit 1, printing `file:line: reason`) on:
- Any border or outline property whose color is not neutral: any `var(--dk-*)` other than neutral border roles (`--dk-border-default`, `--dk-border-control-hover`, `--dk-border-strong`); any removed role (`--dk-accent-border`, `--dk-*-border`); or any literal color with noticeable chroma (HSL saturation > 18% and chroma delta > 25; grays, slates, transparent, and `currentColor` in neutral contexts pass).
- Site-local custom properties: definitions in scanned files are collected and resolved to judge the resolved values.
- Single-side borders or border-widths (`border-left`, `border-top`, etc.) that are wider than 1px or colored (neutral 1px dividers pass).
- Inset box shadows: any `box-shadow` with `inset` that has a colored value or is used as an edge stripe (e.g. `inset Npx 0 0`).
- Colored outlines outside `:focus` / `:focus-visible` rules (keyboard focus indicators with `--dk-focus-ring` on `:focus-visible` pass).

## Cascade layers

The built `dist/dakit.css` declares `@layer dk.base, dk.components;` and wraps
base styles and shared components in those layers. Tokens stay unlayered.
Unlayered app CSS always wins over normal dakit declarations, regardless of
selector specificity. Put product overrides in ordinary app CSS; there is no
need to increase specificity or add `!important`. If an app uses its own
layers, declare its layer after `dk.components`.

## Versioning and deprecation

Every `dist/` file starts with `/* dakit <version> <git short sha> */`.
`tokens.js` exports `version` and `commit`; the plain-global build exposes the
same metadata on `dakitTokens`. The commit identifies the last commit touching
build inputs (`tokens/`, `css/`, `js/`, `fonts/`, `build.mjs`, or `package.json`).
Documentation-only and generated-output commits do not change this stamp, so
rebuilding after those commits leaves `dist/` unchanged.
The package version may describe an unreleased entry until the release is tagged.

When renaming a token, retain the old name as an alias for one minor version and
mark it with DTCG `$deprecated: "Use <replacement>"`. Document the replacement
in the changelog and remove the alias in the following minor while below 1.0
(or the next major after 1.0). Removing a role or class and changing its meaning
requires a migration note. The 0.2.0 accent-border removal is immediate policy
enforcement: migrate those roles to neutral borders when updating.

## Vendoring and drift checks

Replace each app's `scripts/sync_dakit.sh` copy/sed logic with a single command
(point `--dest` at the app's chosen vendored directory):

```bash
node "$HOME/git/dakit/scripts/sync.mjs" --dest path/to/vendor/dakit
```

The destination contains the dist files directly (`dakit.css`, `tokens.css`,
`tokens.js`, etc.), a `fonts/` directory with the license, `check-borders.mjs`,
`sync.mjs`, and `dakit.lock.json`. CSS font URLs are rewritten from
`../fonts/` to `./fonts/` for this flat layout. Update app imports to match.
The bundle already includes tokens; apps loading it do not need `tokens.css`
as a second stylesheet. Sync builds from `dist/`, so run the dakit build first.

Token-only consumers can select files; names may be space- or comma-separated:

```bash
node "$HOME/git/dakit/scripts/sync.mjs" --dest path/to/vendor/dakit --files tokens.css tokens.js
node "$HOME/git/dakit/scripts/sync.mjs" --dest path/to/vendor/dakit --files dakit.css dialogs.js --fonts-dir assets/fonts
```

`--fonts-dir` chooses a font directory inside the destination. Fonts, license,
and both tools are always included. No app-specific source CSS copies or `sed`
steps are needed. The lock records the built version and source commit plus
SHA-256 checksums of the delivered bytes, including rewritten CSS and tools.

Run the vendored tool in app CI without a sibling dakit checkout:

```bash
node path/to/vendor/dakit/sync.mjs --check --dest path/to/vendor/dakit
node path/to/vendor/dakit/check-borders.mjs path/to/app/styles
```

`--check` exits nonzero for changed or missing locked files. It verifies the
recorded snapshot, not whether a newer release exists; commit the lock with
vendored files and review both when upgrading. Additional app-owned files in
the destination are ignored. A vendored tool supports checking; updating
requires running the tool from the dakit checkout.

## Showcase screenshots

After building, capture the live showcase in light and dark at desktop 1440px
and mobile 390px. The script waits for fonts and fails on page or resource errors:

```bash
node scripts/shots.mjs
node scripts/shots.mjs --out /tmp/dakit-review
```

The default output is `~/tmp/agent-reports/dakit-showcase/`, with four full-page
PNGs named by theme, viewport, and width. It uses an existing Playwright install
(local resolution first, then `~/git/dataops/node_modules/playwright`); set
`PLAYWRIGHT_MODULE` to a module path for another install. Chromium must already
be available to that install. Dakit adds no browser dependency. These captures
are review artifacts, not automated comparisons against committed baselines.
