# Loading data for dialogs

**Rule: a dialog never opens half-loaded.** If a dialog needs data from the
server, load the data first and open the dialog once its content is ready.
Never call `showModal()` and then fetch: the dialog appears at one size,
then grows, its buttons move under the pointer, and on a phone sheet the
content jumps. That reflow is the bug this pattern exists to prevent.

While the data loads, the thing the operator clicked (the **trigger**) shows
that it is working. If the load is slow, or the trigger has no room for a
spinner, the dialog's own backdrop appears with a small centred spinner.
A failed load opens nothing.

Dialogs whose content is already in memory (a confirm, a form for a new
record) open immediately. This pattern is only for dialogs that fetch.

## Timeline

| Elapsed | Button trigger (`.dk-button`, `.dk-icon-button`, `<button>`) | Other trigger (table row, card, list item) |
|---|---|---|
| 0 | `aria-busy="true"`, `aria-disabled="true"`; looks unchanged; further clicks ignored | same |
| `--dk-loading-delay-busy` (150ms) | label swaps for a spinner at the button's exact size | loading overlay opens |
| `--dk-loading-delay-overlay` (500ms) | loading overlay opens | — |
| data in | trigger restored, overlay closed, dialog opens complete | same |
| load fails | trigger restored, overlay closed, error toast with Retry; no dialog | same |

Most loads finish under 150ms, and then nothing visible happens before the
dialog opens. That is deliberate: a spinner that flashes for 40ms reads as
a glitch.

## The pieces

### Busy trigger: `[aria-busy="true"]`

Set `aria-busy="true"` (and `aria-disabled="true"`) on the trigger while its
data loads. On `.dk-button` and `.dk-icon-button` the label and icon hide
after `--dk-loading-delay-busy` and a spinner takes their place, centred, in
the button's own text colour. The box keeps its exact width and height, so
nothing next to it moves. Any other element with `aria-busy="true"` gets the
progress cursor.

Busy is **not** `disabled`. A disabled button drops keyboard focus to
`<body>` and turns grey, which would flash on every fast load. A busy button
keeps its colours and its focus, and its label stays in the accessibility
tree.

### Spinner: `.dk-spinner`

`<span class="dk-spinner" role="status" aria-label="Loading"></span>` is
16px; `.dk-spinner--lg` is 24px. On a surface it draws `--dk-spinner-color`
(the accent) over `--dk-spinner-track`. Inside a button it takes the
button's text colour. It too stays hidden for `--dk-loading-delay-busy`, so
a spinner you drop into a pane does not flicker on fast loads. With
`prefers-reduced-motion: reduce` it does not rotate. It stays a still ring,
and `aria-busy` still announces the state.

There is one spinner in the system. Do not draw your own.

### Loading overlay: `dialog.dk-loading`

When a load runs long, `openWhenReady` opens a modal
`<dialog class="dk-loading">`: the standard dialog backdrop with a small
raised panel holding a large spinner and a label ("Loading run…"). It is
modal, so the page is inert while the load runs. Escape or a click on the
backdrop cancels the load.

**Why an overlay and not an empty dialog shell with a spinner inside.** A
shell would have to guess the final dialog's size. Dialogs differ in width
(`--dk-dialog-width`), their height depends on the data, and at 820px and
below the dialog is a full-screen sheet. Every wrong guess is the reflow
this rule forbids. The overlay never pretends to be the dialog. The backdrop
the operator sees while waiting is the same backdrop the dialog opens on, so
the change is one swap: the small status panel is replaced by the finished
dialog. Nothing resizes.

### Error toast: `.dk-toast.dk-toast--danger`

A failed load must not leave an empty or broken dialog on screen. Instead the
trigger is restored and a toast appears at the bottom centre. It has
`role="alert"`, the message, a **Retry** button and a dismiss button. Retry
runs the same load again. The toast does not take focus, so focus stays on
the trigger. If the page has a better place for the error (an inline
`.dk-field-error` next to a form row, a `.dk-callout` in a pane), pass
`onError` and render it there.

## `openWhenReady` (dist/dialogs.js)

Load `dist/dialogs.js` once per page (it also provides backdrop dismissal).
It exposes `globalThis.dakitDialogs.openWhenReady`:

