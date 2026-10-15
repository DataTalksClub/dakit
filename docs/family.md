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

## Shell and account chrome

The app shell is a kit component now: `css/shell.css` + `dist/shell.js`,
specified in **[shell.md](shell.md)**, which supersedes the sidebar recipe and
account-chrome rules that used to live here. In short:

- **Operator apps with 4+ destinations** (dataops, relay, dapier, agent-hub):
  240px sidebar (`--dk-size-sidebar`) holding only navigation — brand row with
  the notification bell, optional search, grouped nav, one account row. It
  collapses to a 56px icon rail (`--dk-size-rail`) that keeps every control.
- **2–3 destinations** (dataqna admin, dapier designer): `.dk-shell--topbar`,
  a 48px bar with brand, links, and an avatar-only account trigger.
- **Single-purpose views** (dataqna room, present, public pages, the device
  approval page): no shell; they keep a compact theme control of their own.
- **Mobile (≤820px)**: 48px bar with menu, title, bell, avatar; navigation in
  a modal drawer.
- Account menu: identity, optional scope, Dark mode (the only theme control),
  utilities, version/region (mono), Sign out. Never destinations or widgets.

## Page anatomy (hierarchy)

1. Page header (`.dk-page-header`): one `h1` at 22px semibold in operator
   apps (32px only in single-purpose views) + an optional one-line muted
   description. No create, refresh or export in its corner: those sit on the
   collection they act on (guidelines "Action placement").
2. One dominant question per page. No summary stat strips or count tiles on
   working screens (principle 4, no vanity metrics): show the "needs
   attention" list itself, with at most one count in its heading or button.
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
  border-bottom: 1px solid var(--dk-border-default); }
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
- **Status**: pair roles only (`--dk-success-*` / `--dk-warning-*` /
  `--dk-danger-*` / `--dk-info-*`), text+bg together (badges are fill-only). No pill on every
  row by default; a badge must change what the operator does. Accent borders are
  forbidden family-wide: no colored outline, no left/top stripe, rail, 3px
  marker column, or inset box-shadow. Cards, plan sessions, queue groups,
  and callouts use the same 1px even neutral border as `.dk-card`.
- **Selection**: `--dk-accent-soft` fill with accent text and neutral border. One signal.
- **Overlays**: popover → row/global action; modal → focused confirmation
  (backdrop, Escape, focus trap, restore); sheet → persistent detail, full
  screen on mobile. Don't mix mechanisms for the same interaction. Overlay
  surfaces (modal/popover/lightbox panels) use `--dk-radius-lg` (10px) and
  `--dk-shadow-overlay`; static containers and controls stay at
  `--dk-radius-md` (6px) with no shadow. Backdrops use `--dk-bg-backdrop`.
  Full-height edge-to-edge drawers keep no radius (the shadow carries them).
- **Focus**: the keyboard indicator is always visible and comes from
  `--dk-focus-ring`: `outline: 3px solid var(--dk-focus-ring)` with
  `outline-offset: 2px` on `:focus-visible` (full-bleed rows inset it with a
  negative offset so it stays inside the row). Controls keep neutral borders.
  Never remove or dim the indicator.

## Icons

One icon language family-wide, on dataops's geometry (the family reference):
**inline SVG, 24×24 viewBox paths rendered at 20px, `stroke="currentColor"`,
stroke-width 1.8, round caps/joins, no fills** — the same drawing style as the
dakit select chevron. No icon fonts, no emoji, no mixed sets. Nav and rows
always pair icon + text. Keep a per-app sprite/partial of the shared shapes
(chevron, plus, search, check, alert-triangle, x, external-link, clock, user,
doc, mail, refresh) copied from one source so strokes stay identical — the
canonical set lives in `showcase.html` on this geometry. (The 2026-10-02 spec
originally taught a 16×16/stroke-1.5 geometry; apps still drawing that must
migrate to the 24-grid set — do not mix the two sets in one app.)

```html
<svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none"
     stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
     stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
```

## States, copy, dark mode

- Loading = skeleton/reserved space; a dialog that needs data opens only
  once the data is in (busy trigger meanwhile, `docs/dialog-loading.md`); empty = explain + safe next action;
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
same status language, same icon strokes, same focus treatment, and identical
`--dk-*` palette in both themes — with no app-local hex, radii, shadows, or
control sizes outside a sanctioned exception, and with no colored edge
accents (left/top stripes, rails, marker columns). Verify with side-by-side screenshots (390×844 and
1440×900, light + dark) reviewed by a judge. Recapture `docs/family-reference/`
when a surface's status language changes so the stills do not teach a
retired pattern.
