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
  + main canvas, and that is the whole shell — **no top toolbar**. The bar
  spent 64px of every screen on two controls; those live in the sidebar
  footer instead (see Account chrome). Icon-plus-text nav rows, never
  icon-only. Every destination stays visible; no "More" menu. A collapsed
  sidebar collapses to a slim rail whose only control is the expand button,
  never to zero.
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
/* selection signal is the filled row ONLY — no left border, rail, or stripe.
   The same ban applies to cards, sessions, queues, and callouts. */
.nav-group-label { font-size: var(--dk-text-xs); color: var(--dk-text-muted);
  font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em;
  margin: 18px 10px 5px; }
```

## Account chrome (operator apps)

The sidebar owns identity, appearance, and sign-out — there is no top
toolbar to host them. dataops is the reference
(`docs/family-reference/account-menu-*`). Copy this placement even when the
app has no teammate-scope or workspace links.

- **Sidebar footer** is the shell's global strip, pinned to the bottom of
  the sidebar (sticky when the nav scrolls). It holds, top to bottom:
  utilities that are not destinations (help, notifications with its count
  badge) as icon-plus-text rows in the nav-row vocabulary, then the
  **account trigger** as the last row: avatar initial, display name,
  chevron. Accessible name "Account". Never an anonymous gear.
- **Popover** anchored above the footer, left-aligned to the sidebar:
  overlay radius `--dk-radius-lg`, `--dk-shadow-overlay`, Escape, restore
  focus. Sections in this order, omitting any the app does not have:
  1. Identity — "Signed in as", name, email.
  2. Show work for — only apps that can scope another person's work.
  3. Workspace — destinations that are not in the sidebar.
  4. Appearance — one labeled switch (`Dark mode` / `Light mode`) with a
     track toggle. This is the only theme control in the app.
  5. Version — muted, mono.
  6. Sign out — danger text, explicitly labelled.
- **Mobile (≤820px)** keeps the 64px top bar with menu, title, and the
  avatar alone as the account trigger; overlays anchor under the top bar.
  The navigation drawer carries the same footer rows, so every account
  action is reachable from the drawer too.
- The footer may also show environment or region as status copy. Account
  actions appear nowhere but the popover — no duplicate sign-out or theme
  controls in rows, toolbars, or page headers.

Single-purpose views (dataqna room, present, public pages) keep a compact
theme control in their own top bar; they have no account popover.

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
- **Status**: triplet roles only (`--dk-success-*` / `--dk-warning-*` /
  `--dk-danger-*` / `--dk-info-*`), text+bg+border together. No pill on every
  row by default; a badge must change what the operator does. Never encode
  status or selection as a colored edge: no left/top stripe, rail, 3px
  marker column, or inset box-shadow. Cards, plan sessions, queue groups,
  and callouts use the same 1px even border as `.dk-card`.
- **Selection**: `--dk-accent-soft` fill with accent text. One signal.
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
  negative offset so it stays inside the row). Text controls additionally swap
  to an `--dk-accent-default` border with a `0 0 0 3px var(--dk-focus-ring)`
  halo on `:focus`. Never remove or dim the indicator.

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
same status language, same icon strokes, same focus treatment, and identical
`--dk-*` palette in both themes — with no app-local hex, radii, shadows, or
control sizes outside a sanctioned exception, and with no colored edge
accents (left/top stripes, rails, marker columns). Verify with side-by-side screenshots (390×844 and
1440×900, light + dark) reviewed by a judge. Recapture `docs/family-reference/`
when a surface's status language changes so the stills do not teach a
retired pattern.
