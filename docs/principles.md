# Principles

The merged philosophy behind dakit, drawn from what already worked in the
existing tools. These are the arguments to reach for when a style question
isn't settled by a token.

## 1. Calm surfaces, one accent

Neutral gray surfaces do the work; color is spent in exactly one place — the
accent — plus semantic status. A screen should pass the squint test as
structure, not as confetti. Inherited from dataops (Primer-style neutrals) and
dapier ("one signal green" → here: one signal blue). Colored left stripes,
top bars, rails, and inset edge shadows fail this test: they spend color on
decoration instead of on the control or the status badge.

## 2. Color is status, not decoration

Blue = interactive/accent. Green, amber, red appear only to report state
(success, warning, danger) — never to make something prettier. If a warning
chip wouldn't be amber when the state isn't a warning, it isn't amber. A
corollary: the fewer colored things on a page, the more the colored ones are
worth.

## 3. Data reads as data

Quantities, timings, IDs, and code render in IBM Plex Mono. Prose renders in
Inter. The typeface alone answers "is this a value or a sentence?"

## 4. Contrast is a build error, not a code review comment

Every text/background pair that can co-occur is declared in
`tokens/contrast.json` and measured at build time in both themes. AA (4.5:1)
is the floor. The projects' history is the reason: dapier checks pairs
numerically, dataops once shipped a muted gray that measured 3.03:1 and had to
be recalled.

## 5. Dark is a remap, not a redesign

The dark theme changes the values of the same roles — never the vocabulary,
layout, or component structure. Both themes are first-class; nothing ships in
one only.

## 6. Self-hosted, dependency-free

Fonts ship from the repo (SIL OFL); the system is plain CSS and JSON with no
runtime dependencies. Internal tools must not make third-party requests, and a
design system that needs a build pipeline to consume is a design system teams
will skip.

## 7. Tokens carry opinions, docs carry reasons

The JSON says what is allowed; these principles say why. When a request fights
a token, resolve it here first — and if the principle loses, change the
principle deliberately instead of quietly bypassing the token.
