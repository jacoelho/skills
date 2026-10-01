# Evidence and operation

Perceptibility, meaning and control must remain available throughout the task, including transient states. Inspect only relevant requirements but account for unexercised ones.

| Claim | Evidence needed | Insufficient alone |
| --- | --- | --- |
| A control is reachable and operable | Actual supported input sequence for each in-scope modality and observed response | It appears in an element tree |
| A modal keeps the correct active task | Actual focus/input traversal, background unavailability/inertness and permitted dismissal; when the web APG dialog pattern or a project contract is adopted, inspect its visual-obscuration condition separately | A dim backdrop |
| Context returns correctly | Close/cancel sequence and returned state/focus | A screenshot of the open modal |
| A status update is announced | Actual relevant assistive-technology test | A live-region attribute |
| Content survives enlargement | The specified real enlargement condition and reachable content | A smaller screenshot or CSS transform |
| Same operations remain identifiable | Cross-surface labels/semantics and task context | Identical icon shapes |

Functional differences can justify different labels. Stable wording must not hide different scopes or destructive effects. Do not add redundant key handlers to controls that already implement the native interaction.

Handoffs name the unverified task, starting state, AT/user agent/OS/device and versions when available, input method and question to settle. They are not predicted user experiences.

## Avoid false focus-leak findings
Distinguish focus moving to a background application control from focus leaving the application/window for browser or system UI. Record the actual focused element and whether the application document/window still has focus. Do not block legitimate browser/system navigation merely to satisfy an over-broad test. A sampled focus trace is not proof of all keyboard behaviour.
