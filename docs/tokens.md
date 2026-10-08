# The token model

Three layers, one direction of dependency:

```
primitives.json          raw values. ramps + scales. no opinions.
      │  {gray.200}
      ▼
semantic.json            roles, light theme. the ONLY layer apps touch.
themes/dark.json   ───►  same roles, different values.
      │  build.mjs
      ▼
dist/tokens.css          :root { primitives + light }  :root[data-theme="dark"] { dark }
```

## Naming

Token name = JSON key path with `-` separators, `dk-` prefixed:

| JSON path | CSS variable |
|---|---|
| `gray.200` | `--dk-gray-200` |
| `text.body` | `--dk-text-body` |
| `bg.page` | `--dk-bg-page` |
| `danger.border` | `--dk-danger-border` |
| `space.3` | `--dk-space-3` |

Semantic prefixes: `bg-`, `text-`, `border-`, `accent-`, `focus-`,
`success-`, `warning-`, `danger-`, `info-`, `shadow-`, the spacing roles
`gap-` and `pad-` (aliases onto `space-`, see guidelines "Spacing by role"),
plus the scale groups `text-` (type sizes), `space-`, `radius-`, `size-`. If a name needs a second
dash-level to be understood (`bg-inset`, `text-on-accent`), that's fine; if it
needs three, the model is wrong.

Two depths of the accent: `accent-default`/`accent-hover` are the accent as a
control — fills, links, strokes. `accent-deep`/`accent-deeper` are the accent
as a *field*: brand bands and hero gradients that carry white ink
(`text-on-deep`) rather than sit beside it. Both are the dark end of the blue
ramp in each theme, so white clears AA on them everywhere; build nothing
bright from them.

`accent-border` is a full-perimeter 1px outline on an `--dk-accent-soft`
surface (callouts, notices). It is never a thicker single-edge stripe,
rail, or inset shadow. Status and selection do not live on one edge.

## Aliases

Semantic values reference primitives with `{ramp.step}`:

```json
"border": { "default": "{gray.200}" }
```

A value may combine several references (`"{space.2} {space.3}"`, a padding
shorthand); each resolves in place. The build resolves aliases at build time
and fails on dangling references.
Dark-theme values may also alias primitives (`{blue.400}`), and are validated
to override roles that exist in the light theme — dark is a remap, not new
vocabulary.

## Themes

Applied via `data-theme` on `<html>`; the boot script in the README falls back
to the OS preference before first paint. Emit only `:root` and
`:root[data-theme="dark"]` blocks — theme-specific component CSS is a bug.

## Contrast pairs

`tokens/contrast.json` lists every (fg, bg) role pair that can co-occur and
its minimum ratio (4.5 for text, 3.0 for large text/UI indicators). Alpha
backgrounds are composited over `bg.page` before measuring. The build prints
the full table; a failing row fails the build. Add a pair whenever you introduce
a role that text can sit on — an unchecked pair is an unchecked claim.

## Consuming tokens from JS

`dist/tokens.js` exports the resolved flat maps:

```js
import { light, dark, primitives } from "dakit/tokens";
```

Useful for canvas/SVG rendering and for tests that assert on colors.
