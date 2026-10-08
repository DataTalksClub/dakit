# Usage guidelines

How to use the tokens well. The token files say what exists; this says when
and why. Examples use the `.dk-*` components from `css/components.css`.

## Layout & spacing

- The 4px grid (`--dk-space-*`) is the only spacing. Inside cards: `space-4`.
  Between cards/sections: `space-4` to `space-6`. Page gutter: `space-6`.
- Page content maxes out at `--dk-size-content-max` and centers; dense
  operational screens may use the full width when the data needs it.
- Sidebars use `--dk-size-sidebar`. Control heights: `sm` 28 (toolbars, table
  rows), `md` 34 (default), `lg` 40 (page-level actions). Never below 44px
  touch targets on anything usable from a phone.

### Spacing by role

Pick the role, not a number. The semantic aliases resolve to the 4px grid:

| Token | Value | Between |
|---|---|---|
| `--dk-gap-control` | 12 | two adjacent interactive controls, side by side or wrapped |
| `--dk-gap-block` | 16 | a block (table, panel, empty state, form) and the controls before or after it |
| `--dk-gap-section` | 24 | page sections |
| `--dk-pad-cell` | 8 12 | table cells and divided rows |
| `--dk-pad-panel` | 16 | inside a bordered panel or card |

A control that sits inside a block's header or footer band uses the band's
padding instead of `gap-block`.

### Layout primitives

- `.dk-stack` stacks children at `gap-block`; `--tight` (8) and `--section`
  (24) change the step. Set `--dk-stack-gap` for anything else on the grid.
- `.dk-cluster` is a wrapping row at `gap-control`: button groups, filter
  rows, chip lists.
- `.dk-toolbar` is the one bar above a register: search and filters first,
  then a count, then actions in `.dk-toolbar__end` (pushed right). It wraps
  as a unit and keeps `gap-block` below. Never stack a separate action row
  above a filter row.
- `.dk-table-footer` (alias `.dk-panel__footer`) is the register's last band:
  counts, "Load more", pagination. It lives inside the bordered container,
  never flush under it.

### Dialogs

`<dialog class="dk-dialog">` with `.dk-dialog__head`, `.dk-dialog__body`,
`.dk-dialog__foot`. The default width is 560px; a wider dialog sets
`--dk-dialog-width` rather than `width`, so the phone sheet still wins. The body scrolls; head and foot stay. The foot puts the
primary at the end with Cancel before it; a destructive action goes first
and is pushed to the start (`margin-right: auto`). At ≤820px a dialog is a
full-screen sheet with the foot pinned to the bottom.

### Touch

At ≤820px or on a coarse pointer, `.dk-button`, `.dk-input`, `.dk-select`
and `.dk-textarea` grow to `--dk-size-touch` (44). Checkboxes keep their
16px look; wrap them in `label.dk-check` so the label is the 44px target.

## Typography

| Token | Use |
|---|---|
| `text-page` (32) | one per page, the h1 |
| `text-xl` (22) | h2, major sections |
| `text-lg` (16) | h3, card headings |
| `text-body` (14) | body copy, default |
| `text-md` (13) | inputs, buttons, table body |
| `text-sm` (12) | labels, hints, secondary UI |
| `text-xs` (11) | chips, badges, table headers |

- Headings use `weight-semibold` (bold only for h1), tight leading, and
  `--dk-text-heading`. Body text uses `--dk-text-primary`.
- Never resize below `text-xs`; if it doesn't fit, the layout is doing too
  much. Never style with color alone — pair muted/faint text with weight or
  size so it still reads in grayscale.

## Color

- **One accent per screen.** Accent marks interactive and primary things:
  primary buttons, links, active states, selection. If two unrelated elements
  on a screen both shout in accent, one of them shouldn't.
- **Status colors report status:** `success` (done, healthy), `warning`
  (due, degrading), `danger` (overdue, failed, destructive), `info` (neutral
  attention). Outside a status, they don't appear — that rule is dapier's
  "status hues (status only)" and it holds system-wide.
- Status comes as a triplet — `text` on `bg` with `border` — and the build
  verifies each pair. Use the triplet together; don't mix a status text onto
  an unrelated background.
- Muted/faint text for supporting content; `bg-muted`/`bg-hover` for subtle
  surfaces; `bg-inset` for code and embedded blocks.
- Borders: `border-default` by default, `border-strong` when the edge needs
  to survive a busy background (selected rows, secondary buttons). A
  status or accent border, when used, is the full 1px perimeter of a
  surface (the status triplet, or `--dk-accent-border` on `--dk-accent-soft`).
  Never a thicker or colored single edge — no left stripe, top bar, rail,
  marker column, or inset box-shadow as status or selection.
- Selection is `--dk-accent-soft` fill with accent text. Status is a
  `dk-badge` / `dk-dot` plus text. Color never sits on one edge alone.

## Buttons

- One primary (`--primary`) action per view. Everything else is
  `--secondary`; destructive actions are `--danger` and live away from the
  primary. Sizes: `--sm` in toolbars and tables, default in forms,
  `--lg` for page-level actions.
- Disabled still communicates: opacity only, no color swap (a grayed danger
  button must stay a danger button).

## Forms

- Every field: `dk-label` above, control, then `dk-hint` when the label
  can't carry the explanation. Labels are sentence case.
- Quantities, timings, IDs, and anything copy-pasteable render in
  `dk-mono`/`--dk-font-mono`.
- Mono is for machine values only (ids, timestamps, durations, expressions,
  tokens). Labels, prose, counts, headings and dialog titles are sans. Mono
  maxes at `weight-medium` (500): only 400/500 ship, and the font face maps
  bolder requests to 500 rather than synthesizing a smeared bold.
- Validate with the status triplets: `danger` for errors, `warning` for
  "proceed with care" — text alongside, color never alone.

## Tables & density

- Tables are the default data surface: `text-md` body, `text-xs` uppercase
  `border-default` headers, row hover via `bg-hover`.
- Status in tables is a `dk-badge` or `dk-dot` + text — never color alone,
  never a bare colored cell.
- Numbers align right and render in mono.

## Motion

Reduced-motion aware (base.css handles the reset). Any transition is
120–260ms; nothing bounces. If motion doesn't communicate state, cut it.

## Dark theme

Design once, verify twice: every screen must be checked in both themes before
shipping. Never fork a component per theme — if the dark rendering is wrong,
the token mapping is wrong; fix the token.
