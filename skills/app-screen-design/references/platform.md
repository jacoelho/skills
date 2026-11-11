# Platform

How to build overlays, form fields, tables and theme switching from native HTML and CSS. Looks come from the style and
the [foundation](foundation.md); this file covers behaviour only.

## Support

- **Check each feature against the project's browser targets** (its browserslist, support policy or analytics) before
  relying on it. This file does not record which engines support what; that changes, and the targets differ per project.
- **For a feature some targets lack,** first build what works everywhere, then add the feature on top, using the
  fallback named here.
- **Load a polyfill only after feature detection fails**, never unconditionally.
- **Behaviour must not depend on a limited feature.** A menu without anchor positioning still opens, closes and takes
  the keyboard; it just sits in the wrong place.

## Choose the overlay

| Need | Element |
| --- | --- |
| Blocks the page: confirmation, form, destructive action | `<dialog>` opened with `showModal()` or `command="show-modal"` |
| Attached to a control, closes on an outside click: menu, picker, mention panel | `popover="auto"` |
| Stays until closed or timed out: toast | `popover="manual"` |
| A panel that does not block the page | `<dialog popover>`, or `dialog.show()` outside the top layer, with a visible close button |

Prefer invoker commands (`commandfor` with `command`) to click handlers that call the same methods.

## Modal dialogs

- **The browser already provides** an inert page, focus containment, Escape and the back gesture, and focus return to the
  opener. Do not add `role="dialog"`, `aria-modal`, a focus trap, an Escape handler or code that returns focus.
- **Name it** with `aria-labelledby` on its heading. Put `autofocus` on the first field, or on the safe action (Cancel,
  Keep) in a destructive confirmation.
- **Closing on a backdrop click:** `closedby="any"`. Where a target lacks it, keep a click handler that closes when the event
  target is the dialog itself, which works only when the dialog has no padding of its own.
  `closedby="none"` with a confirmation step suits a form with unsaved changes.
- **Run close logic on `close` and `cancel`**, not on `click`. Read `returnValue` in `close`, then reset it to `''`;
  Escape sets none and browsers differ on clearing the old one.
- **A Cancel that must honour unsaved changes** uses `command="request-close"` or `requestClose()`, which fires `cancel`
  first. When `cancel` is prevented, show why next to the control that receives focus, and do not move buttons under the
  pointer: reserve the message's space with `visibility`.
- **Stopping the page scrolling behind a modal:** `overscroll-behavior: contain` on `dialog:modal` and on `::backdrop`, plus
  `overflow: hidden` on `::backdrop`. Never set `overflow: hidden` or `position: fixed` on `html` or `body`: it removes the
  scrollbar, shifts the layout and breaks sticky elements. Where a target lacks the backdrop part, accept that the page
  can scroll there.
- **Never set `display` on `dialog` unconditionally**; scope it to `dialog[open]`.

## Popovers and menus

- **Open from a button** with `commandfor` and `command="toggle-popover"`, and put the popover directly after its button.
  The browser then toggles it on click, Enter and Space, closes it on an outside click, and lets a click on the open
  button close it. No page-wide click listener is needed.
- **Without a button** (right-click, the caret of an `@` mention), open with `showPopover({ source })`. To open at a point,
  pass a zero-size `position: fixed` placeholder moved to that point.
- **Position with CSS anchor positioning** and `position-try-fallbacks: flip-block, flip-inline`. Put placement rules
  inside `@supports (anchor-name: --a)`; without it the popover falls back to the browser's default placement, centred in
  the viewport.
- **Keyboard in a menu:** Enter or Space on the button opens it and focuses the first item; a pointer open leaves focus
  on the button. ArrowUp and ArrowDown move between items, Home and End jump, Escape closes and returns focus to the
  button, Tab leaves the menu. Move focus in the `toggle` event, not `command`, which fires before the menu opens.
- **Focus return covers only the first `popover="auto"` in a stack.** A nested menu returns focus to its own button in
  script.
- **Arrow keys:** use `focusgroup` only when every target supports it; otherwise handle arrows in script. Never both,
  since two roving-focus systems conflict.
- **A list of links reached with Tab is navigation, not a menu:** no `role="menu"` or `menuitem`; keep the popover,
  Escape and focus return.

