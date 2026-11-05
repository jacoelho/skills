# Change handling

Do not treat every disagreement as permission to rewrite the requirement.

## Diagnose before editing

For a syntax-only correction, translate the settled obligation into [EARS](ears.md) while preserving applicability, response, prohibitions, quantifiers, and authority. A change from permission to guarantee is a semantic change, not formatting. Keep quoted external sources intact and refer to their binding clauses from local EARS statements.

Classify each disagreement with [the source mismatch classes](mismatch.md) before synchronising sources; the class names the source to repair.

When a contract changes, preserve enough prior wording and decision history for a reviewer to see what changed and why, following repository convention. Keep that history outside the current contract; readers should not have to apply a sequence of contradictory amendments to learn the active rule.

Keep unresolved replacement proposals in the working record. Challenging an existing obligation does not retire it: retain its identified source until an authorised revision or governing source settles what applies, and isolate work that depends on the conflict.

## Impact envelope

Trace the changed obligation to related rules, examples, verification, interfaces, consumers, existing data, pending work, and in-flight operations when they can affect this increment. Inspect direct references and the few semantic dependencies needed to avoid a false handoff; do not turn the impact pass into an inventory of the whole system.

For a deliberate change to shipped behaviour, identify coexistence or correction obligations only when an existing external contract, deployed behaviour, persisted data, in-flight operation, compatibility promise, or other binding constraint requires them. A new or greenfield requirement does not create a migration obligation by itself.

When target and deployed contracts differ, name each applicable version and any transition rule separately. Do not replace a deployed obligation with the target rule until the binding transition permits it.

List which earlier results are invalidated and which remain relevant. An unchanged test name does not preserve evidence after its expectation, implementation, fixture, or environment changes.

## Reconcile the assignment

Identify the contract revision in the next handoff. Communicate changed obligations and cancelled work to affected implementers, and point them to the evidence they must refresh. Independent work can continue when it does not depend on the changed decision.

Distinguish recommending a correction from possessing authority to adopt it. Record user-provided decisions directly; do not create unnecessary repeat-approval gates. When authority or evidence for a replacement is absent, preserve the existing contract, record the proposal and affected work in the task or decision record, and make the consequence explicit.
