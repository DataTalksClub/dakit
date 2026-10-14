# Device login: the approval page

The browser half of the family's device-authorization flow (RFC 8628-shaped):
a CLI prints a code, the person approves it in the browser, and the CLI
receives a token. dakit owns the page anatomy, the copy, the
`dk-auth-*` / `dk-code-input` styles and `js/device-code.js`. The wire
contract (endpoints, error vocabulary, budgets, hashing) is owned by the
auth repo. It's summarised here only where the UI depends on it. Source:
`~/tmp/agent-reports/dakit-device-login-inventory.md` §8, research §9.

Pocketshell's `/device` is the blueprint. dataops is the nearest
dakit-native implementation. dapier's single-step, approve-only form is the
anti-pattern this replaces.

---

## 1. Principles

1. **The page is a decision, not a form.** Someone is about to give a
   machine their identity. The page shows what's asking, from where, and
   for how long, and makes **Deny exactly as easy as Authorize**.
2. **A link never approves.** `?code=` from `verification_uri_complete`
   only fills in the field. The person still compares it with the
   terminal and presses Continue. There's no auto-lookup and no
   auto-approve (RFC 8628 §5.4, the cross-device BCP, Storm-2372).
3. **Focus never lands on Authorize.** After each step, focus goes to the
   step heading. A stray Enter must not grant access.
4. **The code is never altered behind the person's back.** Input is
   normalised (case, separators) but **never truncated**. Too-long or
   invalid input produces a sentence, not a silently shortened code.
5. **One sentence per failure, and it says what to do next.** Never show
   a status code, an error id, or whether a code "exists".

## 2. Page shell (`.dk-auth-page`)

The device page doesn't render inside the app shell. A sidebar next to a
consent decision is noise, and the dataops embedding is retired.

```
┌──────────────────────────────────────────────┐
│ DataOps                    grace@example.com │ .dk-auth-page__bar 48px
│                                              │
│        ┌──────────────────────────────┐      │
│        │ .dk-auth-card                │      │
│        └──────────────────────────────┘      │
│                                              │
└──────────────────────────────────────────────┘
```

- `.dk-auth-page` uses `min-height: 100dvh; display: grid; grid-template-rows: auto 1fr; background: var(--dk-bg-page);`.
- `.dk-auth-page__bar` uses `height: var(--dk-size-topbar); display: flex; align-items: center; justify-content: space-between; padding: 0 var(--dk-space-4);`.
  It has no border: the bar is a plain line of text, not a band.
  - On the left is the wordmark (`.dk-brand__name`), linking home.
  - On the right is the identity line, `role="status"`, in
    `--dk-text-sm` muted. When signed in it shows the email plus a "Switch
    account" link that returns to the same `?code=`. This line matters:
    the person must see *which* account will be granted.
- `.dk-auth-page__main` uses `display: grid; place-items: start center; padding: var(--dk-space-8) var(--dk-space-4);`.
  The card sits in the upper third, not dead centre, so the layout doesn't
  jump between states.
- `<meta name="viewport" content="width=device-width, initial-scale=1">`,
  `<meta name="robots" content="noindex">`, and `Cache-Control: no-store`
  on the page and on every device API response.
- The theme is the app's stored `dakit-theme`. There's no toggle on this
  page.

## 3. The card (`.dk-auth-card`)

- `width: min(416px, 100%); background: var(--dk-bg-surface); border: 1px solid var(--dk-border-default); border-radius: var(--dk-radius-lg); padding: var(--dk-space-7);`
  (`var(--dk-space-5)` at ≤480px). There's no shadow. It's a static
  container, not an overlay.
- Slots, top to bottom, all `display: grid; gap: var(--dk-space-4)`:
  - `.dk-auth-card__head`: `h1.dk-auth-card__title` (`--dk-text-xl`,
    semibold, `tabindex="-1"` so it can receive focus) and
    `p.dk-auth-card__lede` (`--dk-text-body`, muted).
  - `.dk-auth-card__body`: the step content.
  - `.dk-auth-card__actions`: `display: grid; grid-template-columns: 1fr 1fr; gap: var(--dk-space-3);`.
    The two decision buttons are the **same width and height**
    (`.dk-button--lg`). A single action spans both columns.
  - `.dk-auth-card__foot`: optional, `--dk-text-sm` muted, separated by a
    1px `--dk-border-default` top hairline with
    `padding-top: var(--dk-space-4)`.
- One card, one state at a time. Steps swap the card's contents in place,
  and the card never resizes horizontally.

## 4. States

### 4.1 Enter

```
Authorize a device
DataOps CLI asked to sign in as you. Enter the code
shown in your terminal.

Device code
┌────────────────────────────┐
│        BCDF-GHJK           │  .dk-code-input
└────────────────────────────┘
Check that this matches your terminal exactly.     (only when prefilled)

[            Continue            ]
```

- Title: "Authorize a device". Lede: "`<App>` CLI asked to sign in as you.
  Enter the code shown in your terminal."
