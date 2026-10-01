# Overlay lifecycle checklist

## Select the surface deliberately
Use an interruption only when the task warrants one. Consider inline work, a nonmodal panel or a dedicated screen when comparison, navigation or sustained editing requires it. Task complexity, context and platform conventions matter more than an arbitrary field count.

## Entry
Record the invoking control, object, parent state and relevant background context. Identify the overlay clearly. Establish sensible initial focus/attention, including readable introductory content or the safer choice for consequential decisions where appropriate. Do not put interaction behind an invisible surface.

## During
For a modal, keep interaction in the active task and make the background unavailable by the platform's appropriate mechanism. For a nonmodal surface, retain the promised access to background content. Keep focus visible and content/actions reachable as available width/height changes. Separate nonmodal menus/popovers from blocking task dialogs.

Validate without losing correct input. Explain the error and repair path. Represent pending work truthfully, prevent accidental duplicate effects where necessary, and define whether/how it may be cancelled. Never label a pending operation complete.

## Exit
Inventory applicable routes: explicit Cancel/Close, platform back, escape-like command, outside interaction, success, navigation, timeout. Decide which are allowed for this task. Do not impose backdrop-click dismissal universally.

A dirty draft requires the documented preserve/discard/confirmation policy. Restore the invoking context on cancellation. After success, propagate updated information and present the new state. If the invoker is gone, use a logical workflow destination. Test reopening and changing parent context; stale drafts and names must not leak between objects.

## Multiple overlays
Avoid nested blocking tasks where a simpler flow works. When needed, specify the stack, which task is active, how dismissal unwinds and where attention returns. A top-level layer constant is not proof that any of this works.

## Evidence
Capture parent, overlay, error/pending where present and exit result. Supplement screenshots with actual operation and state tests. A crop of the dialog alone cannot establish background inertness or restoration.

Web reference: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
This is an interaction reference for web dialogs, not a requirement to implement every platform using ARIA or a particular widget library.
