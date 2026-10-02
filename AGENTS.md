# dakit — working rules

Shared design system for the internal tools (dapier, dataops, dataqna,
relay). Tokens in, CSS/JS out; the build is the reviewer.

## The layer rule (non-negotiable)

- `tokens/primitives.json` — raw ramps and scales. Nothing outside this repo
  may reference a primitive token.
- `tokens/semantic.json` + `tokens/themes/dark.json` — roles. Applications and
  `css/components.css` use **only** these (`--dk-text-muted`, `--dk-danger-bg`…).
- Never hardcode a hex value in `css/`. If a style needs a color the semantic
  layer doesn't have, add the role to the token files instead — in both themes.

## Changing tokens

1. Edit `tokens/*.json` (a new primitive needs a reason; a new role needs both
   a light and a dark value and at least one real use).
2. If text can sit on it, add the pair to `tokens/contrast.json`.
3. `node build.mjs` — it must pass: aliases resolve, dark remaps every role it
   overrides, all contrast pairs meet WCAG AA. Fix the tokens, never the
   minimums.
4. Update `docs/` when the change is user-facing (a new role, a renamed token,
   a new component).

## Dark theme

Dark is a remap of the same roles, not a second design. Every key in
`tokens/themes/dark.json` must exist in the light theme (build-enforced).
Test changes in both themes — `showcase.html` has the toggle.

## Type, space, radius

Use the scales: `--dk-text-*`, `--dk-leading-*`, `--dk-space-*` (4px grid),
`--dk-radius-*`, `--dk-size-*`. No ad-hoc `13.7px`, no margins outside the
grid. Mono (`--dk-font-mono`) for quantities, timings, IDs, and code — data
should read as data, not prose.

## Components

`css/components.css` stays small: only vocabulary that at least two projects
share. One-off styling belongs in the app. Class prefix `dk-`. Components must
render correctly in both themes with no theme-specific rules.

## Generated files

`dist/` is build output (from `tokens/` + `css/`). Edit the sources, rebuild,
commit both.