- `.dk-field` with `<label for="device-code">Device code</label>` and an
  `input.dk-input.dk-code-input#device-code` with
  `autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="text" enterkeyhint="go"`
  and `aria-describedby` pointing at the hint and the error.
  **No `maxlength`**, because the input must never truncate.
- When `?code=` is present, the input is prefilled through
  `formatUserCode`. A hint reads "Check that this matches your terminal
  exactly." Focus goes to the title, not to Continue. The URL is then
  cleaned with `history.replaceState`, so the code doesn't linger in
  history.
- **Continue** (primary, spans both columns). It's disabled until
  `normalizeUserCode` returns `ok`. Pressing Enter in the field submits.
- Client-side errors show under the field (`.dk-field__error`,
  `role="alert"`, `--dk-danger-text`, `--dk-text-sm`) and set
  `aria-invalid="true"`:
  - Too short: "Codes have 8 characters. This one has 6."
  - Too long: "Codes have 8 characters. This one has 9. Check for an
    extra character." The full input stays visible.
  - Invalid character: "Codes don't use the letter "A". Check the code in
    your terminal." Name the first offending character. Lowercase letters
    are never offending.
- Busy: Continue shows "Checking…" with `aria-busy="true"` and is
  disabled, while the field stays editable. An edit cancels the in-flight
  lookup (request sequencing: a stale response never paints).

### 4.2 Review

```
Authorize this device?
It will be able to act as grace@example.com in DataOps
for 90 days, until you sign it out.

Code          BCDF-GHJK
Machine       grace@build-box          reported by the machine
Requested     203.0.113.7
Started       14:02 · 2 min ago
Expires in    7:41

┌ ⚠ This request came from a different network. ───────┐  .dk-callout--warning
│ Only continue if you started this login yourself on  │  (only when
│ that machine.                                        │   same_network = false)
│ [ ] I started this login on that machine             │
└──────────────────────────────────────────────────────┘

[      Deny      ] [    Authorize    ]
```

- The title receives focus. The lede states **who, where and how long** in
  plain words: the signed-in identity, the app, and the token lifetime
  supplied by the app ("for 90 days, until you sign it out"). When the app
  has scopes (agent-hub), add "with access to: `scope`, `scope`" and render
  the scope list in the extension slot `.dk-auth-card__extra`, where an
  app may make it editable.
- Facts use `.dk-dl`, with values in `.dk-mono`:
  - **Code**: the formatted code, so the person can compare it a second time.
  - **Machine**: the label, followed by a muted `--dk-text-sm` note
    "reported by the machine". The label is untrusted. It's
    rendered as text, already sanitised server-side, and wrapped with
    `overflow-wrap: anywhere`.
  - **Requested from**: the request IP (server truth).
  - **Started**: local time plus relative time.
  - **Expires in**: an `m:ss` countdown based on the **server clock**
    (`expires_at − now` from the response, offset applied locally). It
    updates every second visually, while its `aria-live` stays off. At
    60s it reads "Expires in 0:59" and the row gains
    `.dk-badge--warning`. At 0 the card switches to the Expired error.
- Same-network warning: when `same_network === false`, a
  `.dk-callout--warning` (fill only) contains a `.dk-check` checkbox
  "I started this login on that machine". **Authorize stays disabled until
  it's checked.** When `same_network` is unknown, this is omitted.
- Actions: **Deny** (`.dk-button--secondary`, left) and **Authorize**
  (`.dk-button--primary`, right), equal size. Both are double-submit-proof:
  the first click disables both and shows "Authorizing…" or "Denying…".
  Deny isn't styled as danger. Saying no is the safe, ordinary choice.
- Foot: "Didn't start this? Deny it. Nothing is shared." and "Wrong
  account? Switch account".

### 4.3 Result

There's one action-free state per outcome. Focus moves to the title, which
has `role="status"` wrapping the title and lede.

- **Approved.** Title: "Device authorized". Lede: "Return to your
  terminal. The CLI finishes signing in within a few seconds." Below it, a
  `.dk-code-block` showing `<app> logout` with a Copy button and the line
  "Run this on that machine to sign it out." When the app has a sessions
  page, a link to it ("Manage CLI sessions") goes in the foot. A 20px
  check icon in `--dk-success-text` sits before the title. There's no
  coloured card.
- **Denied.** Title: "Request denied". Lede: "Nothing was authorized and
  the code no longer works. If you meant to sign in, run `<app> login`
  again."
- Neither state offers a "back" action. A finished code is dead.

### 4.4 Errors

Each error replaces the card body with a `.dk-callout` (`role="alert"`) and
one recovery action. The title becomes the error's title and receives focus.

