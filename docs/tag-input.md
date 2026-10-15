# Tag input (`.dk-tag-input`)

A multi-select from a known vocabulary: the chosen values sit in the field as
removable chips, and typing filters a dropdown of the rest. Use it instead of
a checkbox grid once a vocabulary outgrows a handful of options (a task's
required accounts, reviewers, labels). Under about six options that rarely
change, plain `.dk-check` checkboxes stay clearer: everything is visible
without typing.

It picks only from the options it is given. Free text that matches nothing is
never added; creating new vocabulary is a separate action in the app.

## Use

Load `dist/tag-input.js` once (classic script; ES-module apps can
`import "./dakit/tag-input.js"` for its side effect), then build one per field:

```js
const tags = dakitTagInput.create({
  options: [
    { value: "youtube", label: "YouTube", aliases: ["yt", "video"], icon: () => renderIcon("video") },
    { value: "finom", label: "Finom", aliases: ["bank"], group: "Finance" },
  ],
  value: ["finom"],                  // chosen values, in order
  labelledBy: "needs-label",         // or label: "Needs"
  placeholder: "Add a resource…",
  noMatches: "No matches",
  onChange(values, change) {},       // change = { added } or { removed }
});
host.append(tags.element);
```

The handle also has `getValue()`, `setValue(values)`, `setOptions(options)`,
`setDisabled(flag)`, `focus()`, `open()` and `close()`, and `input` (the
combobox element). `setValue` does not call `onChange`.

- **Matching**: case-insensitive substring on the label and every alias.
  Label-prefix matches rank first; otherwise vocabulary order holds. The
  matched part of the label is set in semibold.
- **Icons**: `icon` is a function returning a Node (called per render), a Node
  (cloned), or a short string. It shows on the option and on the chip, at
  16px in `--dk-text-muted`.
- **Groups**: options with a `group` render under that heading, in the order
  the groups first appear. Groups with no match disappear.
- **Chosen options** leave the list; removing a chip puts them back.

## Keyboard, mouse, touch

| Input | Does |
|---|---|
| typing | opens the list and filters it; the best match is active |
| ↓ / ↑ | open the list; move the active option (wraps) |
| Enter | adds the active option, clears the text, keeps the list open |
| Backspace in an empty field | removes the last chip |
| Esc | closes the list; a second Esc clears the text; with both done it reaches the dialog |
| Tab | closes the list and moves on (chip remove buttons are in the tab order) |
| click or tap the field | focuses the input and opens the list |
| click or tap an option | adds it; focus stays in the field |
| click or tap × | removes the chip; focus returns to the field |

## ARIA

The ARIA 1.2 combobox pattern: the input is `role="combobox"` with
`aria-expanded`, `aria-controls` (the listbox), `aria-autocomplete="list"`
and `aria-activedescendant` pointing at the active `role="option"`. Groups
are `role="group"` labelled by their heading. The chips are a `<ul>` labelled
"Selected <label>" that the input references with `aria-describedby`, and
each remove button is "Remove <label>". A polite status region announces
"Added YouTube. 2 selected." and "No matches".

## Look

The field is a `.dk-input` (neutral 1px border, focus ring on the field when
the input has focus). Chips are neutral: muted fill, `--dk-border-strong`
border, primary text, never a status or accent color. The popup is a
`.dk-menu` surface with `--dk-shadow-overlay`, capped at
`min(288px, 50vh)` and scrolling inside; the active option takes
`--dk-bg-hover`. On phones and coarse pointers the field is 44px, options
44px, chips 32px with a 32px remove button, and the input text is 16px so iOS
does not zoom. The popup spans the field's width and stays inside it, so it
works at 375px.

## Saving

The component only reports changes. An app either saves on each `onChange`
(optimistic, reverting with `setValue` on failure) or keeps the draft and
saves once with an explicit button. Prefer saving per change when the API
takes a single field update cheaply and concurrent saves can be serialised;
keep one Save when each save is a versioned, audited mutation.
