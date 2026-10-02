# The dakit family spec

One design family across dataops, relay, dapier, and dataqna. **dataops is the
canonical reference**: its rendered UI and `frontend/DESIGN_SYSTEM.md` define
the look; this file generalizes that look into recipes every app copies. When
this spec and an app's current CSS disagree, the app changes.

Tokens come from dakit (`--dk-*`); component classes from `css/components.css`
(`.dk-*`). Recipes below show the structural CSS an app ports into its own
stylesheet using `--dk-*` roles — copy the recipe, rename nothing inside it
except the app-local class prefix. An app may instead vendor
`dist/tokens.css` only and mirror the base layer's element defaults (fonts,
select chevron, focus ring) in its own stylesheet — dataops, the canonical
reference, does exactly that; keep such mirrors byte-equal to `css/base.css`
and never bake raw colors into them.

## Who uses which shell

- **Operator apps with several destinations** (dataops, relay, dapier
  designer, dataqna admin): persistent **268px sidebar** (`--dk-size-sidebar`)
  + main canvas + slim top toolbar for global actions. Icon-plus-text nav rows,
  never icon-only. Every destination stays visible; no "More" menu.
- **Single-purpose views** (dataqna room on a phone, present on a projector,
  public/legal pages): no sidebar. They inherit the same components, type
  scale, and status language, so they still read as family.
- **Mobile** (≤820px): 64px top bar with menu; navigation opens as a modal
  drawer with scrim, focus trap, and restoration. One pane at a time.

Sidebar recipe (port verbatim, tokens do the theming):

```css
.app-sidebar { width: var(--dk-size-sidebar); background: var(--dk-bg-muted);
  border-right: 1px solid var(--dk-border-default); }
.nav-item { display: flex; align-items: center; gap: 10px;
  min-height: 36px; padding: 6px 10px; border-radius: var(--dk-radius-md);
  font-size: var(--dk-text-body); font-weight: 500; color: var(--dk-text-primary); }
.nav-item:hover { background: var(--dk-bg-hover); }
.nav-item[aria-current="page"] { background: var(--dk-accent-soft);
  color: var(--dk-accent-default); font-weight: 600; }
/* selection signal is the filled row ONLY — no left border, rail, or stripe */
.nav-group-label { font-size: var(--dk-text-xs); color: var(--dk-text-muted);
  font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em;
  margin: 18px 10px 5px; }
```

## Page anatomy (hierarchy)

1. Page header: one `h1` at 32px semibold (22px mobile) + one-line muted
   description. Utility actions share the row only if short; primary action
   first, content-width.
2. One dominant question per page. Summary/attention strips are compact
   segmented rows, not dashboard card grids.
3. Content in **one bordered container with divided rows** — not nested
   cards. Container header/footer bands sit on `--dk-bg-muted`.
4. Readable measure for text-heavy work: 760–820px (dataops queues use 896px
   containers centered in the canvas).

Container + row recipe:

```css
.panel { background: var(--dk-bg-surface); border: 1px solid var(--dk-border-default);
  border-radius: 6px; }           /* no shadow — shadows are overlays/modals only */
.panel-header { padding: var(--dk-space-3) var(--dk-space-4);
  background: var(--dk-bg-muted); border-bottom: 1px solid var(--dk-border-default);
  font-size: var(--dk-text-lg); font-weight: 600; }
.row { display: flex; align-items: center; gap: var(--dk-space-3);
  padding: var(--dk-space-2) var(--dk-space-4); min-height: 40px;
  border-bottom: 1px solid var(--dk-border-muted); }
.row:last-child { border-bottom: 0; }
.row:hover { background: var(--dk-bg-hover); }
```

A row has: one primary label (`--dk-text-body`), one short metadata line
(`--dk-text-sm` muted), status when it changes a decision (`.dk-badge` /
`.dk-dot`), and at most one next action. Tables only for genuinely tabular
comparison; on mobile convert to labelled rows.

## Components

Use the `.dk-*` classes as the base vocabulary: `.dk-button--primary|secondary|
danger|sm|lg`, `.dk-card`, `.dk-table`, `.dk-badge--*`, `.dk-dot--*`,
`.dk-input`, `.dk-select`, `.dk-textarea`, `.dk-label`, `.dk-hint`, `.dk-chip`,
`.dk-divider`. App-local classes handle structure (shell, panels, rows) with
the recipes above; they must not re-specify colors, radii, or control sizes
that a `--dk-*` role already covers.

- **Buttons**: one primary per view, CMP blue, white text. Secondary = muted
  surface + neutral border + primary text. Content-width default; never
  full-width on desktop. Heights come from the `--dk-size-control-*` scale —
  `--dk-size-control-md` (34px) default on desktop, `--dk-size-touch` (44px)
  on phone. Primary first, destructive separated and explicitly labelled.
- **Forms**: labels above controls, helper text (`.dk-hint`) directly below,
  stacked fields; 2–3 columns only for short comparable fields. One footer
  action row above a top border: primary, then Cancel. Validation copy sits
  at the field and focuses the first invalid control.
- **Status**: triplet roles only (`--dk-success-*` / `--dk-warning-*` /
  `--dk-danger-*` / `--dk-info-*`), text+bg+border together. No pill on every
  row by default; a badge must change what the operator does.
- **Overlays**: popover → row/global action; modal → focused confirmation
  (backdrop, Escape, focus trap, restore); sheet → persistent detail, full
  screen on mobile. Don't mix mechanisms for the same interaction. Overlay
  surfaces (modal/popover/lightbox panels) use `--dk-radius-lg` (10px) and
  `--dk-shadow-overlay`; static containers and controls stay at
  `--dk-radius-md` (6px) with no shadow. Backdrops use `--dk-bg-backdrop`.

## Icons

One icon language family-wide: **inline SVG, 16×16 viewBox, `stroke="currentColor"`,
stroke-width 1.5, round caps/joins, no fills** — the same drawing style as the
dakit select chevron. No icon fonts, no emoji, no mixed sets. Nav and rows
always pair icon + text. Keep a per-app sprite/partial of the shared shapes
(chevron, plus, search, check, alert-triangle, x, external-link, clock, user,
doc, mail, refresh) copied from one source so strokes stay identical — the
canonical set lives in `showcase.html`.

```html
<svg class="icon" width="16" height="16" viewBox="0 0 16 16" fill="none"
     stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
     stroke-linejoin="round" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>
```

## States, copy, dark mode

- Loading = skeleton/reserved space; empty = explain + safe next action;
  partial = keep loaded rows + name the unavailable source + one retry;
  failure = concise operator copy, never a stack trace. Never a false zero.
- Resolve names before render; no raw IDs, state codes, or provider names in
  operator copy.
- Theming: `data-theme` attribute on the document element + theme-pinned
  `color-scheme` (dakit base layer handles it). Dark values come from the
  tokens — never synthesize by inverting light values.
- Density exceptions already sanctioned: dataqna room 16px phone body,
  dapier designer canvas 13.5px. Nothing else.

## Acceptance for "same family"

A redesigned app passes when a side-by-side with dataops shows: same shell
geometry, same page-header scale, same row-list rhythm, same button hierarchy,
same status language, same icon strokes, and identical `--dk-*` palette in
both themes — with no app-local hex, radii, shadows, or control sizes outside
a sanctioned exception. Verify with side-by-side screenshots (390×844 and
1440×900, light + dark) reviewed by a judge.
