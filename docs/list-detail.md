# List–detail split (`.dk-split`)

Binding contract for the two-pane view: a list of items on one side and the
selected item's content on the other. dapier (Agents, Emails › Received) and
dataops (Sponsors, Review, Templates, Assistants) each built it themselves,
with different widths, scroll models, selection markers and phone behaviour.
This file replaces those versions. Working demo: `showcase-split.html`
(`?run=<id>`, `?state=scrolled`, `?empty=1`, `?theme=dark`).

## 1. What it is, and what it isn't

- **Is:** a list where choosing a row shows that row's content beside it,
  and the selection is a place you can link to (the URL holds the id).
- **Isn't:** a list whose rows open dialogs, a filter column that only narrows
  another list (dapier Hooks), or two stacked panels (dapier Addresses). Use a
  `.dk-table` or plain panels for those.

## 2. Rules

1. **The page doesn't scroll; the panes do.** The split fills the content area
   to the bottom of the viewport. The list and the detail each have their own
   scroller. There's never a page scrollbar beside a pane scrollbar.
2. **Pane headers stay.** Each pane's header band (title, count, Back, actions)
   and the list's tool row and footer sit outside the scroller, so they never
   scroll away. A sub-header inside the detail that must stay too (a section
   nav) is `.dk-split__sticky`. Put it in a `.dk-split__scroll--flush`
   scroller: a sticky element sticks to the scroller's content edge, so the
   default 16px padding would leave a band where content shows above it.
3. **Selection is fill, not a stripe.** A selected row gets the
   `--dk-accent-soft` fill and its name turns `--dk-accent-default`. The row
   keeps its neutral 1px divider. Hover never replaces the selected fill. No
   accent borders, side rails or inset shadows (AGENTS.md).
4. **The URL holds the selection.** Rows are links (or buttons that update the
   URL), so a selection can be shared, reloaded and reached with Back/Forward.
   Use `pushState` when a person opens a row; use `replaceState` only for an
   automatic choice (for example, opening the first row on desktop).
5. **Nothing selected says so.** An empty detail holds a `.dk-empty` that
   says what to do ("Select a run…"). It isn't blank and it isn't a spinner.
6. **Phones show one pane at a time** (≤ 820px). The list shows when the URL
   has no selection. The detail shows, with a Back control, when it does.
7. **Data reads as data.** Times, ids, counts and amounts in rows use
   `--dk-font-mono` with tabular figures.

## 3. Anatomy

```
.dk-main  (flex column while it holds a split; never scrolls)
└ .dk-main__inner
  ├ .dk-page-header            title, description (no create/refresh: guidelines "Action placement")
  ├ (.dk-tabs, .dk-toolbar…)   optional, full width above both panes
  └ .dk-split[data-view]                      fills the rest; 1px neutral border, radius-md
    ├ section.dk-split__list                  width var(--dk-split-list), 1px divider right
    │ ├ header.dk-split__head                 48px band, muted: __title + create, __count, actions
    │ ├ div.dk-split__tools                   optional: search input, filter chips
    │ ├ div.dk-split__scroll                  ← scrolls
    │ │ └ ul.dk-split__items > li > a.dk-split__item[aria-current="true"]
    │ │      ├ .dk-split__name                name (accent when selected)
    │ │      └ .dk-split__meta                badge, secondary text, mono time
    │ ├ div.dk-split__foot                    optional: "Load more", totals
    │ └ div.dk-split__handle                  optional resize grip
    └ section.dk-split__detail
      ├ header.dk-split__head                 a.dk-split__back (phones) + h2.dk-split__title + actions
      └ div.dk-split__scroll                  ← scrolls; padded --dk-pad-panel (--flush: none)
         or div.dk-split__empty > .dk-empty   nothing selected
```

