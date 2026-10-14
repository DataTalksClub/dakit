# Segmented control

**Rule: every view switcher and every single-choice list filter is one
segmented control, `.dk-tabs`.** A rounded track holds the choices as
segments. The selected segment carries the kit selection (`--dk-accent-soft`
fill, neutral border, accent text); the others are plain text on the track.
A segment may end in a count.

```
╭──────────────────────────────────────────────╮
│ ▐ All 678 ▌  Grace 3   Valeriia 4   Alexey    │   .dk-tabs  (track)
╰──────────────────────────────────────────────╯
    selected    idle segments (.dk-tab)
```

There is no second style. Not separate outlined pills in a row, not an
underline under the active tab (underline stripes are an accent edge, which
the kit forbids), not app-local `*-tab`/`*-pill`/`*-chip` toggles. The
earlier `.dk-filter-chip` was removed for this reason: two looks for the same
job made the same app read as two apps.

## Markup

The look is the same for every use. The semantics are not: pick them by what
the control does.

| It… | Container | Segment | Selected | Keys |
|---|---|---|---|---|
| switches **routes** (each view has a URL) | `<nav class="dk-tabs" aria-label="…">` | `<a class="dk-tab" href>` | `aria-current="page"` | Tab between links (native) |
| switches **views in the page** (panels) | `<div class="dk-tabs" role="tablist" aria-label="…">` | `<button class="dk-tab" role="tab" aria-controls>` + `role="tabpanel"` | `aria-selected="true"` | ←/→, Home/End (`dist/tabs.js`) |
| **filters** a list, one choice | `<div class="dk-tabs" role="radiogroup" aria-label="…">` | `<button class="dk-tab" role="radio">` | `aria-checked="true"` | ←/→, Home/End (`dist/tabs.js`) |
| **filters** a list, several at once | `<div class="dk-tabs" role="group" aria-label="…">` | `<button class="dk-tab">` | `aria-pressed="true"` | Tab between buttons (native) |

How to decide:

- **Does the content below change to a different kind of thing** (Steps vs
  Log vs Input, Queue vs Calendar)? It's a view: `tablist` (or `<nav>` with
  links when the view is a route; prefer that when the app already routes,
  so Back and deep links work).
- **Is it the same list, narrowed** (All / Mine / Failed, an owner, a
  status)? It's a filter: `radiogroup`. The list is not a tab panel, and a
  screen reader should announce "radio button, 2 of 4, checked", not "tab".
- **Can several be on at once** (show Failed and Running)? `aria-pressed`
  toggles in a `role="group"`. Use this only when the choices really combine;
  a single-choice filter built from toggles lets the user turn everything
  off.

Every track needs an accessible name (`aria-label` or `aria-labelledby`)
that says what it chooses: "Filter queue by assignee", "Run views".

### Route views

```html
<nav class="dk-tabs" aria-label="Task views">
  <a class="dk-tab" href="/tasks/open" aria-current="page">Open <span class="dk-count">12</span></a>
  <a class="dk-tab" href="/tasks/waiting">Waiting <span class="dk-count">4</span></a>
  <a class="dk-tab" href="/tasks/done">Done</a>
</nav>
```

### In-page views

```html
<div class="dk-tabs" role="tablist" aria-label="Run views">
  <button class="dk-tab" type="button" role="tab" id="tab-steps" aria-controls="panel-steps" aria-selected="true" tabindex="0">Steps</button>
  <button class="dk-tab" type="button" role="tab" id="tab-log" aria-controls="panel-log" aria-selected="false" tabindex="-1">Log</button>
</div>
<div id="panel-steps" role="tabpanel" aria-labelledby="tab-steps">…</div>
<div id="panel-log" role="tabpanel" aria-labelledby="tab-log" hidden>…</div>
```

### Single-choice filter

```html
<div class="dk-tabs" role="radiogroup" aria-label="Filter queue by assignee">
  <button class="dk-tab" type="button" role="radio" aria-checked="true" tabindex="0">All <span class="dk-count">678</span></button>
  <button class="dk-tab" type="button" role="radio" aria-checked="false" tabindex="-1">Grace <span class="dk-count">3</span></button>
  <button class="dk-tab" type="button" role="radio" aria-checked="false" tabindex="-1">Alexey</button>
</div>
```

The count is part of the segment's name. If the visible label isn't enough
on its own ("3" means "3 open"), set `aria-label` on the segment: "Grace, 3
open".

### Counts

A trailing `<span class="dk-count">` inside a segment loses its pill: it is
mono `--dk-text-xs` semibold, tabular, in `--dk-tabs-count` on an idle
segment and in the selected text colour on the selected one. Omit the count
when it is zero, or show `0` everywhere; don't mix. Never colour a count by
status.

### Disabled

`disabled` (or `aria-disabled="true"` when it must stay focusable to explain
itself) shows the label in `--dk-tabs-disabled-text`, with no hover. Arrow
keys skip it. Prefer hiding a choice that can never apply; disable one that
applies later ("Output" before a run finishes).