| Condition (wire) | Title | Sentence | Action |
|---|---|---|---|
| 404 on lookup or approve (unknown, expired, used, or viewed by another account; deliberately indistinguishable) | Code not found | "This code is wrong, expired, or already used. Run `<app> login` again for a new one." | "Enter another code" → Enter (empty) |
| Countdown reached 0 | Code expired | "Codes last 10 minutes. Run `<app> login` again for a new one." | "Enter another code" |
| Attempt budget exhausted. Only use this row when the app's API says so explicitly; the canonical contract returns 404, which maps to Code not found. | Too many attempts | "This code is locked after too many tries. Run `<app> login` again." | "Enter another code" |
| 429 | Slow down | "Too many codes tried from this account. Wait a few minutes and try again." | "Try again" (disabled for the `Retry-After` seconds, mono countdown) |
| 401 (not signed in) | Sign in to continue | "Sign in to `<App>` to authorize this device. You'll come back here with your code." | "Sign in" → login with `next=/device?code=<formatted>` |
| Network or 5xx | Couldn't reach `<App>` | "Check your connection and try again. Your code is still valid until it expires." | "Try again" (repeats the last request; keeps the state) |
| Decision race (already decided elsewhere) | Code not found | as 404 | as 404 |

Status tones: Not found, Expired and Too many use `--danger`. Slow down
and Sign in use `--warning`. Network uses neutral. These are never
outlined.

## 5. `.dk-code-input`

- It extends `.dk-input` with `height: var(--dk-size-control-lg)` (40px).
  At ≤820px or `(pointer: coarse)` it gets `min-height: var(--dk-size-touch)`.
  Styling: `font-family: var(--dk-font-mono); font-size: var(--dk-text-xl); font-weight: var(--dk-weight-medium); letter-spacing: 0.12em; text-align: center; text-transform: uppercase; font-variant-numeric: tabular-nums;`.
- The placeholder is `XXXX-XXXX` in `--dk-text-faint`, with
  `text-transform: none` so it looks like a mask, not a value.
- It's one field, not eight boxes. Paste, autofill and screen readers all
  work on one field, and the hyphen is inserted as you type.
- Its width fills the card. On mobile the field must stay ≥ 16px
  computed font size, which `--dk-text-xl` already satisfies (no iOS zoom).

## 6. `js/device-code.js` → `dist/device-code.js`

These are pure functions with no DOM requirement (usable server-side in
Node and in workers). There's also one optional binder.

```js
export const USER_CODE_ALPHABET = "BCDFGHJKMNPQRSTWXZ23456789"; // canonical: no vowels, no L/V, no 0/1
export const USER_CODE_LENGTH = 8;

// Strip whitespace and separators (- – — . _), uppercase. Never truncate.
// → { ok: true, code: "BCDFGHJK", display: "BCDF-GHJK" }
// → { ok: false, error: "too_short" | "too_long" | "invalid_char", length, char?, display }
export function normalizeUserCode(raw, { alphabet = USER_CODE_ALPHABET } = {});

// Display form for live input: uppercase, separators removed, hyphen after
// every 4th char. Keeps every character (invalid and overflow included).
// formatUserCode("bcdfghjkx") === "BCDF-GHJK-X"
export function formatUserCode(raw);

// Optional: wires an <input> — formats on input while preserving the caret
// position relative to non-separator characters, handles paste, and
// dispatches "dk-code-change" with the normalizeUserCode result.
export function bindCodeInput(input, { alphabet } = {}): () => void; // returns unbind
```

- Apps whose servers still issue L or V (dataops and pocketshell today)
  pass `alphabet: "BCDFGHJKLMNPQRSTVWXZ23456789"` until they migrate. The
  validator must accept every code the server issues.
- `display` is always `formatUserCode(raw)`, so error copy can quote what
  the person actually typed.
- Unit tests in `test/` cover case folding, every separator,
  pasted-with-spaces, the overlong rule (9 or more is an error, not a
  slice), invalid-char reporting, and the caret.

## 7. Accessibility

- One `h1` per state. Focus moves to it on every state change.
  `aria-live` isn't used on the whole card.
- Field errors: `role="alert"`, linked through `aria-describedby`, plus
  `aria-invalid`.
- The countdown isn't live. When 60 seconds are left, one polite
  announcement says "One minute left to decide".
- The disabled Authorize behind the acknowledgement checkbox gets
  `aria-describedby` pointing at the warning callout, so the reason is
  announced.
- All controls are ≥ 44px at ≤820px or `(pointer: coarse)`. Facts switch
  to `.dk-dl--stacked` at ≤480px.
- Copy, labels and errors are plain text. The machine label is never
  injected as HTML.

## 8. Session list (optional, `.dk-session-list`)

For apps that expose CLI sessions in the browser (the target is dataops,
following pocketshell), use one bordered container with divided rows. Each
row shows the label (medium), a mono meta line with the IP, "created",
"last used" and "expires", and one `Sign out` `.dk-button--sm.dk-button--danger`
that asks for confirmation through `.dk-dialog`. The header holds "Sign out
all" (danger, separated). The empty state reads: "No CLI sessions. Run
`<app> login` to create one." Implement this only when a second app
needs it. Until then, it stays a recipe in this file.

## 9. Showcase

`showcase-device.html` renders every state in §4, both themes, at 1440 and
390. That's Enter (empty, prefilled, each client error), Review (plain and
with the different-network warning), Approved, Denied, and each error row.