```html
<div class="dk-split" data-dk-split="agent-runs" data-view="detail">
  <section class="dk-split__list" aria-labelledby="runs-title">
    <header class="dk-split__head">
      <h2 class="dk-split__title" id="runs-title">Runs</h2>
      <span class="dk-split__count">48</span>
    </header>
    <div class="dk-split__tools"><input class="dk-input" type="search" aria-label="Filter runs" placeholder="Filter runs"></div>
    <div class="dk-split__scroll">
      <ul class="dk-split__items" aria-label="Agent runs">
        <li><a class="dk-split__item" href="/agents?task=r1039" aria-current="true">
          <span class="dk-split__name">Sponsor follow-up #1039</span>
          <span class="dk-split__meta"><span class="dk-badge dk-badge--info">Running</span><span>Sponsor follow-up</span><span class="dk-mono">10:17</span></span>
        </a></li>
      </ul>
    </div>
    <div class="dk-split__handle"></div>
  </section>
  <section class="dk-split__detail" aria-label="Selected run">
    <header class="dk-split__head">
      <a class="dk-split__back" href="/agents"><svg …><path d="m15 18-6-6 6-6"/></svg>Runs</a>
      <h2 class="dk-split__title">Sponsor follow-up #1039</h2>
    </header>
    <div class="dk-split__scroll">…</div>
  </section>
</div>
```

## 4. Sizes and tokens

| What | Value |
|---|---|
| List width | `--dk-split-list`, default `--dk-size-split-list` (320px). Clamped in CSS to `240px … 50%` of the split, so a narrow window never loses the detail. An app sets a different fixed width with `style="--dk-split-list: 384px"` or a rule on its own class. |
| Split minimum height | 320px. On a very short window the content area scrolls rather than squeezing the panes to nothing. |
| Head band | min 48px (`--dk-size-topbar`), `--dk-space-2` × `--dk-space-4` padding, `--dk-bg-muted`, 1px bottom divider. |
| Row | `--dk-space-3` × `--dk-space-4` padding, `--dk-space-1` between name and meta, 1px neutral bottom divider, `--dk-text-md`. |
| Detail padding | `--dk-pad-panel` (16px); `.dk-split__scroll--flush` removes it (iframes, full-bleed tables). |
| Touch | At ≤ 820px or on a coarse pointer, rows are at least `--dk-size-touch` (44px). Back is always 44px tall. |

There are no new colour roles. Selection uses `--dk-accent-soft` with
`--dk-accent-default` names; muted meta stays `--dk-text-muted`. The build
checks `text.primary`, `text.muted` and `accent.default` on `accent.soft` in
both themes.

## 5. Filling the height

`.dk-main` becomes a flex column whenever it contains a visible `.dk-split`
(`:has()`; a `[hidden]` split, such as one on an inactive tab, doesn't
count), and `.dk-main__inner` grows to fill it. Inside a `.dk-fill` column only
the split or the next `.dk-fill` grows; headers, stat strips and toolbars above
it keep their natural height. An app rule that sets `display: grid` on a
wrapper beats `.dk-fill` (the kit is in a cascade layer), so such a wrapper
needs its own `display: flex; flex-direction: column` while it holds a split. The split is `flex: 1`.
So in the dakit shell, a split placed directly in `.dk-main__inner` fills
the viewport with no extra code.

If the app puts wrappers between `.dk-main__inner` (or `.dk-main`) and the
split, give each wrapper `.dk-fill` (`display: flex; flex-direction: column;
flex: 1; min-height: 0`). That's the only way height reaches the split.
Don't use `height: calc(100vh - …)`: it breaks as soon as a header wraps.

Above the split, page headers, tabs and toolbars keep their natural height and
`gap`. Everything that belongs to one pane (its search, filter chips, count,
"Load more") goes inside that pane, not above the split.

## 6. Phones (≤ 820px)

- `data-view="list"` shows only the list. `data-view="detail"` shows only the
  detail. The app sets it from the URL: an id in the URL means `detail`.
