# Editorial calibration examples

These are constructed teaching examples, not measured outputs or factual
claims about a real organisation. Load only an example relevant to a recurring
failure. They are not a universal writing style or facts to import into drafts.
User-supplied accepted edits take precedence for the user's voice, within the
requirements for meaning and accuracy.

## 1. Unpack density rather than deleting meaning

Material: describe how the feature should behave before building it; this can
expose conflicting assumptions; change the description when requirements change.

Dense: "Explicit behavioural specification facilitates alignment by
externalising assumptions before implementation while preserving adaptability."

Possible repair: "Write down how the feature should behave before building it.
This gives the team a chance to spot conflicting assumptions. Update the
description when the requirements change."

Why: the action, benefit and revision condition are now distinct. This does not
establish a rule that every sentence must be short or every term non-technical.

## 2. Feedback should change the writing, not join it

Material: sketch the normal checkout path and one failure case before coding.
Editorial note: "This sounds academic. Make it concrete. Leave the mentoring
section for another article."

Leak: "This is a practical rather than academic exercise. Although mentoring
also matters, it falls outside this article's scope."

Possible repair: "Before coding, sketch what happens when checkout succeeds
and what happens when the payment fails."

Why: the direction affects the example. Neither rejected topic is resurrected.

## 3. Correct the claim, not an appended disclaimer

Superseded claim: "Generating code faster always increases the review backlog."
Author correction: "Only when submission volume outpaces completed reviews."

Defective repair: "Generating code faster always increases the review backlog,
although this depends on review capacity."

Possible repair: "The review backlog grows when more changes are submitted
than reviewers finish."

Why: the correction replaces the false generalisation.

## 4. Keep a necessary condition

Material: a retry avoids repeating the operation only when the service handles
that retry under the same idempotency key; explain only this supplied example.

Oversimplified: "Retries are safe."

Possible repair: "Reuse the same idempotency key when retrying the operation.
In this example, that lets the service recognise the retry rather than perform
the operation again."

Why: the narrower statement preserves the supplied condition and avoids a
universal claim about retries or implementations.

## 5. Leave effective prose alone

Original: "The queue grew because new requests arrived faster than the worker
could finish them. Adding more producers would make the problem worse."

Acceptable review: "No material reader-facing issue found."

Why: a reviewer need not replace direct prose with "demand-side concurrency
exceeded downstream processing capacity" or invent a mandatory improvement.

## 6. A missing premise is not a transition problem

Material: the town planted trees; energy bills fell. No causal evidence given.

Defective: "The town planted trees. Consequently, residents paid less for energy."

Review: "'Consequently' asserts a causal link not established by the material."

Repair decision: remove the claimed connection, preserve the two observations
only if both are relevant, or obtain the missing evidence. Do not insert a
plausible mechanism from general knowledge to make this example work.

## 7. Legitimate subject matter is not editorial leakage

Task: write an article about editing an interview transcript.
Selected point: editorial notes should stay separate from the published interview.

Valid prose: "Keep editorial notes in a separate document. The published
interview should contain the conversation, not instructions to its editor."

Why: this is the reader-facing subject, not a leaked instruction about the
current drafting session. A keyword blacklist would make the wrong decision.
