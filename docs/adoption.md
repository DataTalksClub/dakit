# Adoption maps

How each existing project maps onto dakit. Two adoption strategies are used:

- **Alias** (dataops, relay): the project's tokens already mean the same
  roles — point the old variables at the dakit tokens and migrate components
  gradually.
- **Remap** (dapier, dataqna): the project's look deliberately changes in a
  few places (accent hue, surface tint, radius). The tables below name every
  change so nothing shifts silently.

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
| `--success-*`, `--warning-*`, `--danger-*`, `--info-*` | `--dk-success-*` etc. | same triplets |
| `--focus-ring` | `--dk-focus-ring` | same value |
| `--font-sans`, `--font-mono` | `--dk-font-sans`, `--dk-font-mono` | same stacks |
| `--radius` (6px) | `--dk-radius-md` | same value |
| `--do-text-*`, `--do-space-*` | `--dk-text-*`, `--dk-space-*` | same scales |
| `--do-density-control` (34px) | `--dk-size-control-md` | same value |

## relay / datamailer → dakit (alias)

`--dm-color-text` → `--dk-text-primary`, `--dm-color-muted` →
`--dk-text-muted`, `--dm-color-faint` → `--dk-text-faint`,
`--dm-color-border(-strong)` → `--dk-border-*`, `--dm-color-background` →
`--dk-bg-page`, `--dm-color-surface(-strong)` → `--dk-bg-muted`/`--dk-bg-hover`,
`--dm-color-primary(-hover)` → `--dk-accent-*`, `--dm-color-link(-hover)` →
`--dk-text-link(-hover)`, `--dm-color-{success,warning,danger}` triplets →
`--dk-{status}-*`, `--dm-color-focus` → `--dk-focus-ring`. Relay's CSS header
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
| `--accent-soft/line` | `--dk-accent-soft/border` | follows the hue |
| `--red`, `--red-soft/line` | `--dk-danger-text/bg/border` | same role |
| `--run-text`, `--run-dot` (rust = running) | `--dk-info-*` | running is "in progress" = info, not danger-adjacent rust |
| `--ok-dot` | `--dk-success-text` (as dot) | same idea |
| `--wash`, `--wash-soft/faint` | `--dk-bg-muted`, `--dk-bg-hover`, `--dk-bg-inset` | same washes, neutral |
| `--code-bg` | `--dk-bg-inset` | same role |
| `--rail*` (dark sidebar) | `--dk-bg-muted` + `--dk-text-*` | dark rail → light sidebar, matching dataops/relay |
| `--selection` | `--dk-selection` | follows the hue |
| `--dialog-shadow` (4px 4px 0) | `--dk-shadow-overlay` | hard offset → soft elevation |

Also deliberate: IBM Plex Sans → **Inter** (mono stays IBM Plex Mono, so data
keeps its voice), 0 radius → `radius-sm/md` (4/6px), button height 38 →
`control-md` 34, body 13.5px → 14px.

## dataqna → dakit (remap)

| dataqna | dakit | change |
|---|---|---|
| `--slate-*` ramp | `--dk-gray-*` | same structure |
| `--navy-*` dark surfaces | `--dk-bg-*` dark values | navy → neutral dark |
| `--blurple-*` accent | `--dk-accent-*` | **hue changes** blurple → blue |
| `--bg`, `--text-*`, `--accent` semantics | `--dk-bg-*`, `--dk-text-*`, `--dk-accent-*` | same architecture, already the dakit model |
| rem-based type scale | `--dk-text-*` px scale | aligns with the ops tools |

dataqna's build already follows the primitives → semantic → components
architecture and checks AA numerically; adopting dakit is mostly swapping the
primitive values and joining the shared contrast pair list.

## Sequencing

1. Import `dist/dakit.css`, add the theme boot script, add the compat shim.
2. Migrate components file-by-file to `--dk-*` / `.dk-*`, screenshots in both
   themes.
3. Delete the shim and the dead variables; drop any font files the app no
   longer needs (dakit self-hosts).