## Sizes

| Size | Class | Segment height | Side padding | Type |
|---|---|---|---|---|
| default | `.dk-tabs` | `--dk-tabs-height` (28px) | `--dk-tabs-pad-x` (12px) | `--dk-text-md` |
| compact | `.dk-tabs.dk-tabs--sm` | `--dk-tabs-height-sm` (24px) | `--dk-tabs-pad-x-sm` (8px) | `--dk-text-sm` |

Default for page-level views and filters. Compact for a control inside a
panel header, a popover (notifications Unread/All) or a dense toolbar.
On a phone or a coarse pointer every segment grows to `--dk-size-touch`
(44px), compact included.

## Layout and mobile

- The track is `inline-flex` and as wide as its segments. It sits in a
  `.dk-toolbar` or `.dk-cluster` like any control, with `--dk-gap-control`
  to its neighbours; it is never stretched by a flex parent on desktop.
- **It never wraps.** When the segments don't fit, they scroll horizontally
  inside the track (no scrollbar), and a neutral scroll shadow shows on each
  edge that has more. A wrapped segmented control reads as two controls,
  and its second row looks like a new filter. `dist/tabs.js` scrolls the
  selected segment into view on load and when the keyboard moves the choice.
- At ≤820px the track spans the content width and segments share it
  (`flex: 1 0 auto`, centred labels), still scrolling if they don't fit.
- More than about six choices, or labels longer than two words, is a sign the
  control is the wrong one. Use a `.dk-select` (or a menu) instead.

## Keyboard (`dist/tabs.js`)

Load `dist/tabs.js` once per page. It is delegated on `document`, so tracks
rendered later work too, and exposes `globalThis.dakitTabs`.

For `role="tablist"` and `role="radiogroup"` tracks:

- One segment is in the tab order: the selected one (`tabindex="0"`); the
  rest have `tabindex="-1"` (roving tabindex). Render it that way, or call
  `dakitTabs.sync(root)` after rendering; the helper also fixes a track the
  first time focus reaches it.
- ←/→ (and ↑/↓) move to the previous/next enabled segment and wrap; Home and
  End go to the first/last. Moving **chooses** the segment (automatic
  activation): the helper calls `.click()` on it, so the app's click handler
  stays the one place a choice is made. Don't make a view slow to switch
  with automatic activation: if a view needs a fetch, show it busy inside its
  panel rather than delaying the switch.
- If the click makes the app re-render the track, focus follows to the same
  segment in the new track, found by the track's `id` or `aria-label`. Give
  re-rendered tracks a stable one.
- Right-to-left is respected.

Route `<nav>` links and `aria-pressed` toggles keep native Tab order; the
helper does nothing for them.

The app owns state. The helper never sets `aria-selected`/`aria-checked` or
shows panels; the app's click handler does, exactly as it does for a mouse
click.

## Tokens

| Token | Light / dark | Meaning |
|---|---|---|
| `--dk-tabs-track` | `bg-muted` | track fill |
| (border) | `border-default` | track border, 1px neutral; a selected segment's border too |
| `--dk-tabs-radius` / `--dk-tabs-radius-item` | 6px / 4px | track / segment corners |
| `--dk-tabs-pad` | 4px | track inner padding |
| `--dk-tabs-gap` | 4px | between segments |
| `--dk-tabs-height` / `--dk-tabs-height-sm` | 28px / 24px | segment height |
| `--dk-tabs-pad-x` / `--dk-tabs-pad-x-sm` | 12px / 8px | segment side padding |
| `--dk-tabs-text` | `text-muted` | idle label |
| `--dk-tabs-hover` / `--dk-tabs-hover-text` | `bg-hover` / `text-primary` | hovered idle segment |
| `--dk-tabs-selected` / `--dk-tabs-selected-text` | `accent-soft` / `accent-default` | selected segment (semibold) |
| `--dk-tabs-count` | `text-muted` | idle count |
| `--dk-tabs-disabled-text` | `text-faint` | disabled label |
| `--dk-tabs-focus` | `focus-ring` | 2px keyboard ring, drawn inside the segment so the track never clips it |

All colour pairs are in `tokens/contrast.json` and checked in both themes.
Apps don't override these per screen. If a screen needs a different look,
the standard is wrong: change it here, for every app.

## Review checklist

- One look: no app-local pill rows, chip toggles or underline tabs for a
  view switch or a filter. App CSS doesn't restyle `.dk-tab`.
- Semantics match the job: `<nav>`+`aria-current` for routes, `tablist` for
  in-page views, `radiogroup` for a single-choice filter, `aria-pressed` for
  combinable toggles.
- The track has an accessible name; counts are inside the segment.
- Exactly one segment of a `tablist`/`radiogroup` is tabbable, and arrow keys
  move the choice.
- The track scrolls, not wraps, at 390px, and the selected segment is in
  view.
