# Principles

The merged philosophy behind dakit, drawn from what already worked in the
existing tools. These are the arguments to reach for when a style question
isn't settled by a token.

## 1. Calm surfaces, one accent

Neutral gray surfaces do the work; color is spent in exactly one place — the
accent — plus semantic status. A screen should pass the squint test as
structure, not as confetti. Inherited from dataops (Primer-style neutrals) and
dapier ("one signal green" → here: one signal blue). Accent borders are
strictly forbidden: no colored outlined alert or callout boxes, no status- or
accent-colored perimeters, and no colored left stripes, top bars, rails, or
inset edge shadows. Borders are always neutral, 1px, and even on all sides.
Status is communicated via tinted background fills (`--dk-*-bg`) plus
text/icon/badge (badges are fill-only). The single exception to colored
outlines is the keyboard focus indicator (`outline` with `--dk-focus-ring`
on `:focus-visible`).

## 2. Color is status, not decoration

Blue = interactive/accent. Green, amber, red appear only to report state
(success, warning, danger) — never to make something prettier. If a warning
chip wouldn't be amber when the state isn't a warning, it isn't amber. A
corollary: the fewer colored things on a page, the more the colored ones are
worth.

## 3. Data reads as data

Quantities, timings, IDs, and code render in IBM Plex Mono. Prose renders in
Inter. The typeface alone answers "is this a value or a sentence?"

## 4. No vanity metrics

A working screen shows the work, not a scoreboard about the work. Summary
stat strips, KPI tiles and count bars that restate what the list below
already says ("25 Transactions · 7 Evidence missing · 0 Conversions open",
"0 Total · 0 Upcoming · 0 Drafting") are not allowed: they aren't
actionable, they push the actual work below the fold, and a zero tile is
noise. Instead:

- Show the actionable list itself — a "Needs attention" register where each
  row names the problem and carries its fix.
- Allow at most **one** inline actionable count, in a heading or a button
  that does something with it: "Review 7 open items", "Needs attention · 7".
- Say a count once. A header count, an "N shown" next to the search and a
  tile with the same number is three copies of one fact; keep the one in the
  heading (or none) and drop the rest. A filtered result says "No matches"
  when it's empty, not "0 shown".

Do:

```
August 2026 close                         [Review 7 open items]
Needs attention
  MISSING EVIDENCE  Go Daddy · 21 Aug · €105.70          [Attach evidence]
```

Don't:

```
August 2026 close
┌ Transactions 25 ┬ Evidence missing 7 ┬ EUR conversions 0 ┬ Package — ┐
Review queue · 503 documents      [Search…]  503 shown
```

The exception is a genuine performance or analytics view, where the numbers
*are* the content — e.g. a newsletter campaign's opens, clicks and CTR. There
`.dk-stat-strip` is the one allowed form, and every figure carries a
comparison or a trend in `__meta` ("+1.2 pp vs last 4 issues", "median of
the last 10"). A number with nothing to compare it against isn't a metric;
leave it out.

## 5. Contrast is a build error, not a code review comment

Every text/background pair that can co-occur is declared in
`tokens/contrast.json` and measured at build time in both themes. AA (4.5:1)
is the floor. The projects' history is the reason: dapier checks pairs
numerically, dataops once shipped a muted gray that measured 3.03:1 and had to
be recalled.

## 6. Dark is a remap, not a redesign

The dark theme changes the values of the same roles — never the vocabulary,
layout, or component structure. Both themes are first-class; nothing ships in
one only.

## 7. Self-hosted, dependency-free

Fonts ship from the repo (SIL OFL); the system is plain CSS and JSON with no
runtime dependencies. Internal tools must not make third-party requests, and a
design system that needs a build pipeline to consume is a design system teams
will skip.

## 8. Tokens carry opinions, docs carry reasons

The JSON says what is allowed; these principles say why. When a request fights
a token, resolve it here first — and if the principle loses, change the
principle deliberately instead of quietly bypassing the token.