- `.dk-split__back` (hidden on desktop) is a link or button to the list URL.
  Its visible label is the list's name ("‹ Runs", "‹ Sponsors"), not just
  "Back", and its accessible name contains that label:
  `aria-label="Back to Runs"`. It has no padding, so the label lines up with
  the pane title.
- Opening an item moves focus to the detail's title (`dakitSplit.show`).
  Back moves focus to the row it came from and scrolls that row into view.
- Don't auto-select a row on a phone. The first thing on the screen is the
  list.

## 7. Keyboard and accessibility

- Rows are `<a href>` (preferred, since the selection is a URL) or `<button>`.
  `li[role=button][tabindex=0]` works too: the kit makes Enter and Space click
  it.
- Mark the selected row with `aria-current="true"` (or `aria-selected="true"`
  inside a real `role="listbox"`). Don't use a class.
- With `dist/split.js` loaded, inside the list `↑`/`↓` move focus to the
  previous or next row and `Home`/`End` jump to the first or last. `Enter`
  opens a row. Arrows in a search field or another control inside the list
  are left alone. The kit doesn't add a global shortcut.
- After a row is opened, focus stays on that row on desktop, so the person can
  keep arrowing. If the app re-renders the list and focus falls to `<body>`,
  the kit puts it back on the selected row.
- Give each pane a name: `aria-labelledby` its head title on the list,
  `aria-label` ("Selected run") on the detail.

## 8. Resizing (optional)

Add `<div class="dk-split__handle"></div>` as the last child of
`.dk-split__list` and a `data-dk-split="<key>"` on the split. `split.js` turns
it into a `role="separator"` with `aria-valuenow/min/max` and a label ("Resize
list"; set your own `aria-label` to override). Drag it, or focus it and use
`←`/`→` (16px steps) and `Home`/`End` (240px / half the split). The width is
kept in `localStorage["dk-split:<key>"]`. Without a key it isn't persisted.
The grip is hidden on phones. It shows a 1px `--dk-border-strong` line on
hover and the focus ring on keyboard focus. Leave the handle out for a fixed
width.

## 9. `js/split.js` → `dist/split.js`

A classic script with an idempotent global guard, like `shell.js`. Load it
once at the end of `<body>`. Listeners are delegated on `document`, and a
`MutationObserver` sets up grips on splits rendered later. The app owns the
data, the selection and the URL. The kit owns keyboard movement, focus and
the grip.

```js
dakitSplit.show(split, "detail" | "list", { focus = true, resetScroll = true }?);
  // sets data-view; "detail" resets the detail scroll; on a phone it moves focus
  // (detail: [data-dk-autofocus] or the title; list: the selected row)
dakitSplit.reveal(split);          // scrolls the selected row into view inside the list
dakitSplit.setWidth(split, px);    // clamps, applies, persists when data-dk-split is set
dakitSplit.initSplit(root?);       // runs automatically; idempotent
```

A typical route handler:

```js
function render() {
  const id = new URL(location.href).searchParams.get("task");
  renderList(id);                               // marks aria-current on the row
  renderDetail(id);                             // detail or the .dk-empty state
  dakitSplit.show(split, id ? "detail" : "list", { focus: false });
}
list.addEventListener("click", (e) => {         // the row is a link
  const row = e.target.closest(".dk-split__item");
  if (!row) return;
  e.preventDefault();
  history.pushState(null, "", row.href);
  render();
  dakitSplit.show(split, "detail");             // focus follows on a phone
});
addEventListener("popstate", render);
```

## 10. Banned

1. Accent or status borders, side stripes or inset shadows on selected rows.
2. A page scrollbar next to a pane scrollbar, or a pane with
   `max-height: 640px` inside a scrolling page.
3. `height: calc(100vh - Npx)` to size the split.
4. A selection that isn't in the URL.
5. Hover that looks the same as selection, or that replaces the selected fill.
6. A phone layout that stacks the detail under a long list.
7. A Back control on desktop.