```js
button.addEventListener("click", () => {
  dakitDialogs.openWhenReady(
    button,                                        // the trigger
    (signal) => fetch(`/api/runs/${id}`, { signal }).then((r) => {
      if (!r.ok) throw new Error(r.statusText);
      return r.json();
    }),
    (run) => {                                     // fill, then return the dialog
      dialog.querySelector("h2").textContent = run.name;
      renderSteps(dialog, run.steps);
      return dialog;                               // the helper calls showModal()
    },
    { label: "Loading run…" },
  );
});
```

`openWhenReady(trigger, load, render, options?)`

- `load(signal)` returns the data or a promise for it. Pass `signal` to
  `fetch` so a cancelled load stops the request.
- `render(data, signal)` fills the dialog and returns it. The helper calls
  `showModal()`, unless `render` already opened the dialog itself (a
  framework that mounts its own). It may be async. If it throws, that is
  handled as a load error. It never runs after a cancel.
- `options.label`: the overlay text (default "Loading…"). Name the object:
  "Loading sponsor…".
- `options.spinner`: `"inline"` or `"overlay"`. By default buttons get
  `"inline"` (escalating to the overlay at `--dk-loading-delay-overlay`), and
  anything else gets `"overlay"` at `--dk-loading-delay-busy`.
- `options.onError(error, retry)` replaces the default toast. Call `retry()`
  to run the load again.
- `options.errorMessage`: toast text, a string or `error => string`.
  Operator copy, never a stack trace. The default is "Couldn't load this.
  Check your connection and try again."

It returns a promise that never rejects:
`{ status: "open", dialog, data }`, `{ status: "aborted" }` or
`{ status: "error", error }`.

Behaviour you get for free:

- **Double-click guard.** While a trigger is busy, its clicks are swallowed
  before your handlers run, and calling `openWhenReady` again with the same
  trigger returns the in-flight promise. One load, one dialog.
- **Newest intent wins.** Starting a load from a different trigger cancels the
  running one: its `signal` aborts, and its `render` never runs.
- **Cancel.** Escape cancels a pending load, before or after the overlay
  appears. When the trigger sits inside an open dialog, that dialog stays
  open. A click on the overlay's backdrop cancels too.
- **Focus.** Focus stays on the trigger while it loads, returns to it after
  a cancel or error, and returns to it when the opened dialog closes.

## Timing tokens

| Token | Value | Meaning |
|---|---|---|
| `--dk-loading-delay-busy` | 150ms | grace before any spinner shows; rows get the overlay here |
| `--dk-loading-delay-overlay` | 500ms | a busy button hands over to the overlay |
| `--dk-spinner-duration` | 800ms | one full turn |
| `--dk-spinner-size` / `--dk-spinner-size-lg` | 16px / 24px | inline / overlay |
| `--dk-spinner-stroke` | 2px | ring thickness |
| `--dk-spinner-color` / `--dk-spinner-track` | accent / border-default | ring on a surface (both themes) |

`openWhenReady` reads the two delays from the computed tokens, so CSS and JS
always agree. Do not hardcode timings in apps.

## Without the helper

Frameworks that own their dialogs follow the same contract by hand. Set
`aria-busy`/`aria-disabled` on the trigger and ignore its clicks while the
load runs. Fetch, render, then `showModal()`. Past the threshold, show a
`dialog.dk-loading` (markup below). On failure, show the error where the
operator acted and open nothing.

```html
<dialog class="dk-loading" aria-label="Loading run…" aria-busy="true">
  <div class="dk-loading__body">
    <span class="dk-spinner dk-spinner--lg" aria-hidden="true"></span>
    <span class="dk-loading__label">Loading run…</span>
  </div>
</dialog>
```

## Review checklist

- No `showModal()` (or a framework's `open = true`) before the data the
  dialog shows has arrived.
- No dialog whose body starts as "Loading…", a skeleton, or empty and then
  fills in.
- The trigger has a busy state, ignores double clicks, and keeps its size.
- A failed load leaves no dialog open and offers Retry.
- Data that changes after the dialog is open (a save, a refresh) is a
  different case. Busy the button that started it inside the dialog. Do not
  re-open the dialog.
