# dakit

The shared design system for the internal tools — dapier, dataops, dataqna,
relay/datamailer, and whatever ships next. One visual language instead of four:
tokens, base styles, a small component vocabulary, and the guidelines that keep
them coherent.

It was drafted by merging the two strongest existing styles: **dataops**
(GitHub-Primer-style neutral surfaces, one blue accent, Inter + IBM Plex Mono,
semantic status colors — already adopted by relay) and **dapier** (strict
status-only color, mono for data, a first-class dark theme, numerically
verified contrast). See `docs/principles.md` for the merged philosophy and
`docs/adoption.md` for per-project migration maps.

## Quick start

Dakit is plain CSS + JSON with zero runtime dependencies.

```html
<link rel="stylesheet" href="path/to/dakit/dist/dakit.css">
```

And the theme boot script (before first paint, in `<head>`; with no stored
choice the OS preference decides):

```html
<script>
  const stored = localStorage.getItem("dakit-theme");
  document.documentElement.dataset.theme =
    stored === "dark" || stored === "light"
      ? stored
      : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
</script>
```

Toggle with `document.documentElement.dataset.theme = "dark"` and persist under
`dakit-theme`. For JS consumption, `import { light, dark } from "dakit/tokens"`.

If you only want the tokens (apps that keep their own base styles), import
`dist/tokens.css` instead of the bundle.

## Structure

```
tokens/primitives.json     raw ramps & scales (gray, blue, type, space…) — not for app use
tokens/semantic.json       light-theme roles (bg, text, border, accent, status…) — the app-facing layer
tokens/themes/dark.json    dark-theme remaps of the same roles
tokens/contrast.json       WCAG pairs the build verifies in both themes
css/base.css               reset + element defaults
css/components.css         .dk-* components (buttons, fields, cards, chips, tables, callouts, menus, auth card…)
css/shell.css              app shell: sidebar, icon rail, topbar, drawer, account menu, notifications
js/dialogs.js              <dialog> backdrop dismissal + openWhenReady (load before open; copied to dist/ verbatim)
js/shell.js                shell behaviour: collapse, drawer, popovers, counts, theme, copy
js/split.js                list–detail split: list keyboard, focus per pane, resize grip
js/tabs.js                 segmented control keyboard: roving tabindex, arrow keys for tablist/radiogroup
js/device-code.js          device-login code normalize/format (ES module, never truncates)
js/avatar.js               avatar: initials with an optional photo laid over them (ES module)
build.mjs                  tokens → dist/; validates aliases, dark coverage, contrast
dist/                      generated: dakit.css (bundle), tokens.css, tokens.js, dialogs.js, shell.js, split.js, tabs.js, device-code.js, avatar.js
fonts/                     self-hosted Inter + IBM Plex Mono (SIL OFL)
showcase.html              living style guide — open after building
showcase-shell.html        app shell in every state (?state=, ?variant=topbar)
showcase-device.html       device-login page, live mock flow + every state
showcase-split.html        list–detail split (?run=, ?state=scrolled, ?empty=1)
docs/dialog-loading.md     a dialog never opens half-loaded: busy trigger, spinner, loading overlay, error toast
docs/segmented.md          the one view-switcher/filter control (.dk-tabs): which ARIA when, sizes, mobile, tokens
docs/                      principles, token model, usage guidelines, adoption maps
```

## Build

```
node build.mjs     # or: npm run build
```

The build is the gatekeeper: it fails on dangling token aliases, dark overrides
without a light counterpart, and any contrast pair under its WCAG minimum.
Don't lower minimums to make a failing pair pass — fix the token.

## Rules in one breath

Applications use **semantic tokens only** (`--dk-text-muted`, `--dk-danger-bg`),
never primitive ramps or raw hex. Color carries status, not decoration: one
accent, and status hues only for status. Everything on the 4px space grid, the
shared type scale, and AA contrast in both themes — the build enforces the last
one.