## Opening and closing motion

This is the "menu opening" motion the skill allows; nothing else enters.

- **Open state** sets the visible values, `@starting-style` inside it sets the before-values, and the closed base state
  carries the exit. Without `@starting-style` the open snaps.
- **Transition `display` and `overlay`** with `transition-behavior: allow-discrete` declared on its own line after
  `transition`; inside the shorthand, browsers without it drop the whole declaration. Where a target cannot transition `overlay` or
  `display`, the close ends at once; accept that.
- **Reduced motion:** transforms only inside `@media (prefers-reduced-motion: no-preference)`, a short fade under `reduce`.
  Keep colour transitions. Never set `animation-duration: 0.01ms` globally. An element whose animation is off still ends
  in its final state.

## Toasts

- `popover="manual"`, added to one container that is a named region (`role="region"`, `aria-label="Notifications"`).
- **Announce** with `ariaNotify()` where every target supports it, otherwise one polite live region present from page
  load. Announce the visible text, not the button names.
- **A visible Close button** that Tab reaches without the toast stealing focus. When a focused toast closes, move focus to
  the next toast or back to where it was.
- **Nothing only a toast offers:** its information and actions also exist elsewhere on the screen.
- **Never inside or behind a modal.** Hold the toast until the dialog closes.

## Forms

- **Validate with the browser**: `required`, `type`, `pattern` (which must match the whole value), styled with
  `:user-invalid`, so errors appear after interaction or a failed submit, never at load.
- **Error text, not colour alone.** Start each message with an icon whose text alternative is "Error", or word it as an
  error.
- **Sync the accessibility tree.** Set `aria-invalid="false"` until `:user-invalid` matches, then `true`; add the message
  `id` to `aria-describedby` only while the field is invalid. Update on `blur`, `change`, `input` and `invalid`.
  Announce a new error through one polite live region, a moment later, never by making each message a live region.
- **After a failed submit**, focus the first invalid field, or an error summary on a long form.
- **Fields that grow with their content:** `field-sizing: content`, with `min-` and
  `max-` sizes.
- **Enter to submit** a field outside a form's own submit: skip when `event.isComposing` or `event.keyCode === 229`, so
  Japanese, Chinese and Korean input can confirm a word; some engines report composition late. Keep a real submit button.
- **Switches** are `<input type="checkbox" switch>` with a `<label>`, never a `div` with a click handler. Where `switch`
  is unsupported it renders as a plain checkbox: style it, or load `input-switch-polyfill` when
  `'switch' in HTMLInputElement.prototype` is false.

## Tables

- **Sortable column:** a `<button type="button">` filling the `<th scope="col">`, at least 24px tall, with a visible
  `:focus-visible` outline. `aria-sort` sits on the sorted `<th>` only; the direction icon is `aria-hidden` and drawn
  from `th[aria-sort]` in CSS.
- **First press sorts ascending, a repeat reverses**, a new column starts ascending, and focus stays on the button.
- **Sort by value, not display.** Read numbers, dates and money from `data-value` or `<time datetime>`; compare text with
  `Intl.Collator` and `numeric: true`. Declare each column's type rather than guessing.
- **Reorder rows in place.** Re-rendering the body loses focus. Announce the new order in one hidden `role="status"`, never
  `aria-live` on the table.
- **A header that changes when stuck** (scroll-state container queries) is an enhancement on top of a plain sticky
  header.

## Theme

- **`color-scheme: light dark`** on the root so form controls, scrollbars and system colours follow, and `light-dark()`
  for token pairs. A component that is always dark sets its own `color-scheme`.
- **Custom scrollbar colours** need `scrollbar-width` on macOS, and never animate `scrollbar-color`.
- **Accent colour on native controls:** a browser may keep a white or black check mark and adjust the colour behind it;
  test contrast in each target browser.

## Heavy screens

- **Long lists and tables below the first screen:** `content-visibility: auto` with `contain-intrinsic-size: auto <height>`
  on each heavy block. Never on blocks visible at load, where it delays the first paint.
- **Long work in one event handler** blocks the next interaction. Yield between chunks with `scheduler.yield()`,
  with a `setTimeout` fallback where a target lacks it.
